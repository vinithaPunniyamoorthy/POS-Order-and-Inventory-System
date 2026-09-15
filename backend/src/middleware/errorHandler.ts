import { NextFunction, Request, Response } from 'express';
import { ApiError } from '../utils/errors';
import { Prisma } from '@prisma/client';

export const notFoundHandler = (req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
    errorCode: 'NOT_FOUND',
  });
};

export const errorHandler = (error: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (error instanceof ApiError) {
    return res.status(error.statusCode).json({
      success: false,
      message: error.message,
      errorCode: error.errorCode,
    });
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2002') {
      return res.status(409).json({ success: false, message: 'Resource already exists', errorCode: 'DUPLICATE_RESOURCE' });
    }
    if (error.code === 'P2025') {
      return res.status(404).json({ success: false, message: 'Resource not found', errorCode: 'NOT_FOUND' });
    }
    if (error.code === 'P2003') {
      return res.status(409).json({ success: false, message: 'Resource is still in use', errorCode: 'RESOURCE_IN_USE' });
    }
  }

  if (error instanceof Error) {
    return res.status(500).json({
      success: false,
      message: process.env.NODE_ENV === 'production' ? 'Internal server error' : error.message,
      errorCode: 'INTERNAL_SERVER_ERROR',
    });
  }

  return res.status(500).json({
    success: false,
    message: 'Internal server error',
    errorCode: 'INTERNAL_SERVER_ERROR',
  });
};
