import { z } from 'zod';

export const orderItemSchema = z.object({
  productId: z.string().uuid('Product ID must be a valid UUID'),
  quantity: z.number().int().positive('Quantity must be a positive integer'),
});

export const createOrderSchema = z.object({
  items: z.array(orderItemSchema).min(1, 'At least one item is required'),
  idempotencyKey: z.string().trim().min(1, 'Idempotency key is required').optional(),
});

export const cartItemSchema = z.object({
  quantity: z.number().int().positive('Quantity must be a positive integer'),
});

export const addCartItemSchema = cartItemSchema.extend({
  productId: z.string().uuid('Product ID must be a valid UUID'),
});

export const paymentSchema = z.object({
  paymentMethod: z.enum(['CARD', 'CASH', 'BANK_TRANSFER']).optional().default('CARD'),
  result: z.enum(['SUCCESS', 'FAILED', 'TIMEOUT']).optional().default('SUCCESS'),
  idempotencyKey: z.string().trim().min(1, 'Idempotency key is required').optional(),
});

export const statusTransitionSchema = z.object({
  status: z.enum(['PENDING','RESERVED','PAYMENT_PENDING','PAID','PROCESSING','COMPLETED','CANCELLED','FAILED','EXPIRED']),
});
