import { Router } from 'express';
import { requireAuth } from '../../middlewares/auth';
import { getCustomers, createCustomer } from './customerController';

const router = Router();

router.use(requireAuth);

router.get('/', getCustomers);
router.post('/', createCustomer);

export default router;
