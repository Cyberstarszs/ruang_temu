import { Router } from 'express';
import { requireAuth, requireRoles } from '../../middlewares/auth';
import {
  getCurrentShift,
  openShift,
  closeShift,
  recordCashMovement,
  getCashMovements,
  getShiftHistory,
  forceCloseShift,
  uploadReceiptImage,
} from './shiftController';

const router = Router();

router.use(requireAuth);

router.get('/current', getCurrentShift);
router.post('/open', openShift);
router.post('/close', closeShift);
router.get('/cash-movements', getCashMovements);
router.post('/cash-movements', recordCashMovement);
router.post('/upload-receipt', uploadReceiptImage);
router.get('/history', requireRoles('OWNER'), getShiftHistory);
router.post('/:id/force-close', requireRoles('OWNER'), forceCloseShift);

export default router;
