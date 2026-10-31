import { z } from 'zod';
import { passwordSchema } from '../auth/auth.validation';

export const createStaffSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email address format'),
    password: passwordSchema,
    firstName: z.string().min(1, 'First name is required'),
    lastName: z.string().optional(),
  }),
});

export const getStaffQuerySchema = z.object({
  query: z.object({
    page: z.string().optional().default('1'),
    limit: z.string().optional().default('10'),
    search: z.string().optional(),
    isActive: z.string().optional(),
  }),
});

export type CreateStaffInput = z.infer<typeof createStaffSchema>['body'];
export type GetStaffQuery = z.infer<typeof getStaffQuerySchema>['query'];

