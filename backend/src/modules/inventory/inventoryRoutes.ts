import { Router } from 'express';
import { requireAuth, requireRoles } from '../../middlewares/auth';
import { getInventory, recordWastage, submitStocktake, createIngredient, updateIngredient, deleteIngredient } from './inventoryController';

const router = Router();

router.use(requireAuth);

router.get('/', getInventory);
router.post('/', requireRoles('OWNER'), createIngredient);
router.put('/:id', requireRoles('OWNER'), updateIngredient);
router.delete('/:id', requireRoles('OWNER'), deleteIngredient);
router.post('/wastage', requireRoles('OWNER', 'CASHIER'), recordWastage);
router.post('/stocktake', requireRoles('OWNER'), submitStocktake);

export default router;
