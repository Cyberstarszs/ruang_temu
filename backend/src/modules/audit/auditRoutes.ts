import { Router } from 'express';
import { requireAuth, requireRoles } from '../../middlewares/auth';
import { getAuditLogs } from './auditController';

const router = Router();

router.use(requireAuth);
router.use(requireRoles('OWNER'));

router.get('/', getAuditLogs);

export default router;
