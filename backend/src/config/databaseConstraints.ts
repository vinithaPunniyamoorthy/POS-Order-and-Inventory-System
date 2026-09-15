import { PrismaClient } from '@prisma/client';

export async function ensureDatabaseConstraints(prisma: PrismaClient) {
  const statements = [
    'ALTER TABLE "Product" ADD CONSTRAINT "Product_stock_nonnegative" CHECK ("stockQuantity" >= 0)',
    'ALTER TABLE "Product" ADD CONSTRAINT "Product_reserved_nonnegative" CHECK ("reservedQuantity" >= 0)',
    'ALTER TABLE "Product" ADD CONSTRAINT "Product_reserved_within_stock" CHECK ("reservedQuantity" <= "stockQuantity")',
    'ALTER TABLE "Product" ADD CONSTRAINT "Product_price_nonnegative" CHECK ("price" >= 0)',
    'ALTER TABLE "CartItem" ADD CONSTRAINT "CartItem_quantity_positive" CHECK ("quantity" > 0)',
    'ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_quantity_positive" CHECK ("quantity" > 0)',
    'ALTER TABLE "StockReservation" ADD CONSTRAINT "StockReservation_quantity_positive" CHECK ("quantity" > 0)',
    'ALTER TABLE "Payment" ADD CONSTRAINT "Payment_amount_nonnegative" CHECK ("amount" >= 0)',
  ];

  for (const statement of statements) {
    try {
      await prisma.$executeRawUnsafe(statement);
    } catch (error) {
      if (!(error instanceof Error) || !error.message.includes('already exists')) throw error;
    }
  }
}
