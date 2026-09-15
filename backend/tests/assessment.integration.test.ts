import request from 'supertest';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import app from '../src/app';
import { prisma } from '../src/config/prisma';
import { env } from '../src/config/env';
import { resetDatabase } from './resetDatabase';
import { ReservationExpiryService } from '../src/services/reservationExpiryService';

async function userToken(role: 'ADMIN' | 'CASHIER' = 'CASHIER') {
  const user = await prisma.user.create({
    data: {
      name: 'Assessment User',
      email: `${role.toLowerCase()}-${Date.now()}-${Math.random()}@test.com`,
      passwordHash: await bcrypt.hash('password123', 10),
      role,
    },
  });
  return jwt.sign({ userId: user.id, email: user.email, role: user.role }, env.jwtSecret);
}

async function product(stockQuantity: number, name = 'Assessment Product') {
  return prisma.product.create({
    data: {
      name,
      sku: `ASSESS-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      price: 10,
      stockQuantity,
    },
  });
}

async function cartWithItem(token: string, productId: string, quantity: number) {
  const cartResponse = await request(app).post('/api/carts').set('Authorization', `Bearer ${token}`).send({});
  const cartId = cartResponse.body.data.id as string;
  await request(app).post(`/api/carts/${cartId}/items`).set('Authorization', `Bearer ${token}`).send({ productId, quantity });
  return cartId;
}

async function checkout(token: string, productId: string, quantity: number) {
  const cartId = await cartWithItem(token, productId, quantity);
  return request(app).post(`/api/carts/${cartId}/checkout`).set('Authorization', `Bearer ${token}`).send({});
}

describe('assessment integration flows', () => {
  beforeEach(async () => resetDatabase());
  afterAll(async () => prisma.$disconnect());

  it('rolls back multi-product checkout and protects duplicate checkout', async () => {
    const token = await userToken();
    const first = await product(10, 'Rollback A');
    const second = await product(1, 'Rollback B');
    const cartResponse = await request(app).post('/api/carts').set('Authorization', `Bearer ${token}`).send({});
    const cartId = cartResponse.body.data.id as string;
    await request(app).post(`/api/carts/${cartId}/items`).set('Authorization', `Bearer ${token}`).send({ productId: first.id, quantity: 2 });
    await request(app).post(`/api/carts/${cartId}/items`).set('Authorization', `Bearer ${token}`).send({ productId: second.id, quantity: 5 });
    const failed = await request(app).post(`/api/carts/${cartId}/checkout`).set('Authorization', `Bearer ${token}`).send({});
    expect(failed.status).toBe(409);
    expect((await prisma.product.findUniqueOrThrow({ where: { id: first.id } })).reservedQuantity).toBe(0);
    expect((await prisma.product.findUniqueOrThrow({ where: { id: second.id } })).reservedQuantity).toBe(0);
    expect(await prisma.order.count()).toBe(0);

    const validProduct = await product(10, 'Duplicate Checkout');
    const validCart = await cartWithItem(token, validProduct.id, 1);
    const responses = await Promise.all(Array.from({ length: 5 }, () => request(app).post(`/api/carts/${validCart}/checkout`).set('Authorization', `Bearer ${token}`).send({})));
    expect(responses.filter((response) => response.status === 201)).toHaveLength(1);
    expect(await prisma.order.count()).toBe(1);
  });

  it('handles success, failure, timeout, and expired payment atomically', async () => {
    const token = await userToken();
    const successProduct = await product(10, 'Payment Success');
    const success = await checkout(token, successProduct.id, 2);
    const successPayment = await request(app).post(`/api/orders/${success.body.data.id}/payment`).set('Authorization', `Bearer ${token}`).send({ result: 'SUCCESS' });
    expect(successPayment.status).toBe(200);
    expect(await prisma.product.findUniqueOrThrow({ where: { id: successProduct.id } })).toMatchObject({ stockQuantity: 8, reservedQuantity: 0 });
    expect(await prisma.stockMovement.count({ where: { productId: successProduct.id, type: 'SALE' } })).toBe(1);

    const failedProduct = await product(10, 'Payment Failure');
    const failedOrder = await checkout(token, failedProduct.id, 2);
    await request(app).post(`/api/orders/${failedOrder.body.data.id}/payment`).set('Authorization', `Bearer ${token}`).send({ result: 'FAILED' });
    expect(await prisma.product.findUniqueOrThrow({ where: { id: failedProduct.id } })).toMatchObject({ stockQuantity: 10, reservedQuantity: 0 });

    const timeoutProduct = await product(10, 'Payment Timeout');
    const timeoutOrder = await checkout(token, timeoutProduct.id, 2);
    await request(app).post(`/api/orders/${timeoutOrder.body.data.id}/payment`).set('Authorization', `Bearer ${token}`).send({ result: 'TIMEOUT' });
    expect((await prisma.product.findUniqueOrThrow({ where: { id: timeoutProduct.id } })).reservedQuantity).toBe(0);

    const expiredProduct = await product(10, 'Expired Payment');
    const expiredOrder = await checkout(token, expiredProduct.id, 2);
    await prisma.stockReservation.updateMany({ where: { orderId: expiredOrder.body.data.id }, data: { expiresAt: new Date(Date.now() - 1000) } });
    await new ReservationExpiryService(prisma).expireReservations();
    const rejected = await request(app).post(`/api/orders/${expiredOrder.body.data.id}/payment`).set('Authorization', `Bearer ${token}`).send({ result: 'SUCCESS' });
    expect(rejected.status).toBe(409);
  });

  it('protects concurrent payment, cancellation, expiry, and lifecycle transitions', async () => {
    const token = await userToken();
    const paymentProduct = await product(10, 'Duplicate Payment');
    const paymentOrder = await checkout(token, paymentProduct.id, 2);
    const paymentResponses = await Promise.all(Array.from({ length: 5 }, () => request(app).post(`/api/orders/${paymentOrder.body.data.id}/payment`).set('Authorization', `Bearer ${token}`).send({ result: 'SUCCESS' })));
    expect(paymentResponses.filter((response) => response.status === 200)).toHaveLength(1);
    expect(await prisma.payment.count({ where: { orderId: paymentOrder.body.data.id, status: 'SUCCESS' } })).toBe(1);
    expect(await prisma.stockMovement.count({ where: { reference: paymentOrder.body.data.id, type: 'SALE' } })).toBe(1);
    await request(app).post(`/api/orders/${paymentOrder.body.data.id}/process`).set('Authorization', `Bearer ${token}`).send({});
    await request(app).post(`/api/orders/${paymentOrder.body.data.id}/complete`).set('Authorization', `Bearer ${token}`).send({});
    expect((await prisma.order.findUniqueOrThrow({ where: { id: paymentOrder.body.data.id } })).status).toBe('COMPLETED');

    const cancelProduct = await product(10, 'Cancellation');
    const cancelOrder = await checkout(token, cancelProduct.id, 2);
    const cancelled = await request(app).post(`/api/orders/${cancelOrder.body.data.id}/cancel`).set('Authorization', `Bearer ${token}`).send({});
    expect(cancelled.status).toBe(200);
    expect((await prisma.product.findUniqueOrThrow({ where: { id: cancelProduct.id } })).reservedQuantity).toBe(0);

    const expiryProduct = await product(10, 'Expiry');
    const expiryOrder = await checkout(token, expiryProduct.id, 2);
    await prisma.stockReservation.updateMany({ where: { orderId: expiryOrder.body.data.id }, data: { expiresAt: new Date(Date.now() - 1000) } });
    const expiryService = new ReservationExpiryService(prisma);
    expect(await expiryService.expireReservations()).toBe(1);
    expect(await expiryService.expireReservations()).toBe(0);
    expect((await prisma.order.findUniqueOrThrow({ where: { id: expiryOrder.body.data.id } })).status).toBe('EXPIRED');
    expect((await prisma.product.findUniqueOrThrow({ where: { id: expiryProduct.id } })).reservedQuantity).toBe(0);
  });

  it('allows exactly five concurrent reservations from ten units and one from two quantity-three requests', async () => {
    const token = await userToken();
    const ten = await product(10, 'Reservation Concurrency');
    const tenResponses = await Promise.all(Array.from({ length: 10 }, () => checkout(token, ten.id, 2)));
    expect(tenResponses.filter((response) => response.status === 201)).toHaveLength(5);
    expect((await prisma.product.findUniqueOrThrow({ where: { id: ten.id } })).reservedQuantity).toBe(10);

    const five = await product(5, 'Reservation Pair');
    const pair = await Promise.all([checkout(token, five.id, 3), checkout(token, five.id, 3)]);
    expect(pair.filter((response) => response.status === 201)).toHaveLength(1);
    expect((await prisma.product.findUniqueOrThrow({ where: { id: five.id } })).reservedQuantity).toBe(3);
  });
});