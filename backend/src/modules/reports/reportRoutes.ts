import { Router } from 'express';
import { requireAuth, requireRoles } from '../../middlewares/auth';
import { getDailySummary, getHourlyHeatmap } from './reportController';

const router = Router();

router.use(requireAuth);
router.use(requireRoles('OWNER'));

router.get('/daily-summary', getDailySummary);
router.get('/hourly-heatmap', getHourlyHeatmap);

export default router;
