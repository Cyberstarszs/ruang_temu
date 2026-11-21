import { Router } from 'express';
import {
  clockIn,
  clockOut,
  getTodayStatus,
  getAttendanceList,
} from './attendanceController';
import { requireAuth, requireRoles } from '../../middlewares/auth';

const router = Router();

router.use(requireAuth);

router.post('/clock-in', clockIn);
router.post('/clock-out', clockOut);
router.get('/today', getTodayStatus);
router.get('/list', requireRoles('OWNER'), getAttendanceList);

export default router;
