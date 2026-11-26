import { Router } from 'express';
import { requireAuth } from '../../middlewares/auth';
import {
  getCustomers,
  getCustomerStats,
  getCustomerDetail,
  createCustomer,
  updateCustomer,
  deleteCustomer,
} from './customerController';

const router = Router();

router.use(requireAuth);

router.get('/stats', getCustomerStats);
router.get('/', getCustomers);
router.get('/:id', getCustomerDetail);
router.post('/', createCustomer);
router.put('/:id', updateCustomer);
router.delete('/:id', deleteCustomer);

export default router;
