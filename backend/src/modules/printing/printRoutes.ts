import { Router } from 'express';
import { requireAuth } from '../../middlewares/auth';
import { getPrintQueue, retryPrintJob, fallbackPrintJob } from './printController';

const router = Router();

router.use(requireAuth);

router.get('/queue', getPrintQueue);
router.post('/retry/:id', retryPrintJob);
router.post('/fallback/:id', fallbackPrintJob);

export default router;
