
import { Router } from 'express';
import { Role } from '@prisma/client';
import { authenticate, requireRole } from '../../middleware/auth';
import { validateRequest } from '../../middleware/validate';

import {
  createDiscountController,
  getDiscountsController,
  getDiscountByIdController,
  updateDiscountController,
  deactivateDiscountController,
} from './discount.controller';

import {
  createDiscountSchema,
  updateDiscountSchema,
  discountIdSchema,
  getDiscountsSchema,
} from './discount.validation';

const router = Router();

router.use(authenticate);

// List discounts
router.get(
  '/',
  requireRole(Role.ADMIN, Role.STAFF),
  validateRequest(getDiscountsSchema),
  getDiscountsController
);

// Get discount by ID
router.get(
  '/:id',
  requireRole(Role.ADMIN, Role.STAFF),
  validateRequest(discountIdSchema),
  getDiscountByIdController
);

// Create discount
router.post(
  '/',
  requireRole(Role.ADMIN),
  validateRequest(createDiscountSchema),
  createDiscountController
);

// Update discount
router.put(
  '/:id',
  requireRole(Role.ADMIN),
  validateRequest(updateDiscountSchema),
  updateDiscountController
);

// Deactivate discount
router.delete(
  '/:id',
  requireRole(Role.ADMIN),
  validateRequest(discountIdSchema),
  deactivateDiscountController
);

export default router;
