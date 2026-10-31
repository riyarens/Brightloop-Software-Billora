
import { z } from 'zod';
import { TaxType } from '@prisma/client';

export const createTaxSchema = {
  body: z.object({
    name: z.string().trim().min(1, 'Tax name is required'),
    rate: z.coerce
      .number()
      .min(0, 'Tax rate cannot be negative')
      .max(999.99, 'Tax rate cannot exceed 999.99'),
    type: z.nativeEnum(TaxType).optional(),
    isIncludedInPrice: z.boolean().optional(),
    isActive: z.boolean().optional(),
  }),
};

export const updateTaxSchema = {
  params: z.object({
    id: z.string().uuid(),
  }),
  body: z.object({
    name: z.string().trim().min(1).optional(),
    rate: z.coerce
      .number()
      .min(0, 'Tax rate cannot be negative')
      .max(999.99, 'Tax rate cannot exceed 999.99')
      .optional(),
    type: z.nativeEnum(TaxType).optional(),
    isIncludedInPrice: z.boolean().optional(),
    isActive: z.boolean().optional(),
  }),
};

export const taxIdSchema = {
  params: z.object({
    id: z.string().uuid(),
  }),
};

export const getTaxesSchema = {
  query: z.object({
    search: z.string().optional(),
    type: z.nativeEnum(TaxType).optional(),
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().max(100).optional(),
  }),
};
