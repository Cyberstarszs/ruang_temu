import { Router } from 'express';
import { requireAuth, requireRoles } from '../../middlewares/auth';
import { validateBody } from '../../middlewares/validate';
import { directCheckoutSchema, voidOrderSchema } from './orderValidation';
import { checkoutDirect, voidOrder, getOrders } from './orderController';

const router = Router();

// Cashier & Owner endpoints
router.get('/', requireAuth, getOrders);
router.post('/checkout-direct', requireAuth, requireRoles('OWNER', 'CASHIER'), validateBody(directCheckoutSchema), checkoutDirect);
router.post('/:id/void', requireAuth, requireRoles('OWNER', 'CASHIER'), validateBody(voidOrderSchema), voidOrder);

export default router;
