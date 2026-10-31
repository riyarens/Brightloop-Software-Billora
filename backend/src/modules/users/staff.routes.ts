import { Router } from 'express';
import staffController from './staff.controller';
import { authenticate, requireRole } from '../../middleware/auth';
import { validateRequest } from '../../middleware/validate';
import { Role } from '@prisma/client';
import { createStaffSchema, getStaffQuerySchema } from './staff.validation';

const router = Router();

// All staff endpoints are strictly restricted to ADMIN role
router.use(authenticate);
router.use(requireRole(Role.ADMIN));

router.post('/', validateRequest(createStaffSchema), staffController.createStaff);
router.get('/', validateRequest(getStaffQuerySchema), staffController.getStaffList);
router.get('/:id', staffController.getStaffById);

export default router;

