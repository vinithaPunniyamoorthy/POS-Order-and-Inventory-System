import { PrismaClient } from '@prisma/client';
import { InventoryService } from './inventoryService';

export class ReservationExpiryService {
  constructor(private readonly prisma: PrismaClient) {}

  async expireReservations(now = new Date()) {
    const inventory = new InventoryService(this.prisma);
    const reservations = await this.prisma.stockReservation.findMany({
      where: { status: 'ACTIVE', expiresAt: { lte: now } },
    });
    let expired = 0;

    for (const reservation of reservations) {
      await this.prisma.$transaction(async (tx) => {
        await tx.$queryRaw`SELECT id FROM "Order" WHERE id = ${reservation.orderId} FOR UPDATE`;
        const current = await tx.stockReservation.findUnique({ where: { id: reservation.id } });
        if (!current || current.status !== 'ACTIVE' || current.expiresAt > now) return;

        await inventory.releaseReservation(current.productId, current.quantity, tx);
        await tx.stockReservation.update({
          where: { id: current.id },
          data: { status: 'EXPIRED', releasedAt: now },
        });
        await tx.stockMovement.create({
          data: { productId: current.productId, type: 'RELEASE', quantity: current.quantity, reference: current.orderId },
        });

        const remaining = await tx.stockReservation.count({
          where: { orderId: current.orderId, status: 'ACTIVE' },
        });
        if (remaining === 0) {
          const order = await tx.order.findUnique({ where: { id: current.orderId } });
          if (order && (order.status === 'RESERVED' || order.status === 'PAYMENT_PENDING')) {
            await tx.order.update({ where: { id: order.id }, data: { status: 'EXPIRED' } });
            await tx.orderStatusHistory.create({ data: { orderId: order.id, fromStatus: order.status, toStatus: 'EXPIRED', reason: 'Reservation expired' } });
          }
        }
        expired += 1;
      });
    }

    return expired;
  }
}