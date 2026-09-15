import { z } from 'zod';

export const productSchema = z.object({
  name: z.string().trim().min(2, 'Product name is required').max(200),
  description: z.string().trim().max(1000).optional(),
  sku: z.string().trim().min(2, 'SKU is required').max(100),
  price: z.number().positive('Price must be greater than zero'),
  stockQuantity: z.number().int().nonnegative('Stock must be zero or more'),
  isActive: z.boolean().optional().default(true),
});

export const productUpdateSchema = productSchema.partial();

export const restockSchema = z.object({
  quantity: z.number().int().positive('Restock quantity must be positive'),
});

export const productIdSchema = z.object({
  productId: z.string().uuid('Invalid product ID'),
});
