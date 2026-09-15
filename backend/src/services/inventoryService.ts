import { Prisma, PrismaClient } from '@prisma/client';
import { ApiError } from '../utils/errors';
import { logger } from '../utils/logger';

export class InventoryService {
  constructor(private readonly prisma: PrismaClient) {}

  async reserveStock(productId: string, quantity: number, tx?: Prisma.TransactionClient) {
    const client = tx ?? this.prisma;

    const product = await client.product.findUnique({ where: { id: productId } });
    if (!product) {
      throw new ApiError(404, 'Product not found', 'PRODUCT_NOT_FOUND');
    }

    if (!product.isActive) {
      throw new ApiError(409, 'Product is inactive', 'PRODUCT_INACTIVE');
    }

    const available = product.stockQuantity - product.reservedQuantity;
    if (available < quantity) {
      logger.warn(`Insufficient stock for product ${productId}: requested ${quantity}, available ${available}`);
      throw new ApiError(409, 'Insufficient stock', 'INSUFFICIENT_STOCK');
    }

    const updated = await client.$executeRawUnsafe(
      `UPDATE "Product"
       SET "reservedQuantity" = "reservedQuantity" + $1
       WHERE id = $2
         AND ("stockQuantity" - "reservedQuantity") >= $1`,
      quantity,
      productId,
    );

    if (updated === 0) {
      throw new ApiError(409, 'Insufficient stock', 'INSUFFICIENT_STOCK');
    }

    const freshProduct = await client.product.findUnique({ where: { id: productId } });
    if (!freshProduct) {
      throw new ApiError(404, 'Product not found', 'PRODUCT_NOT_FOUND');
    }

    return freshProduct;
  }

  async releaseReservation(productId: string, quantity: number, tx?: Prisma.TransactionClient) {
    const client = tx ?? this.prisma;
    const updated = await client.$executeRawUnsafe(
      `UPDATE "Product"
       SET "reservedQuantity" = "reservedQuantity" - $1
       WHERE id = $2 AND "reservedQuantity" >= $1`,
      quantity,
      productId,
    );
    if (updated === 0) {
      throw new ApiError(409, 'Reservation release exceeds reserved stock', 'INVALID_RESERVATION_RELEASE');
    }
    return client.product.findUniqueOrThrow({ where: { id: productId } });
  }

  async confirmReservation(productId: string, quantity: number, tx?: Prisma.TransactionClient) {
    const client = tx ?? this.prisma;
    const updated = await client.$executeRawUnsafe(
      `UPDATE "Product"
       SET "stockQuantity" = "stockQuantity" - $1,
           "reservedQuantity" = "reservedQuantity" - $1
       WHERE id = $2 AND "reservedQuantity" >= $1 AND "stockQuantity" >= $1`,
      quantity,
      productId,
    );
    if (updated === 0) {
      throw new ApiError(409, 'Cannot confirm reservation beyond reserved quantity', 'INVALID_RESERVATION_CONFIRMATION');
    }
    return client.product.findUniqueOrThrow({ where: { id: productId } });
  }

  async createStockMovement(productId: string, type: 'SALE' | 'RESERVATION' | 'RELEASE' | 'RESTOCK', quantity: number, reference: string, tx?: Prisma.TransactionClient) {
    const client = tx ?? this.prisma;
    return client.stockMovement.create({
      data: {
        productId,
        type,
        quantity,
        reference,
      },
    });
  }
}
