import { Router } from 'express';
import { getNotifications } from './notificationController';
import { requireAuth } from '../../middlewares/auth';

const router = Router();

router.use(requireAuth);
router.get('/', getNotifications);

export default router;
