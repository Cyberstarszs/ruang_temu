import { Router } from 'express';
import { getPromos, validatePromo } from './promoController';

const router = Router();

router.get('/', getPromos);
router.post('/validate', validatePromo);

export default router;
