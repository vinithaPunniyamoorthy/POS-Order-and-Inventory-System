jest.mock('../src/config/prisma', () => ({
  prisma: {
    product: {
      findMany: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(0),
    },
    user: {
      findUnique: jest.fn(),
    },
  },
}));

jest.mock('../src/middleware/auth', () => ({
  authenticate: (_req: unknown, _res: unknown, next: () => void) => next(),
  authorize: () => (_req: unknown, _res: unknown, next: () => void) => next(),
}));

import request from 'supertest';
import app from '../src/app';

describe('Application route wiring', () => {
  it('mounts the products API routes', async () => {
    const res = await request(app)
      .get('/api/products?page=1&limit=10');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data.items)).toBe(true);
  });
});
