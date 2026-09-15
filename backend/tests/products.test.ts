import request from 'supertest';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import app from '../src/app';
import { prisma } from '../src/config/prisma';
import { env } from '../src/config/env';
import { resetDatabase } from './resetDatabase';

let adminToken: string;

beforeAll(async () => {
  await resetDatabase();

  const admin = await prisma.user.create({
    data: {
      name: 'Admin User',
      email: 'prod-admin@test.com',
      passwordHash: await bcrypt.hash('password123', 10),
      role: 'ADMIN',
    },
  });
  adminToken = jwt.sign({ userId: admin.id, email: admin.email, role: admin.role }, env.jwtSecret);
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe('Products API', () => {
  it('creates a product as admin', async () => {
    const res = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Test Product',
        sku: 'TEST-001',
        description: 'A test product',
        price: 99.99,
        stockQuantity: 10,
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
  });

  it('lists products', async () => {
    const res = await request(app)
      .get('/api/products?page=1&limit=10')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data.items)).toBe(true);
  });

  it('restocks a product', async () => {
    const product = await prisma.product.findFirst({ where: { sku: 'TEST-001' } });

    const res = await request(app)
      .post(`/api/products/${product!.id}/restock`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ quantity: 20 });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});
