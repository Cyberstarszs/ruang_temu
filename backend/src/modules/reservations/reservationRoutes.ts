import { Router } from 'express';
import { requireAuth, requireRoles } from '../../middlewares/auth';
import { getReservations, createReservation, cancelReservation } from './reservationController';

const router = Router();

// Public: Customers can make online table reservations from landing page
router.post('/', createReservation);

// Protected: Only logged-in staff can view & cancel reservations
router.get('/', requireAuth, getReservations);
router.patch('/:id/cancel', requireAuth, requireRoles('OWNER', 'CASHIER'), cancelReservation);

export default router;
