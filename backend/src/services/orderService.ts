import { Prisma, PrismaClient, OrderStatus, PaymentStatus } from '@prisma/client';
import { ApiError } from '../utils/errors';
import { InventoryService } from './inventoryService';
import { OrderStateService } from './orderStateService';

const ORDER_INCLUDE = {
  items: { include: { product: true } },
  reservations: true,
  payments: true,
  history: { orderBy: { createdAt: 'asc' as const } },
};

export class OrderService {
  private readonly inventory: InventoryService;

  constructor(private readonly prisma: PrismaClient) {
    this.inventory = new InventoryService(prisma);
  }

  async checkoutCart(cartId: string, userId: string, idempotencyKey?: string) {
    return this.prisma.$transaction(async (tx) => {
      const lockedCart = await tx.$queryRaw<Array<{ id: string; status: string; userId: string }>>`
        SELECT id, status, "userId" FROM "Cart" WHERE id = ${cartId} FOR UPDATE
      `;
      const cart = lockedCart[0];
      if (!cart || cart.userId !== userId) throw new ApiError(404, 'Cart not found', 'CART_NOT_FOUND');
      if (cart.status === 'CONVERTED') {
        const existing = await tx.order.findUnique({ where: { cartId }, include: ORDER_INCLUDE });
        if (existing) return { order: existing, replayed: true };
      }
      if (cart.status !== 'ACTIVE') throw new ApiError(409, 'Cart is not available for checkout', 'CART_NOT_CHECKOUT_ELIGIBLE');

      const items = await tx.cartItem.findMany({ where: { cartId }, include: { product: true } });
      if (items.length === 0) throw new ApiError(400, 'Cart is empty', 'EMPTY_CART');
      const subtotal = items.reduce(
        (total, item) => total.add(item.product.price.mul(item.quantity)),
        new Prisma.Decimal(0),
      );
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
      const order = await tx.order.create({
        data: {
          orderNumber: `POS-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
          cartId,
          userId,
          status: 'PENDING',
          subtotal,
          total: subtotal,
          idempotencyKey,
        },
      });

      for (const item of items) {
        await this.inventory.reserveStock(item.productId, item.quantity, tx);
        await tx.orderItem.create({
          data: {
            orderId: order.id,
            productId: item.productId,
            quantity: item.quantity,
            unitPrice: item.product.price,
            subtotal: item.product.price.mul(item.quantity),
          },
        });
        await tx.stockReservation.create({
          data: { orderId: order.id, productId: item.productId, quantity: item.quantity, expiresAt },
        });
        await this.inventory.createStockMovement(item.productId, 'RESERVATION', item.quantity, order.id, tx);
      }

      await tx.cart.update({ where: { id: cartId }, data: { status: 'CONVERTED' } });
      await tx.order.update({ where: { id: order.id }, data: { status: 'RESERVED' } });
      await tx.orderStatusHistory.create({ data: { orderId: order.id, toStatus: 'PENDING', reason: 'Checkout started' } });
      await tx.orderStatusHistory.create({ data: { orderId: order.id, fromStatus: 'PENDING', toStatus: 'RESERVED', reason: 'Stock reserved' } });
      return { order: await tx.order.findUniqueOrThrow({ where: { id: order.id }, include: ORDER_INCLUDE }), replayed: false };
    });
  }

  async processPayment(orderId: string, userId: string, result: PaymentStatus, paymentMethod: string, idempotencyKey?: string) {
    return this.prisma.$transaction(async (tx) => {
      const locked = await tx.$queryRaw<Array<{ id: string; status: OrderStatus; userId: string; total: Prisma.Decimal }>>`
        SELECT id, status, "userId", total FROM "Order" WHERE id = ${orderId} FOR UPDATE
      `;
      const order = locked[0];
      if (!order || (order.userId !== userId)) throw new ApiError(404, 'Order not found', 'ORDER_NOT_FOUND');
      if (order.status === 'PAID') throw new ApiError(409, 'Order has already been paid', 'ORDER_ALREADY_PAID');
      if (!['RESERVED', 'PAYMENT_PENDING'].includes(order.status)) throw new ApiError(409, 'Order is not awaiting payment', 'ORDER_NOT_PAYABLE');

      const reservations = await tx.stockReservation.findMany({ where: { orderId, status: 'ACTIVE' } });
      const now = new Date();
      if (reservations.length === 0 || reservations.some((reservation) => reservation.expiresAt <= now)) {
        throw new ApiError(409, 'Reservation has expired', 'RESERVATION_EXPIRED');
      }
      const existing = await tx.payment.findUnique({ where: { orderId } });
      if (existing) throw new ApiError(409, 'Payment has already been submitted', 'DUPLICATE_PAYMENT');

      if (order.status === 'RESERVED') {
        OrderStateService.assertTransition(order.status, 'PAYMENT_PENDING');
        await tx.order.update({ where: { id: orderId }, data: { status: 'PAYMENT_PENDING' } });
        await tx.orderStatusHistory.create({ data: { orderId, fromStatus: 'RESERVED', toStatus: 'PAYMENT_PENDING', reason: 'Payment submitted' } });
      }

      const payment = await tx.payment.create({
        data: {
          orderId,
          amount: order.total,
          status: result,
          paymentMethod,
          transactionId: `MOCK-TXN-${cryptoRandomId()}`,
          idempotencyKey,
        },
      });
      const target: OrderStatus = result === 'SUCCESS' ? 'PAID' : result === 'TIMEOUT' ? 'EXPIRED' : 'FAILED';
      for (const reservation of reservations) {
        if (target === 'PAID') {
          await this.inventory.confirmReservation(reservation.productId, reservation.quantity, tx);
          await tx.stockReservation.update({ where: { id: reservation.id }, data: { status: 'CONFIRMED' } });
          await this.inventory.createStockMovement(reservation.productId, 'SALE', reservation.quantity, orderId, tx);
        } else {
          await this.inventory.releaseReservation(reservation.productId, reservation.quantity, tx);
          await tx.stockReservation.update({ where: { id: reservation.id }, data: { status: target === 'EXPIRED' ? 'EXPIRED' : 'RELEASED', releasedAt: now } });
          await this.inventory.createStockMovement(reservation.productId, 'RELEASE', reservation.quantity, orderId, tx);
        }
      }
      await tx.order.update({ where: { id: orderId }, data: { status: target } });
      await tx.orderStatusHistory.create({ data: { orderId, fromStatus: 'PAYMENT_PENDING', toStatus: target, reason: `Payment ${result.toLowerCase()}` } });
      return { payment, order: await tx.order.findUniqueOrThrow({ where: { id: orderId }, include: ORDER_INCLUDE }) };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }

  async cancel(orderId: string, userId: string) {
    return this.prisma.$transaction(async (tx) => {
      const locked = await tx.$queryRaw<Array<{ id: string; status: OrderStatus; userId: string }>>`
        SELECT id, status, "userId" FROM "Order" WHERE id = ${orderId} FOR UPDATE
      `;
      const order = locked[0];
      if (!order || order.userId !== userId) throw new ApiError(404, 'Order not found', 'ORDER_NOT_FOUND');
      OrderStateService.assertTransition(order.status, 'CANCELLED');
      const reservations = await tx.stockReservation.findMany({ where: { orderId, status: 'ACTIVE' } });
      const now = new Date();
      for (const reservation of reservations) {
        await this.inventory.releaseReservation(reservation.productId, reservation.quantity, tx);
        await tx.stockReservation.update({ where: { id: reservation.id }, data: { status: 'RELEASED', releasedAt: now } });
        await this.inventory.createStockMovement(reservation.productId, 'RELEASE', reservation.quantity, orderId, tx);
      }
      await tx.order.update({ where: { id: orderId }, data: { status: 'CANCELLED' } });
      await tx.orderStatusHistory.create({ data: { orderId, fromStatus: order.status, toStatus: 'CANCELLED', reason: 'Cancelled by user' } });
      return tx.order.findUniqueOrThrow({ where: { id: orderId }, include: ORDER_INCLUDE });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }

  async transition(orderId: string, userId: string, target: OrderStatus) {
    return this.prisma.$transaction(async (tx) => {
      const locked = await tx.$queryRaw<Array<{ id: string; status: OrderStatus; userId: string }>>`
        SELECT id, status, "userId" FROM "Order" WHERE id = ${orderId} FOR UPDATE
      `;
      const order = locked[0];
      if (!order || order.userId !== userId) throw new ApiError(404, 'Order not found', 'ORDER_NOT_FOUND');
      OrderStateService.assertTransition(order.status, target);
      await tx.order.update({ where: { id: orderId }, data: { status: target } });
      await tx.orderStatusHistory.create({ data: { orderId, fromStatus: order.status, toStatus: target } });
      return tx.order.findUniqueOrThrow({ where: { id: orderId }, include: ORDER_INCLUDE });
    });
  }
}

function cryptoRandomId() {
  return Math.random().toString(36).slice(2, 12).toUpperCase();
}

export { ORDER_INCLUDE };
