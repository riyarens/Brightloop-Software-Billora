
import { z } from 'zod';

export const createVariantSchema = {
  params: z.object({
    id: z.string().uuid(),
  }),
  body: z.object({
    brand: z.string().min(1, 'Brand is required'),
    name: z.string().optional(),
    extraPrice: z.coerce.number().min(0).optional(),
    sku: z.string().optional(),
  }),
};

export const productVariantsSchema = {
  params: z.object({
    id: z.string().uuid(),
  }),
};

export const updateVariantSchema = {
  params: z.object({
    id: z.string().uuid(),
  }),
  body: z.object({
    brand: z.string().min(1).optional(),
    name: z.string().optional(),
    extraPrice: z.coerce.number().min(0).optional(),
    sku: z.string().optional(),
    isActive: z.boolean().optional(),
  }),
};

export const variantIdSchema = {
  params: z.object({
    id: z.string().uuid(),
  }),
};
