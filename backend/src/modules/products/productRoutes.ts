import { Router } from 'express';
import { requireAuth, requireRoles } from '../../middlewares/auth';
import {
  getProducts,
  getCategories,
  createCategory,
  toggleSoldOut,
  createProduct,
  updateProduct,
  deleteProduct,
  getProductRecipes,
  updateProductRecipes,
  createProductVariant,
  updateProductVariant,
  deleteProductVariant,
  uploadProductImage,
} from './productController';

const router = Router();

// Public / POS endpoint
router.get('/', getProducts);
router.get('/categories', getCategories);
router.post('/categories', requireAuth, requireRoles('OWNER'), createCategory);

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
router.post('/:id/variants', requireAuth, requireRoles('OWNER'), createProductVariant);
router.put('/:id/variants/:variantId', requireAuth, requireRoles('OWNER'), updateProductVariant);
router.delete('/:id/variants/:variantId', requireAuth, requireRoles('OWNER'), deleteProductVariant);

export default router;
