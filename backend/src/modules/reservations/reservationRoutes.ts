import { Router } from 'express';
import { requireAuth } from '../../middlewares/auth';
import { getReservations, createReservation } from './reservationController';

const router = Router();

// Public: Customers can make online table reservations from landing page
router.post('/', createReservation);

// Protected: Only logged-in staff can view reservation list & calendar
router.get('/', requireAuth, getReservations);

export default router;
