import { Router } from 'express';
import { Role } from '@prisma/client';

import billingController from './billing.controller';
import {
  authenticate,
  requireRole,
} from '../../middleware/auth';

const router = Router();

router.use(authenticate);
router.use(requireRole(Role.ADMIN, Role.STAFF));

router.get('/preview', billingController.preview);
router.post('/generate', billingController.generate);

export default router;