import { Router } from 'express';
import { requireAuth, requireRoles } from '../../middlewares/auth';
import {
  getProducts,
  toggleSoldOut,
  createProduct,
  updateProduct,
  deleteProduct,
  getProductRecipes,
  updateProductRecipes,
  uploadProductImage,
} from './productController';

const router = Router();

// Public / POS endpoint
router.get('/', getProducts);

// Owner / Cashier toggle
router.patch('/:id/toggle-soldout', requireAuth, requireRoles('OWNER', 'CASHIER'), toggleSoldOut);

// Image Upload Endpoint (Owner)
router.post('/upload-image', requireAuth, requireRoles('OWNER'), uploadProductImage);

// Owner CRUD & Formulation
router.post('/', requireAuth, requireRoles('OWNER'), createProduct);
router.put('/:id', requireAuth, requireRoles('OWNER'), updateProduct);
router.delete('/:id', requireAuth, requireRoles('OWNER'), deleteProduct);
router.get('/:id/recipes', requireAuth, requireRoles('OWNER'), getProductRecipes);
router.put('/:id/recipes', requireAuth, requireRoles('OWNER'), updateProductRecipes);

export default router;
