import { Router } from 'express';
import { requireAuth, requireRoles } from '../../middlewares/auth';
import { getProducts, toggleSoldOut } from './productController';

const router = Router();

// Public / POS endpoint
router.get('/', getProducts);

// Owner / Cashier toggle
router.patch('/:id/toggle-soldout', requireAuth, requireRoles('OWNER', 'CASHIER'), toggleSoldOut);

export default router;
