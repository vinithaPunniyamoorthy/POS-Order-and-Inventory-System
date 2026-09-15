import { Router } from 'express';
import { prisma } from '../config/prisma';
import { authenticate, authorize, AuthenticatedRequest } from '../middleware/auth';
import { ApiError } from '../utils/errors';
import { ReservationExpiryService } from '../services/reservationExpiryService';

const router = Router();
const expiry = new ReservationExpiryService(prisma);

router.post('/release-expired', authenticate, authorize('ADMIN'), async (_req, res, next) => {
  try { return res.json({ success: true, data: { expired: await expiry.expireReservations() }, message: 'Expired reservations released' }); }
  catch (error) { return next(error); }
});

router.get('/:id', authenticate, async (req: AuthenticatedRequest, res, next) => {
  try {
    const reservation = await prisma.stockReservation.findUnique({ where: { id: req.params.id }, include: { order: true, product: true } });
    if (!reservation || (reservation.order.userId !== req.user!.userId && req.user!.role !== 'ADMIN')) throw new ApiError(404, 'Reservation not found', 'RESERVATION_NOT_FOUND');
    return res.json({ success: true, data: reservation, message: 'Reservation retrieved successfully' });
  } catch (error) { return next(error); }
});
export default router;
