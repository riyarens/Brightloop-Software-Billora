
import { Router } from 'express';
import { Role } from '@prisma/client';
import { authenticate, requireRole } from '../../middleware/auth';
import { validateRequest } from '../../middleware/validate';

import {
  createQuotationController,
  getQuotationsController,
  getQuotationByIdController,
  updateQuotationController,
  deleteQuotationController,
  createQuotationTemplateController,
  getQuotationTemplatesController,
  updateQuotationTemplateController,
} from './quotation.controller';

import {
  createQuotationSchema,
  updateQuotationSchema,
  quotationIdSchema,
  getQuotationsSchema,
  createQuotationTemplateSchema,
  updateQuotationTemplateSchema,
} from './quotation.validation';

const router = Router();

router.use(authenticate);

// Quotation templates
router.get(
  '/templates',
  requireRole(Role.ADMIN, Role.STAFF),
  getQuotationTemplatesController
);

router.post(
  '/templates',
  requireRole(Role.ADMIN),
  validateRequest(createQuotationTemplateSchema),
  createQuotationTemplateController
);

router.put(
  '/templates/:id',
  requireRole(Role.ADMIN),
  validateRequest(updateQuotationTemplateSchema),
  updateQuotationTemplateController
);

// Quotations
router.get(
  '/',
  requireRole(Role.ADMIN, Role.STAFF),
  validateRequest(getQuotationsSchema),
  getQuotationsController
);

router.get(
  '/:id',
  requireRole(Role.ADMIN, Role.STAFF),
  validateRequest(quotationIdSchema),
  getQuotationByIdController
);

router.post(
  '/',
  requireRole(Role.ADMIN, Role.STAFF),
  validateRequest(createQuotationSchema),
  createQuotationController
);

router.put(
  '/:id',
  requireRole(Role.ADMIN, Role.STAFF),
  validateRequest(updateQuotationSchema),
  updateQuotationController
);

router.delete(
  '/:id',
  requireRole(Role.ADMIN),
  validateRequest(quotationIdSchema),
  deleteQuotationController
);

export default router;
