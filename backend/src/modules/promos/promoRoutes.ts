import { Router } from 'express';
import { 
  getPromos, 
  validatePromo, 
  getAllPromosForAdmin, 
  createPromo, 
  updatePromo,
  togglePromo,
  deletePromo 
} from './promoController';
import { requireAuth, requireRoles } from '../../middlewares/auth';

const router = Router();

router.get('/', getPromos);
router.post('/validate', validatePromo);

// Owner routes
router.get('/admin', requireAuth, requireRoles('OWNER'), getAllPromosForAdmin);
router.post('/', requireAuth, requireRoles('OWNER'), createPromo);
router.put('/:id', requireAuth, requireRoles('OWNER'), updatePromo);
router.patch('/:id/toggle', requireAuth, requireRoles('OWNER'), togglePromo);
router.delete('/:id', requireAuth, requireRoles('OWNER'), deletePromo);

export default router;
