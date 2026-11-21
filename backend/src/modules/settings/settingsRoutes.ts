import { Router } from 'express';
import { getSettings, updateSettings } from './settingsController';
import { requireAuth, requireRoles } from '../../middlewares/auth';

const router = Router();

// Public can read basic store settings (e.g. for receipt footer or customer menu)
router.get('/', getSettings);

// Only Owner can update store configuration
router.put('/', requireAuth, requireRoles('OWNER'), updateSettings);

export default router;
