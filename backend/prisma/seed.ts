import { PrismaClient, UserRole, OrderStatus, ReservationStatus, PaymentStatus, StockMovementType } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const adminPassword = await bcrypt.hash('password123', 10);
  const cashierPassword = await bcrypt.hash('password123', 10);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      name: 'Admin User',
      email: 'admin@example.com',
      passwordHash: adminPassword,
      role: UserRole.ADMIN,
    },
  });

  const cashier = await prisma.user.upsert({
    where: { email: 'cashier@example.com' },
    update: {},
    create: {
      name: 'Cashier User',
      email: 'cashier@example.com',
      passwordHash: cashierPassword,
      role: UserRole.CASHIER,
    },
  });

  const products = [
    { name: 'Laptop', sku: 'LAPTOP-001', description: 'Business laptop', price: 1200, stockQuantity: 12 },
    { name: 'Wireless Mouse', sku: 'MOUSE-001', description: 'Ergonomic mouse', price: 35, stockQuantity: 45 },
    { name: 'Keyboard', sku: 'KEYBOARD-001', description: 'Mechanical keyboard', price: 80, stockQuantity: 30 },
    { name: 'Monitor', sku: 'MONITOR-001', description: '27 inch display', price: 250, stockQuantity: 18 },
    { name: 'USB Cable', sku: 'USB-CABLE-001', description: 'USB-C charging cable', price: 12, stockQuantity: 60 },
    { name: 'Headphones', sku: 'HEADPHONES-001', description: 'Noise canceling', price: 150, stockQuantity: 22 },
    { name: 'Webcam', sku: 'WEBCAM-001', description: '1080p webcam', price: 90, stockQuantity: 15 },
    { name: 'Office Chair', sku: 'CHAIR-001', description: 'Ergonomic chair', price: 220, stockQuantity: 10 },
  ];

  for (const product of products) {
    await prisma.product.upsert({
      where: { sku: product.sku },
      update: {},
      create: {
        name: product.name,
        sku: product.sku,
        description: product.description,
        price: product.price,
        stockQuantity: product.stockQuantity,
        reservedQuantity: 0,
      },
    });
  }

  console.log('Seeded admin:', admin.email);
  console.log('Seeded cashier:', cashier.email);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
