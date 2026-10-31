
import { z } from 'zod';

export const getCustomersQuerySchema = z.object({
  query: z.object({
    page: z.string().optional().default('1'),
    limit: z.string().optional().default('10'),
    search: z.string().optional(),
    isActive: z.string().optional(),
  }),
});

export const updateCustomerSchema = z.object({
  body: z.object({
    name: z.string().min(1, 'Customer name cannot be empty').optional(),
    phone: z.string().optional(),
    company: z.string().optional(),
    address: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    postalCode: z.string().optional(),
    country: z.string().optional(),
    taxId: z.string().optional(),
    notes: z.string().optional(),
  }),
});

export type GetCustomersQuery = z.infer<typeof getCustomersQuerySchema>['query'];
export type UpdateCustomerInput = z.infer<typeof updateCustomerSchema>['body'];

