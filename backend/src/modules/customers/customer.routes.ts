import { Router } from 'express';
import customerController from './customer.controller';
import { authenticate, requireRole, checkCustomerOwnership } from '../../middleware/auth';
import { validateRequest } from '../../middleware/validate';
import { Role } from '@prisma/client';
import { getCustomersQuerySchema, updateCustomerSchema } from './customer.validation';

const router = Router();

router.use(authenticate);

// List customers: restricted to ADMIN and STAFF
router.get(
  '/',
  requireRole(Role.ADMIN, Role.STAFF),
  validateRequest(getCustomersQuerySchema),
  customerController.getCustomers
);

// Get single customer: ADMIN, STAFF, or the owning CUSTOMER
router.get('/:id', checkCustomerOwnership('id'), customerController.getCustomerById);

// Update customer: ADMIN, STAFF, or the owning CUSTOMER
router.put(
  '/:id',
  checkCustomerOwnership('id'),
  validateRequest(updateCustomerSchema),
  customerController.updateCustomer
);

export default router;

