import { Router } from 'express';
import { login, verifyPin } from './authController';
import { loginLimiter, pinLimiter } from '../../middlewares/rateLimiter';

const router = Router();

router.post('/login', loginLimiter, login);
router.post('/verify-pin', pinLimiter, verifyPin);

export default router;
