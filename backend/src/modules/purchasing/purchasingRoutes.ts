import { Router } from 'express';
import {
  getSuppliers,
  createSupplier,
  updateSupplier,
  deleteSupplier,
  getPurchaseOrders,
  getPurchaseOrderById,
  createPurchaseOrder,
  receivePurchaseOrder,
  payPurchaseOrder,
  cancelPurchaseOrder,
} from './purchasingController';
import { requireAuth, requireRoles } from '../../middlewares/auth';

const router = Router();

// Protect all purchasing routes (Cashier can view suppliers/orders, but only Owner can create, receive, cancel & manage suppliers)
router.use(requireAuth);

router.get('/suppliers', getSuppliers);
router.post('/suppliers', requireRoles('OWNER'), createSupplier);
router.put('/suppliers/:id', requireRoles('OWNER'), updateSupplier);
router.delete('/suppliers/:id', requireRoles('OWNER'), deleteSupplier);

router.get('/orders', getPurchaseOrders);
router.get('/orders/:id', getPurchaseOrderById);
router.post('/orders', requireRoles('OWNER'), createPurchaseOrder);
router.post('/orders/:id/receive', requireRoles('OWNER'), receivePurchaseOrder);
router.post('/orders/:id/pay', requireRoles('OWNER'), payPurchaseOrder);
router.post('/orders/:id/cancel', requireRoles('OWNER'), cancelPurchaseOrder);

export default router;
