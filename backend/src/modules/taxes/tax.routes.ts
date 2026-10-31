
import { Router } from 'express';
import { Role } from '@prisma/client';
import { authenticate, requireRole } from '../../middleware/auth';
import { validateRequest } from '../../middleware/validate';
import {
  createTaxSchema,
  updateTaxSchema,
  taxIdSchema,
  getTaxesSchema,
} from './tax.validation';
import {
  createTaxController,
  getTaxesController,
  getTaxByIdController,
  updateTaxController,
  deleteTaxController,
} from './tax.controller';

const router = Router();

router.use(authenticate);

// Get all taxes
router.get(
  '/',
  requireRole(Role.ADMIN, Role.STAFF),
  validateRequest(getTaxesSchema),
  getTaxesController
);

// Get tax by ID
router.get(
  '/:id',
  requireRole(Role.ADMIN, Role.STAFF),
  validateRequest(taxIdSchema),
  getTaxByIdController
);

// Create tax
router.post(
  '/',
  requireRole(Role.ADMIN),
  validateRequest(createTaxSchema),
  createTaxController
);

// Update tax
router.put(
  '/:id',
  requireRole(Role.ADMIN),
  validateRequest(updateTaxSchema),
  updateTaxController
);

// Deactivate tax
router.delete(
  '/:id',
  requireRole(Role.ADMIN),
  validateRequest(taxIdSchema),
  deleteTaxController
);

export default router;
