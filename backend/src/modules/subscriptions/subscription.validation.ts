import { z } from 'zod';
import { SubscriptionStatus } from '@prisma/client';

export const subscriptionLineSchema = z.object({
  productId: z.string().uuid('Product ID must be a valid UUID'),
  variantId: z.string().uuid('Variant ID must be a valid UUID').optional().nullable(),
  quantity: z.number().int().min(1, 'Quantity must be at least 1').default(1),
  unitPrice: z.union([z.number().nonnegative(), z.string()]).optional(),
  taxId: z.string().uuid('Tax ID must be a valid UUID').optional().nullable(),
  discountId: z.string().uuid('Discount ID must be a valid UUID').optional().nullable(),
  description: z.string().optional(),
});

export const createSubscriptionSchema = z.object({
  body: z.object({
    customerId: z.string().uuid('Customer ID must be a valid UUID'),
    planId: z.string().uuid('Plan ID must be a valid UUID'),
    quotationId: z.string().uuid('Quotation ID must be a valid UUID').optional().nullable(),
    startDate: z.string().datetime().optional(),
    expiryDate: z.string().datetime().optional().nullable(),
    paymentTerms: z.string().optional().default('Immediate Payment'),
    autoRenew: z.boolean().optional().default(true),
    notes: z.string().optional(),
    status: z.nativeEnum(SubscriptionStatus).optional().default(SubscriptionStatus.DRAFT),
    lines: z.array(subscriptionLineSchema).min(1, 'Subscription must have at least one product line'),
  }),
});

export const updateSubscriptionSchema = z.object({
  body: z.object({
    paymentTerms: z.string().optional(),
    autoRenew: z.boolean().optional(),
    notes: z.string().optional(),
    startDate: z.string().datetime().optional(),
    expiryDate: z.string().datetime().optional().nullable(),
    lines: z.array(subscriptionLineSchema).optional(),
  }),
});

export const updateStatusSchema = z.object({
  body: z.object({
    status: z.nativeEnum(SubscriptionStatus),
    note: z.string().optional(),
  }),
});

export const pauseSubscriptionSchema = z.object({
  body: z.object({
    reason: z.string().optional(),
  }).optional(),
});

export const closeSubscriptionSchema = z.object({
  body: z.object({
    reason: z.string().optional(),
  }).optional(),
});

export const getSubscriptionsQuerySchema = z.object({
  query: z.object({
    page: z.string().optional().default('1'),
    limit: z.string().optional().default('10'),
    status: z.nativeEnum(SubscriptionStatus).optional(),
    customerId: z.string().uuid().optional(),
    planId: z.string().uuid().optional(),
    search: z.string().optional(),
  }),
});

export type SubscriptionLineInput = z.infer<typeof subscriptionLineSchema>;
export type CreateSubscriptionInput = z.infer<typeof createSubscriptionSchema>['body'];
export type UpdateSubscriptionInput = z.infer<typeof updateSubscriptionSchema>['body'];
export type UpdateStatusInput = z.infer<typeof updateStatusSchema>['body'];
export type GetSubscriptionsQuery = z.infer<typeof getSubscriptionsQuerySchema>['query'];

