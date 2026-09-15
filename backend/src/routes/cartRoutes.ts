import { Router } from 'express';
import { prisma } from '../config/prisma';
import { authenticate, AuthenticatedRequest } from '../middleware/auth';
import { ApiError } from '../utils/errors';
import { addCartItemSchema, cartItemSchema } from '../validators/order';
import { OrderService } from '../services/orderService';

const router = Router();
const orders = new OrderService(prisma);
const cartInclude = { items: { include: { product: true } }, order: true };

async function ownedCart(id: string, userId: string) {
  const cart = await prisma.cart.findUnique({ where: { id }, include: cartInclude });
  if (!cart || cart.userId !== userId) throw new ApiError(404, 'Cart not found', 'CART_NOT_FOUND');
  return cart;
}

router.post('/', authenticate, async (req: AuthenticatedRequest, res, next) => {
  try {
    const cart = await prisma.cart.create({ data: { userId: req.user!.userId }, include: cartInclude });
    return res.status(201).json({ success: true, data: cart, message: 'Cart created successfully' });
  } catch (error) { return next(error); }
});

router.get('/:id', authenticate, async (req: AuthenticatedRequest, res, next) => {
  try { return res.json({ success: true, data: await ownedCart(req.params.id, req.user!.userId), message: 'Cart retrieved successfully' }); }
  catch (error) { return next(error); }
});

async function saveItem(req: AuthenticatedRequest, res: any, next: any, replace: boolean) {
  try {
    const cart = await ownedCart(req.params.id, req.user!.userId);
    if (cart.status !== 'ACTIVE') throw new ApiError(409, 'Cart is not active', 'CART_NOT_ACTIVE');
    const parsed = (replace ? cartItemSchema : addCartItemSchema).safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ success: false, message: 'Validation failed', errors: parsed.error.issues });
    const productId = replace ? req.params.productId : String(req.body.productId ?? '');
    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product || !product.isActive) throw new ApiError(404, 'Product not found', 'PRODUCT_NOT_FOUND');
    const quantity = replace ? parsed.data.quantity : (cart.items.find((item) => item.productId === product.id)?.quantity ?? 0) + parsed.data.quantity;
    const item = await prisma.cartItem.upsert({ where: { cartId_productId: { cartId: cart.id, productId: product.id } }, update: { quantity }, create: { cartId: cart.id, productId: product.id, quantity } });
    return res.status(replace ? 200 : 201).json({ success: true, data: item, message: 'Cart item saved successfully' });
  } catch (error) { return next(error); }
}

router.post('/:id/items', authenticate, (req, res, next) => saveItem(req as AuthenticatedRequest, res, next, false));
router.put('/:id/items/:productId', authenticate, (req, res, next) => saveItem(req as AuthenticatedRequest, res, next, true));

router.delete('/:id/items/:productId', authenticate, async (req: AuthenticatedRequest, res, next) => {
  try {
    const cart = await ownedCart(req.params.id, req.user!.userId);
    if (cart.status !== 'ACTIVE') throw new ApiError(409, 'Cart is not active', 'CART_NOT_ACTIVE');
    await prisma.cartItem.delete({ where: { cartId_productId: { cartId: cart.id, productId: req.params.productId } } });
    return res.json({ success: true, message: 'Cart item removed successfully' });
  } catch (error) { return next(error); }
});

router.post('/:id/checkout', authenticate, async (req: AuthenticatedRequest, res, next) => {
  try {
    const key = String(req.header('Idempotency-Key') ?? req.body?.idempotencyKey ?? '').trim() || undefined;
    const result = await orders.checkoutCart(req.params.id, req.user!.userId, key);
    return res.status(result.replayed ? 200 : 201).json({ success: true, data: result.order, message: result.replayed ? 'Existing checkout returned' : 'Checkout completed successfully' });
  } catch (error) { return next(error); }
});

export default router;
