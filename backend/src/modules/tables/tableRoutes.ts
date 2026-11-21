import { Router } from 'express';
import { requireAuth } from '../../middlewares/auth';
import { getTables, clearTable, updateTableStatus } from './tableController';

const router = Router();

// Public: View table list & availability
router.get('/', getTables);

// Protected: Only logged-in staff can update or clear tables
router.post('/:id/clear', requireAuth, clearTable);
router.patch('/:id/status', requireAuth, updateTableStatus);

export default router;
