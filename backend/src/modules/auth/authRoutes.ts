import { Router } from 'express';
import { login, verifyPin, getUsers, createUser, updateUser, toggleUserActive } from './authController';
import { loginLimiter, pinLimiter } from '../../middlewares/rateLimiter';
import { requireAuth, requireRoles } from '../../middlewares/auth';

const router = Router();

router.post('/login', loginLimiter, login);
router.post('/verify-pin', pinLimiter, verifyPin);

// User Management (Owner only)
router.get('/users', requireAuth, requireRoles('OWNER'), getUsers);
router.post('/users', requireAuth, requireRoles('OWNER'), createUser);
router.patch('/users/:id', requireAuth, requireRoles('OWNER'), updateUser);
router.patch('/users/:id/toggle-active', requireAuth, requireRoles('OWNER'), toggleUserActive);

export default router;
