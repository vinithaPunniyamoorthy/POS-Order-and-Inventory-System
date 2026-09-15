import { prisma } from '../src/config/prisma';

export async function resetDatabase() {
  await prisma.stockMovement.deleteMany();
  await prisma.stockReservation.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.orderStatusHistory.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.cartItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.cart.deleteMany();
  await prisma.product.deleteMany();
  await prisma.user.deleteMany();
}
