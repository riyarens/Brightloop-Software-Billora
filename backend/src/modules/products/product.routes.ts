
import { Router } from 'express';
import { Role } from '@prisma/client';
import { authenticate, requireRole } from '../../middleware/auth';
import { validateRequest } from '../../middleware/validate';

import {
  createProductController,
  getProductsController,
  getProductByIdController,
  updateProductController,
  deleteProductController,
} from './product.controller';

import {
  createProductSchema,
  updateProductSchema,
  productIdSchema,
  getProductsSchema,
} from './product.validation';

const router = Router();

// All product routes require authentication
router.use(authenticate);

// Get all products - Admin and Staff
router.get(
  '/',
  requireRole(Role.ADMIN, Role.STAFF),
  validateRequest(getProductsSchema),
  getProductsController
);

// Get product by ID - Admin and Staff
router.get(
  '/:id',
  requireRole(Role.ADMIN, Role.STAFF),
  validateRequest(productIdSchema),
  getProductByIdController
);

// Create product - Admin only
router.post(
  '/',
  requireRole(Role.ADMIN),
  validateRequest(createProductSchema),
  createProductController
);

// Update product - Admin only
router.put(
  '/:id',
  requireRole(Role.ADMIN),
  validateRequest(updateProductSchema),
  updateProductController
);

// Soft delete product - Admin only
router.delete(
  '/:id',
  requireRole(Role.ADMIN),
  validateRequest(productIdSchema),
  deleteProductController
);

export default router;
