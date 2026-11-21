import { Router } from 'express';
import {
  getSuppliers,
  createSupplier,
  getPurchaseOrders,
  getPurchaseOrderById,
  createPurchaseOrder,
  receivePurchaseOrder,
} from './purchasingController';
import { requireAuth, requireRoles } from '../../middlewares/auth';

const router = Router();

// Protect all purchasing routes (Cashier can view suppliers/orders, but only Owner can create & receive)
router.use(requireAuth);

router.get('/suppliers', getSuppliers);
router.post('/suppliers', requireRoles('OWNER'), createSupplier);

router.get('/orders', getPurchaseOrders);
router.get('/orders/:id', getPurchaseOrderById);
router.post('/orders', requireRoles('OWNER'), createPurchaseOrder);
router.post('/orders/:id/receive', requireRoles('OWNER'), receivePurchaseOrder);

export default router;
