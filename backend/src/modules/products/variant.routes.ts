
import { Router } from 'express';
import { Role } from '@prisma/client';
import { authenticate, requireRole } from '../../middleware/auth';
import { validateRequest } from '../../middleware/validate';

import {
  createVariantController,
  getVariantsController,
  updateVariantController,
  deleteVariantController,
} from './variant.controller';

import {
  createVariantSchema,
  productVariantsSchema,
  updateVariantSchema,
  variantIdSchema,
} from './variant.validation';

const router = Router();

router.use(authenticate);

// List variants belonging to a product
router.get(
  '/products/:id/variants',
  requireRole(Role.ADMIN, Role.STAFF),
  validateRequest(productVariantsSchema),
  getVariantsController
);

// Create a variant for a product
router.post(
  '/products/:id/variants',
  requireRole(Role.ADMIN),
  validateRequest(createVariantSchema),
  createVariantController
);

// Update a variant
router.put(
  '/variants/:id',
  requireRole(Role.ADMIN),
  validateRequest(updateVariantSchema),
  updateVariantController
);

// Deactivate a variant
router.delete(
  '/variants/:id',
  requireRole(Role.ADMIN),
  validateRequest(variantIdSchema),
  deleteVariantController
);

export default router;
