import { Router } from 'express';
import { Role } from '@prisma/client';
import reportsController from './reports.controller';
import { authenticate, requireRole } from '../../middleware/auth';

const router = Router();

router.use(authenticate);
router.get('/dashboard', requireRole(Role.ADMIN, Role.STAFF), reportsController.getDashboard);

export default router;

