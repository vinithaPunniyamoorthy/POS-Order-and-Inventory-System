import { Prisma, PrismaClient } from '@prisma/client';
import { ApiError } from '../utils/errors';
import { logger } from '../utils/logger';

export type PaymentOutcome = 'SUCCESS' | 'FAILED' | 'TIMEOUT';

export class PaymentService {
  constructor(private readonly prisma: PrismaClient) {}

  public static generateTransactionId() {
    return `MOCK-TXN-${Math.random().toString(36).slice(2, 10).toUpperCase()}`;
  }

  async processPayment({
    orderId,
    amount,
    paymentMethod,
    result,
    idempotencyKey,
    tx,
  }: {
    orderId: string;
    amount: number;
    paymentMethod: string;
    result: PaymentOutcome;
    idempotencyKey?: string;
    tx?: Prisma.TransactionClient;
  }) {
    const client = tx ?? this.prisma;

    const order = await client.order.findUnique({ where: { id: orderId } });
    if (!order) {
      throw new ApiError(404, 'Order not found', 'ORDER_NOT_FOUND');
    }

    if (order.status === 'PAID') {
      throw new ApiError(409, 'Order has already been paid', 'ORDER_ALREADY_PAID');
    }

    if (idempotencyKey) {
      const existingPayment = await client.payment.findFirst({
        where: { orderId, idempotencyKey },
      });

      if (existingPayment) {
        throw new ApiError(409, 'Duplicate payment request', 'DUPLICATE_PAYMENT');
      }
    }

    const payment = await client.payment.create({
      data: {
        orderId,
        amount: new Prisma.Decimal(amount),
        status: result,
        paymentMethod,
        transactionId: PaymentService.generateTransactionId(),
        idempotencyKey,
      },
    });

    logger.info(`Mock payment processed for order ${orderId}: ${result}`);
    return payment;
  }
}
