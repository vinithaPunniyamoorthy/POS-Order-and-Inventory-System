import request from 'supertest';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import app from '../src/app';
import { prisma } from '../src/config/prisma';
import { env } from '../src/config/env';
import { resetDatabase } from './resetDatabase';

async function createUserAndToken(email: string) {
  const user = await prisma.user.create({ data: { name: 'Concurrency User', email, passwordHash: await bcrypt.hash('password123', 10) } });
  return jwt.sign({ userId: user.id, email: user.email, role: user.role }, env.jwtSecret);
}

async function createCart(token: string, productId: string, quantity: number) {
  const cart = await request(app).post('/api/carts').set('Authorization', `Bearer ${token}`).send({});
  await request(app).post(`/api/carts/${cart.body.data.id}/items`).set('Authorization', `Bearer ${token}`).send({ productId, quantity });
  return cart.body.data.id as string;
}

describe('real concurrent checkout protection', () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  afterAll(async () => prisma.$disconnect());

  it('allows at most five simultaneous quantity-two reservations from stock ten', async () => {
    const token = await createUserAndToken(`concurrency-${Date.now()}@test.com`);
    const product = await prisma.product.create({ data: { name: 'Concurrency Product', sku: `CON-${Date.now()}`, price: 10, stockQuantity: 10 } });
    const cartIds = await Promise.all(Array.from({ length: 10 }, () => createCart(token, product.id, 2)));
    const responses = await Promise.all(cartIds.map((id) => request(app).post(`/api/carts/${id}/checkout`).set('Authorization', `Bearer ${token}`).send({})));
    const successful = responses.filter((response) => response.status === 201);
    const failed = responses.filter((response) => response.status === 409);
    const finalProduct = await prisma.product.findUniqueOrThrow({ where: { id: product.id } });
    expect(successful).toHaveLength(5);
    expect(failed).toHaveLength(5);
    expect(finalProduct.stockQuantity).toBe(10);
    expect(finalProduct.reservedQuantity).toBe(10);
    expect(finalProduct.stockQuantity - finalProduct.reservedQuantity).toBe(0);
  });

  it('allows exactly one simultaneous quantity-three reservation from stock five', async () => {
    const token = await createUserAndToken(`pair-${Date.now()}@test.com`);
    const product = await prisma.product.create({ data: { name: 'Pair Product', sku: `PAIR-${Date.now()}`, price: 10, stockQuantity: 5 } });
    const cartIds = await Promise.all([createCart(token, product.id, 3), createCart(token, product.id, 3)]);
    const responses = await Promise.all(cartIds.map((id) => request(app).post(`/api/carts/${id}/checkout`).set('Authorization', `Bearer ${token}`).send({})));
    expect(responses.filter((response) => response.status === 201)).toHaveLength(1);
    expect(responses.filter((response) => response.status === 409)).toHaveLength(1);
  });
});
