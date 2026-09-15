import { Prisma } from '@prisma/client';
import { Router } from 'express';
import { prisma } from '../config/prisma';
import { authenticate, authorize, AuthenticatedRequest } from '../middleware/auth';
import { ApiError } from '../utils/errors';
import { productSchema, restockSchema } from '../validators/product';

const router = Router();

router.get('/', authenticate, async (req, res, next) => {
  try {
    const page = Number(req.query.page ?? 1);
    const limit = Number(req.query.limit ?? 20);
    const search = String(req.query.search ?? '');
    const skip = (page - 1) * limit;

    const where: Prisma.ProductWhereInput = search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { sku: { contains: search, mode: 'insensitive' } },
          ],
        }
      : {};

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.product.count({ where }),
    ]);

    res.json({
      success: true,
      data: {
        items: products.map((product) => ({
          ...product,
          availableQuantity: product.stockQuantity - product.reservedQuantity,
        })),
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      message: 'Products retrieved successfully',
    });
  } catch (error) {
    next(error);
  }
});

router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const product = await prisma.product.findUnique({ where: { id: req.params.id } });
    if (!product) {
      throw new ApiError(404, 'Product not found', 'PRODUCT_NOT_FOUND');
    }
    res.json({
      success: true,
      data: {
        ...product,
        availableQuantity: product.stockQuantity - product.reservedQuantity,
      },
      message: 'Product retrieved successfully',
    });
  } catch (error) {
    next(error);
  }
});

router.post('/', authenticate, authorize('ADMIN'), async (req, res, next) => {
  try {
    const parsed = productSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(422).json({
        success: false,
        message: 'Validation failed',
        errors: parsed.error.issues.map((issue) => issue.message),
      });
    }

    const product = await prisma.product.create({ data: parsed.data });
    res.status(201).json({ success: true, data: product, message: 'Product created successfully' });
  } catch (error) {
    next(error);
  }
});

router.put('/:id', authenticate, authorize('ADMIN'), async (req, res, next) => {
  try {
    const parsed = productSchema.partial().safeParse(req.body);
    if (!parsed.success) {
      return res.status(422).json({
        success: false,
        message: 'Validation failed',
        errors: parsed.error.issues.map((issue) => issue.message),
      });
    }

    const product = await prisma.product.update({
      where: { id: req.params.id },
      data: parsed.data,
    });

    res.json({ success: true, data: product, message: 'Product updated successfully' });
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', authenticate, authorize('ADMIN'), async (req, res, next) => {
  try {
    await prisma.product.delete({ where: { id: req.params.id } });
    res.json({ success: true, message: 'Product deleted successfully' });
  } catch (error) {
    next(error);
  }
});

router.post('/:id/restock', authenticate, authorize('ADMIN'), async (req, res, next) => {
  try {
    const parsed = restockSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(422).json({
        success: false,
        message: 'Validation failed',
        errors: parsed.error.issues.map((issue) => issue.message),
      });
    }

    const result = await prisma.$transaction(async (tx) => {
      const product = await tx.product.update({
        where: { id: req.params.id },
        data: { stockQuantity: { increment: parsed.data.quantity } },
      });
      await tx.stockMovement.create({
        data: { productId: req.params.id, type: 'RESTOCK', quantity: parsed.data.quantity, reference: `restock:${req.params.id}` },
      });
      return product;
    });

    res.json({ success: true, data: result, message: 'Product restocked successfully' });
  } catch (error) {
    next(error);
  }
});

export default router;
