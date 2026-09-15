import { Prisma, PrismaClient } from '@prisma/client';

export class ProductRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findMany(params: Prisma.ProductFindManyArgs) {
    return this.prisma.product.findMany(params);
  }

  async count(params: Prisma.ProductCountArgs) {
    return this.prisma.product.count(params);
  }

  async findById(id: string) {
    return this.prisma.product.findUnique({ where: { id } });
  }

  async findBySku(sku: string) {
    return this.prisma.product.findUnique({ where: { sku } });
  }

  async create(data: Prisma.ProductCreateInput) {
    return this.prisma.product.create({ data });
  }

  async update(id: string, data: Prisma.ProductUpdateInput) {
    return this.prisma.product.update({ where: { id }, data });
  }

  async remove(id: string) {
    return this.prisma.product.delete({ where: { id } });
  }

  async restock(id: string, quantity: number, tx?: Prisma.TransactionClient) {
    const client = tx ?? this.prisma;
    return client.product.update({
      where: { id },
      data: {
        stockQuantity: { increment: quantity },
      },
    });
  }
}
