import { Router } from 'express';
import subscriptionController from './subscription.controller';
import { authenticate, requireRole } from '../../middleware/auth';
import { validateRequest } from '../../middleware/validate';
import { Role } from '@prisma/client';
import {
  closeSubscriptionSchema,
  createSubscriptionSchema,
  getSubscriptionsQuerySchema,
  pauseSubscriptionSchema,
  updateStatusSchema,
  updateSubscriptionSchema,
} from './subscription.validation';

const router = Router();

// All subscription operations require authentication
router.use(authenticate);

// 1. Create subscription (ADMIN, STAFF)
router.post(
  '/',
  requireRole(Role.ADMIN, Role.STAFF),
  validateRequest(createSubscriptionSchema),
  subscriptionController.createSubscription
);

// 2. List subscriptions (ADMIN, STAFF, or CUSTOMER viewing own)
router.get(
  '/',
  validateRequest(getSubscriptionsQuerySchema),
  subscriptionController.getSubscriptions
);

// 3. Get single subscription details (ADMIN, STAFF, or owning CUSTOMER checked at service layer)
router.get('/:id', subscriptionController.getSubscriptionById);

// 4. Update subscription details (ADMIN, STAFF)
router.put(
  '/:id',
  requireRole(Role.ADMIN, Role.STAFF),
  validateRequest(updateSubscriptionSchema),
  subscriptionController.updateSubscription
);

// 5. Update subscription status / lifecycle transition (ADMIN, STAFF)
router.patch(
  '/:id/status',
  requireRole(Role.ADMIN, Role.STAFF),
  validateRequest(updateStatusSchema),
  subscriptionController.updateStatus
);

// 6. Pause subscription (ADMIN, STAFF, or owning CUSTOMER)
router.post(
  '/:id/pause',
  validateRequest(pauseSubscriptionSchema),
  subscriptionController.pauseSubscription
);

// 7. Resume subscription (ADMIN, STAFF, or owning CUSTOMER)
router.post(
  '/:id/resume',
  subscriptionController.resumeSubscription
);

// 8. Renew subscription (ADMIN, STAFF)
router.post(
  '/:id/renew',
  requireRole(Role.ADMIN, Role.STAFF),
  subscriptionController.renewSubscription
);

// 9. Early close subscription (ADMIN, STAFF)
router.post(
  '/:id/close',
  requireRole(Role.ADMIN, Role.STAFF),
  validateRequest(closeSubscriptionSchema),
  subscriptionController.closeSubscription
);

export default router;

