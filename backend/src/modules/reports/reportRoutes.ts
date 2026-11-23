import { Router } from 'express';
import { requireAuth, requireRoles } from '../../middlewares/auth';
import { getDailySummary, getHourlyHeatmap, getMenuMatrix } from './reportController';

const router = Router();

router.use(requireAuth);

// Menu Matrix & BCG Engineering (accessible by Kasir & Owner)
router.get('/menu-matrix', requireRoles('OWNER', 'CASHIER'), getMenuMatrix);

// Executive financial reports (Owner only)
router.get('/daily-summary', requireRoles('OWNER'), getDailySummary);
router.get('/hourly-heatmap', requireRoles('OWNER'), getHourlyHeatmap);

export default router;
