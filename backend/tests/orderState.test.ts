import { OrderStateService } from '../src/services/orderStateService';

describe('OrderStateService', () => {
  it.each([
    ['PENDING', 'RESERVED'],
    ['RESERVED', 'PAYMENT_PENDING'],
    ['PAYMENT_PENDING', 'PAID'],
    ['PAID', 'PROCESSING'],
    ['PROCESSING', 'COMPLETED'],
  ] as const)('allows %s -> %s', (from, to) => {
    expect(OrderStateService.canTransition(from, to)).toBe(true);
  });

  it.each([
    ['COMPLETED', 'PENDING'],
    ['PAID', 'PENDING'],
    ['CANCELLED', 'PAID'],
    ['EXPIRED', 'PAID'],
  ] as const)('rejects %s -> %s', (from, to) => {
    expect(OrderStateService.canTransition(from, to)).toBe(false);
  });
});
