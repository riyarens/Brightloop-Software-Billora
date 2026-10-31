
import { z } from 'zod';
import { QuotationStatus } from '@prisma/client';

const quotationLineSchema = z.object({
  productId: z.string().uuid('Invalid product ID'),
  variantId: z.string().uuid().optional().nullable(),
  description: z.string().optional().nullable(),
  quantity: z.coerce.number().int().positive(),
  unitPrice: z.coerce.number().min(0),
  taxId: z.string().uuid().optional().nullable(),
  discountId: z.string().uuid().optional().nullable(),
});

export const createQuotationSchema = z.object({
  body: z.object({
    customerId: z.string().uuid(),
    planId: z.string().uuid().optional().nullable(),
    templateId: z.string().uuid().optional().nullable(),
    validUntil: z.coerce.date().optional().nullable(),
    termsAndConditions: z.string().optional().nullable(),
    lines: z.array(quotationLineSchema).min(1, 'At least one quotation line is required'),
  }),
});

export const updateQuotationSchema = z.object({
  params: z.object({
    id: z.string().uuid(),
  }),
  body: z.object({
    customerId: z.string().uuid().optional(),
    planId: z.string().uuid().optional().nullable(),
    templateId: z.string().uuid().optional().nullable(),
    status: z.nativeEnum(QuotationStatus).optional(),
    validUntil: z.coerce.date().optional().nullable(),
    termsAndConditions: z.string().optional().nullable(),
    lines: z.array(quotationLineSchema).min(1).optional(),
  }),
});

export const quotationIdSchema = z.object({
  params: z.object({
    id: z.string().uuid(),
  }),
});

export const getQuotationsSchema = z.object({
  query: z.object({
    search: z.string().optional(),
    status: z.nativeEnum(QuotationStatus).optional(),
    customerId: z.string().uuid().optional(),
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(10),
  }),
});

export const createQuotationTemplateSchema = z.object({
  body: z.object({
    name: z.string().trim().min(1),
    description: z.string().optional().nullable(),
    planId: z.string().uuid().optional().nullable(),
    defaultDurationDays: z.coerce.number().int().positive().optional().nullable(),
    termsAndConditions: z.string().optional().nullable(),
    isActive: z.boolean().optional(),
  }),
});

export const updateQuotationTemplateSchema = z.object({
  params: z.object({
    id: z.string().uuid(),
  }),
  body: z.object({
    name: z.string().trim().min(1).optional(),
    description: z.string().optional().nullable(),
    planId: z.string().uuid().optional().nullable(),
    defaultDurationDays: z.coerce.number().int().positive().optional().nullable(),
    termsAndConditions: z.string().optional().nullable(),
    isActive: z.boolean().optional(),
  }),
});
