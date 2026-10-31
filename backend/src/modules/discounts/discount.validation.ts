
import { z } from 'zod';
import { DiscountType } from '@prisma/client';

const discountFields = {
  name: z.string().trim().min(1, 'Discount name is required'),
  code: z.string().trim().optional().nullable(),
  type: z.nativeEnum(DiscountType),
  value: z.coerce.number().positive('Discount value must be positive'),
  startDate: z.coerce.date().optional().nullable(),
  endDate: z.coerce.date().optional().nullable(),
  minOrderAmount: z.coerce.number().min(0).optional().nullable(),
  isActive: z.boolean().optional(),
};

export const createDiscountSchema = z.object({
  body: z.object(discountFields).refine(
    (data) =>
      !data.startDate ||
      !data.endDate ||
      data.endDate >= data.startDate,
    { message: 'End date must be after start date', path: ['endDate'] }
  ).refine(
    (data) =>
      data.type !== DiscountType.PERCENTAGE || data.value <= 100,
    { message: 'Percentage discount cannot exceed 100', path: ['value'] }
  ),
});

export const updateDiscountSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid discount ID'),
  }),
  body: z.object({
    name: discountFields.name.optional(),
    code: discountFields.code,
    type: discountFields.type.optional(),
    value: discountFields.value.optional(),
    startDate: discountFields.startDate,
    endDate: discountFields.endDate,
    minOrderAmount: discountFields.minOrderAmount,
    isActive: discountFields.isActive,
  }).refine(
    (data) =>
      !data.startDate ||
      !data.endDate ||
      data.endDate >= data.startDate,
    { message: 'End date must be after start date', path: ['endDate'] }
  ),
});

export const discountIdSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid discount ID'),
  }),
});

export const getDiscountsSchema = z.object({
  query: z.object({
    search: z.string().optional(),
    type: z.nativeEnum(DiscountType).optional(),
    isActive: z.coerce.boolean().optional(),
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(10),
  }),
});
