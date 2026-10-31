import { z } from 'zod';

// Password requirement: more than 8 characters, at least 1 uppercase, 1 lowercase, 1 special character
export const passwordSchema = z
  .string()
  .refine((val) => val.length > 8, {
    message: 'Password must contain more than 8 characters',
  })
  .refine((val) => /[A-Z]/.test(val), {
    message: 'Password must contain at least one uppercase letter',
  })
  .refine((val) => /[a-z]/.test(val), {
    message: 'Password must contain at least one lowercase letter',
  })
  .refine((val) => /[^a-zA-Z0-9]/.test(val), {
    message: 'Password must contain at least one special character',
  });

export const registerSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email address format'),
    password: passwordSchema,
    firstName: z.string().min(1, 'First name is required').optional(),
    lastName: z.string().optional(),
    name: z.string().optional(), // Customer company/display name
    phone: z.string().optional(),
    company: z.string().optional(),
  }),
});

export const loginSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email address format'),
    password: z.string().min(1, 'Password is required'),
  }),
});

export const forgotPasswordSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email address format'),
  }),
});

export const resetPasswordSchema = z.object({
  body: z.object({
    token: z.string().min(1, 'Reset token is required'),
    password: passwordSchema,
  }),
});

export type RegisterInput = z.infer<typeof registerSchema>['body'];
export type LoginInput = z.infer<typeof loginSchema>['body'];
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>['body'];
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>['body'];

