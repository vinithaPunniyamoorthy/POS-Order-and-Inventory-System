import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { ApiError } from '../utils/errors';
import { prisma } from '../config/prisma';

export interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
    email: string;
    role: 'ADMIN' | 'CASHIER';
  };
}

export const authenticate = async (
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction,
) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new ApiError(401, 'Authentication token is missing', 'UNAUTHORIZED');
    }

    const token = authHeader.split(' ')[1];
    const payload = jwt.verify(token, env.jwtSecret) as { userId: string; email: string; role: 'ADMIN' | 'CASHIER' };

    const user = await prisma.user.findUnique({ where: { id: payload.userId } });
    if (!user) {
      throw new ApiError(401, 'User no longer exists', 'UNAUTHORIZED');
    }

    req.user = {
      userId: user.id,
      email: user.email,
      role: user.role as 'ADMIN' | 'CASHIER',
    };
    next();
  } catch (error) {
    next(error);
  }
};

export const authorize = (...roles: Array<'ADMIN' | 'CASHIER'>) => {
  return (req: AuthenticatedRequest, _res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new ApiError(401, 'Authentication required', 'UNAUTHORIZED'));
    }

    if (!roles.includes(req.user.role)) {
      return next(new ApiError(403, 'Access denied', 'FORBIDDEN'));
    }

    return next();
  };
};
