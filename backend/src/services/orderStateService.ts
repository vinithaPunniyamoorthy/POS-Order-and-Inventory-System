import { OrderStatus } from '@prisma/client';
import { ApiError } from '../utils/errors';

const validTransitions: Record<OrderStatus, OrderStatus[]> = {
  PENDING: ['RESERVED', 'CANCELLED'],
  RESERVED: ['PAYMENT_PENDING', 'CANCELLED', 'EXPIRED'],
  PAYMENT_PENDING: ['PAID', 'FAILED', 'EXPIRED', 'CANCELLED'],
  PAID: ['PROCESSING'],
  PROCESSING: ['COMPLETED'],
  COMPLETED: [],
  CANCELLED: [],
  FAILED: ['CANCELLED'],
  EXPIRED: [],
};

export class OrderStateService {
  static canTransition(from: OrderStatus, to: OrderStatus): boolean {
    return validTransitions[from]?.includes(to) ?? false;
  }

  static assertTransition(from: OrderStatus, to: OrderStatus) {
    if (!this.canTransition(from, to)) {
      throw new ApiError(409, `Invalid order transition from ${from} to ${to}`, 'INVALID_ORDER_TRANSITION');
    }
  }
}
