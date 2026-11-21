import { Router } from 'express';
import { requireAuth, requireRoles } from '../../middlewares/auth';
import { validateBody } from '../../middlewares/validate';
import { directCheckoutSchema, submitQrSchema, voidOrderSchema } from './orderValidation';
import { checkoutDirect, submitQrOrder, voidOrder, getOrders, cashierPayQrOrder } from './orderController';

const router = Router();

// Public: QR Menu ordering
router.post('/qr-submit', validateBody(submitQrSchema), submitQrOrder);

// Cashier & Owner endpoints
router.get('/', requireAuth, getOrders);
router.post('/checkout-direct', requireAuth, requireRoles('OWNER', 'CASHIER'), validateBody(directCheckoutSchema), checkoutDirect);
router.post('/:id/cashier-pay', requireAuth, requireRoles('OWNER', 'CASHIER'), cashierPayQrOrder);
router.post('/:id/pay-qr', requireAuth, requireRoles('OWNER', 'CASHIER'), cashierPayQrOrder);
router.post('/:id/void', requireAuth, requireRoles('OWNER', 'CASHIER'), validateBody(voidOrderSchema), voidOrder);

export default router;
