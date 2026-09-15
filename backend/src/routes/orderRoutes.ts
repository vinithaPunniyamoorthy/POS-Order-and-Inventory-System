import { Router } from 'express';
import { prisma } from '../config/prisma';
import { authenticate, AuthenticatedRequest } from '../middleware/auth';
import { ApiError } from '../utils/errors';
import { paymentSchema } from '../validators/order';
import { OrderService, ORDER_INCLUDE } from '../services/orderService';

const router = Router();
const orders = new OrderService(prisma);

router.get('/', authenticate, async (req: AuthenticatedRequest, res, next) => {
  try {
    const items = await prisma.order.findMany({ where: { userId: req.user!.userId }, include: ORDER_INCLUDE, orderBy: { createdAt: 'desc' } });
    return res.json({ success: true, data: items, message: 'Orders retrieved successfully' });
  } catch (error) { return next(error); }
});

router.get('/:id', authenticate, async (req: AuthenticatedRequest, res, next) => {
  try {
    const order = await prisma.order.findUnique({ where: { id: req.params.id }, include: ORDER_INCLUDE });
    if (!order || (order.userId !== req.user!.userId && req.user!.role !== 'ADMIN')) throw new ApiError(404, 'Order not found', 'ORDER_NOT_FOUND');
    return res.json({ success: true, data: order, message: 'Order retrieved successfully' });
  } catch (error) { return next(error); }
});

async function pay(req: AuthenticatedRequest, res: any, next: any) {
  try {
    const parsed = paymentSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ success: false, message: 'Validation failed', errors: parsed.error.issues });
    const result = await orders.processPayment(req.params.id, req.user!.userId, parsed.data.result, parsed.data.paymentMethod, parsed.data.idempotencyKey);
    return res.json({ success: true, data: result, message: 'Payment processed successfully' });
  } catch (error) { return next(error); }
}

router.post('/:id/payment', authenticate, pay);
router.post('/:id/pay', authenticate, pay);

router.post('/:id/cancel', authenticate, async (req: AuthenticatedRequest, res, next) => {
  try { return res.json({ success: true, data: await orders.cancel(req.params.id, req.user!.userId), message: 'Order cancelled successfully' }); }
  catch (error) { return next(error); }
});

router.get('/:id/history', authenticate, async (req: AuthenticatedRequest, res, next) => {
  try {
    const order = await prisma.order.findUnique({ where: { id: req.params.id }, select: { userId: true } });
    if (!order || (order.userId !== req.user!.userId && req.user!.role !== 'ADMIN')) throw new ApiError(404, 'Order not found', 'ORDER_NOT_FOUND');
    const history = await prisma.orderStatusHistory.findMany({ where: { orderId: req.params.id }, orderBy: { createdAt: 'asc' } });
    return res.json({ success: true, data: history, message: 'Order history retrieved successfully' });
  } catch (error) { return next(error); }
});

router.post('/:id/process', authenticate, async (req: AuthenticatedRequest, res, next) => {
  try { return res.json({ success: true, data: await orders.transition(req.params.id, req.user!.userId, 'PROCESSING'), message: 'Order moved to processing' }); }
  catch (error) { return next(error); }
});

router.post('/:id/complete', authenticate, async (req: AuthenticatedRequest, res, next) => {
  try { return res.json({ success: true, data: await orders.transition(req.params.id, req.user!.userId, 'COMPLETED'), message: 'Order completed' }); }
  catch (error) { return next(error); }
});

export default router;
