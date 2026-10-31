
import { z } from 'zod';
import { BillingPeriod } from '@prisma/client';

// Reusable validation for products included in a plan
const planProductInputSchema = z.object({
  productId: z.string().uuid(),
  defaultQuantity: z.coerce.number().int().positive().optional(),
  isMandatory: z.boolean().optional(),
});

// Create plan
export const createPlanSchema = {
  body: z.object({
    name: z.string().trim().min(1, 'Plan name is required'),
    code: z.string().optional(),
    description: z.string().optional(),

    billingPeriod: z.nativeEnum(BillingPeriod).optional(),
    billingInterval: z.coerce.number().int().positive().optional(),

    price: z.coerce.number().min(0).optional(),
    minQuantity: z.coerce.number().int().positive().optional(),

    startDate: z.coerce.date().optional(),
    endDate: z.coerce.date().optional(),

    autoClose: z.boolean().optional(),
    allowPause: z.boolean().optional(),
    maxPauseDurationDays: z.coerce.number().int().positive().optional(),
    allowRenew: z.boolean().optional(),
    allowEarlyClose: z.boolean().optional(),

    isActive: z.boolean().optional(),

    // Products bundled with the plan
    products: z.array(planProductInputSchema).optional(),
  }),
};

// Update plan
export const updatePlanSchema = {
  params: z.object({
    id: z.string().uuid(),
  }),
  body: z.object({
    name: z.string().trim().min(1).optional(),
    code: z.string().optional(),
    description: z.string().optional(),

    billingPeriod: z.nativeEnum(BillingPeriod).optional(),
    billingInterval: z.coerce.number().int().positive().optional(),

    price: z.coerce.number().min(0).optional(),
    minQuantity: z.coerce.number().int().positive().optional(),

    startDate: z.coerce.date().optional(),
    endDate: z.coerce.date().optional(),

    autoClose: z.boolean().optional(),
    allowPause: z.boolean().optional(),
    maxPauseDurationDays: z.coerce.number().int().positive().optional(),
    allowRenew: z.boolean().optional(),
    allowEarlyClose: z.boolean().optional(),

    isActive: z.boolean().optional(),
  }),
};

// Get plan by ID
export const planIdSchema = {
  params: z.object({
    id: z.string().uuid(),
  }),
};

// Get all plans
export const getPlansSchema = {
  query: z.object({
    search: z.string().optional(),
    billingPeriod: z.nativeEnum(BillingPeriod).optional(),
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().max(100).optional(),
  }),
};

// Add product to an existing plan
export const addPlanProductSchema = {
  params: z.object({
    id: z.string().uuid(),
  }),
  body: planProductInputSchema,
};

// Update product in a plan
export const updatePlanProductSchema = {
  params: z.object({
    id: z.string().uuid(),
    productId: z.string().uuid(),
  }),
  body: z.object({
    defaultQuantity: z.coerce.number().int().positive().optional(),
    isMandatory: z.boolean().optional(),
  }),
};

// Remove product from a plan
export const removePlanProductSchema = {
  params: z.object({
    id: z.string().uuid(),
    productId: z.string().uuid(),
  }),
};
