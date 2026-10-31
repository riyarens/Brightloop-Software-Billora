
import { z } from 'zod';
import { ProductType } from '@prisma/client';

const productTypes = Object.values(ProductType) as [ProductType, ...ProductType[]];

export const createProductSchema = {
  body: z.object({
    name: z.string().min(1, 'Product name is required'),
    code: z.string().optional(),
    description: z.string().optional(),
    type: z.enum(productTypes).optional(),
    salesPrice: z.coerce.number().min(0, 'Sales price cannot be negative'),
    costPrice: z.coerce.number().min(0).optional(),
    notes: z.string().optional(),
  }),
};

export const updateProductSchema = {
  params: z.object({
    id: z.string().uuid('Invalid product ID'),
  }),
  body: z.object({
    name: z.string().min(1).optional(),
    code: z.string().optional(),
    description: z.string().optional(),
    type: z.enum(productTypes).optional(),
    salesPrice: z.coerce.number().min(0).optional(),
    costPrice: z.coerce.number().min(0).optional(),
    notes: z.string().optional(),
    isActive: z.boolean().optional(),
  }),
};

export const productIdSchema = {
  params: z.object({
    id: z.string().uuid('Invalid product ID'),
  }),
};

export const getProductsSchema = {
  query: z.object({
    search: z.string().optional(),
    type: z.enum(productTypes).optional(),
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().max(100).optional(),
  }),
};
