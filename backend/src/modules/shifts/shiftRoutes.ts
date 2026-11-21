import { Router } from 'express';
import { requireAuth } from '../../middlewares/auth';
import { getCurrentShift, openShift, closeShift, recordCashMovement, getCashMovements } from './shiftController';

const router = Router();

router.use(requireAuth);

router.get('/current', getCurrentShift);
router.post('/open', openShift);
router.post('/close', closeShift);
router.get('/cash-movements', getCashMovements);
router.post('/cash-movements', recordCashMovement);

export default router;
