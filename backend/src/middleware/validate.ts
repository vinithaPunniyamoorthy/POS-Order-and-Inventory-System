import { NextFunction, Request, Response } from 'express';
import { z } from 'zod';

export const validate = (schema: z.ZodSchema) => {
  return (req: Request, _res: Response, next: NextFunction) => {
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return next({
        status: 422,
        message: 'Validation failed',
        errors: parsed.error.issues.map((issue) => issue.message),
      });
    }

    req.body = parsed.data;
    return next();
  };
};
