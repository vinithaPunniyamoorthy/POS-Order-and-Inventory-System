import { NextFunction, Request, Response } from 'express';
import { env } from '../config/env';

const buckets = new Map<string, { startedAt: number; count: number }>();

export function rateLimit(req: Request, res: Response, next: NextFunction) {
  const key = req.ip || 'unknown';
  const now = Date.now();
  const current = buckets.get(key);
  if (!current || now - current.startedAt >= env.rateLimitWindowMs) {
    buckets.set(key, { startedAt: now, count: 1 });
    return next();
  }
  current.count += 1;
  if (current.count > env.rateLimitMax) {
    return res.status(429).json({ success: false, message: 'Too many requests', errorCode: 'RATE_LIMITED' });
  }
  return next();
}
