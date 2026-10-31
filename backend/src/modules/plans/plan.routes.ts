
import { Router } from 'express';
import { Role } from '@prisma/client';

import { authenticate, requireRole } from '../../middleware/auth';
import { validateRequest } from '../../middleware/validate';

import {
  createPlanSchema,
  updatePlanSchema,
  planIdSchema,
  getPlansSchema,
  addPlanProductSchema,
  updatePlanProductSchema,
  removePlanProductSchema,
} from './plan.validation';

import {
  createPlanController,
  getPlansController,
  getPlanByIdController,
  updatePlanController,
  deletePlanController,
  addProductToPlanController,
  updatePlanProductController,
  removePlanProductController,
} from './plan.controller';

const router = Router();

// All plan routes require authentication
router.use(authenticate);
// Get all plans - all authenticated users
router.get(
  '/',
  validateRequest(getPlansSchema),
  getPlansController
);


// Create a plan
router.post(
  '/',
  requireRole(Role.ADMIN),
  validateRequest(createPlanSchema),
  createPlanController
);

// Get a plan by ID - all authenticated users
router.get(
  '/:id',
  validateRequest(planIdSchema),
  getPlanByIdController
);

// Update a plan
router.put(
  '/:id',
  requireRole(Role.ADMIN),
  validateRequest(updatePlanSchema),
  updatePlanController
);

// Deactivate a plan
router.delete(
  '/:id',
  requireRole(Role.ADMIN),
  validateRequest(planIdSchema),
  deletePlanController
);

// Add a product to a plan
router.post(
  '/:id/products',
  requireRole(Role.ADMIN),
  validateRequest(addPlanProductSchema),
  addProductToPlanController
);

// Update a product associated with a plan
router.put(
  '/:id/products/:productId',
  requireRole(Role.ADMIN),
  validateRequest(updatePlanProductSchema),
  updatePlanProductController
);

// Remove a product from a plan
router.delete(
  '/:id/products/:productId',
  requireRole(Role.ADMIN),
  validateRequest(removePlanProductSchema),
  removePlanProductController
);

export default router;
