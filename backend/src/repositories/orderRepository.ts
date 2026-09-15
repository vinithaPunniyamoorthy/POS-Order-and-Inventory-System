import { Prisma, PrismaClient } from '@prisma/client';

export class OrderRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(data: Prisma.OrderCreateInput, tx?: Prisma.TransactionClient) {
    const client = tx ?? this.prisma;
    return client.order.create({ data });
  }

  async findMany(params: Prisma.OrderFindManyArgs) {
    return this.prisma.order.findMany(params);
  }

  async findById(id: string, params?: Prisma.OrderFindUniqueArgs) {
    return this.prisma.order.findUnique({
      where: { id },
      ...params,
    });
  }

  async update(id: string, data: Prisma.OrderUpdateInput, tx?: Prisma.TransactionClient) {
    const client = tx ?? this.prisma;
    return client.order.update({ where: { id }, data });
  }

  async createItem(data: Prisma.OrderItemCreateInput, tx?: Prisma.TransactionClient) {
    const client = tx ?? this.prisma;
    return client.orderItem.create({ data });
  }

  async createHistory(data: Prisma.OrderStatusHistoryCreateInput, tx?: Prisma.TransactionClient) {
    const client = tx ?? this.prisma;
    return client.orderStatusHistory.create({ data });
  }

  async createReservation(data: Prisma.StockReservationCreateInput, tx?: Prisma.TransactionClient) {
    const client = tx ?? this.prisma;
    return client.stockReservation.create({ data });
  }

  async createPayment(data: Prisma.PaymentCreateInput, tx?: Prisma.TransactionClient) {
    const client = tx ?? this.prisma;
    return client.payment.create({ data });
  }

  async updatePayment(id: string, data: Prisma.PaymentUpdateInput, tx?: Prisma.TransactionClient) {
    const client = tx ?? this.prisma;
    return client.payment.update({ where: { id }, data });
  }

  async createStockMovement(data: Prisma.StockMovementCreateInput, tx?: Prisma.TransactionClient) {
    const client = tx ?? this.prisma;
    return client.stockMovement.create({ data });
  }
}
