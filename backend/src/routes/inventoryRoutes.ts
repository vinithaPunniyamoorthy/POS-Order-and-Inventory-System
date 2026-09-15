import { Router } from 'express';
import { prisma } from '../config/prisma';
import { authenticate } from '../middleware/auth';

const router = Router();
router.get('/', authenticate, async (_req, res, next) => {
  try {
    const products = await prisma.product.findMany({ orderBy: { name: 'asc' } });
    return res.json({
      success: true,
      data: products.map((product) => ({
        product,
        stockQuantity: product.stockQuantity,
        reservedQuantity: product.reservedQuantity,
        availableQuantity: product.stockQuantity - product.reservedQuantity,
        lowStock: product.stockQuantity - product.reservedQuantity <= 5,
      })),
      message: 'Inventory retrieved successfully',
    });
  } catch (error) { return next(error); }
});
export default router;
