import { Router } from 'express';
import { requireAuth, requireRoles } from '../../middlewares/auth';
import { getInventory, recordWastage, submitStocktake } from './inventoryController';

const router = Router();

router.use(requireAuth);

router.get('/', getInventory);
router.post('/wastage', requireRoles('OWNER', 'CASHIER'), recordWastage);
router.post('/stocktake', requireRoles('OWNER'), submitStocktake);

export default router;
