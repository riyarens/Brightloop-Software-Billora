import { Router } from 'express';
import { Role } from '@prisma/client';
import insightsController from './insights.controller';
import { authenticate, requireRole } from '../../middleware/auth';

const router = Router();

router.use(authenticate);
router.use(requireRole(Role.ADMIN, Role.STAFF));

router.get('/assistant/chips', insightsController.getChips);
router.post('/assistant', insightsController.askAssistant);

export default router;

