import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';
import { AppError } from '../utils/errors';
import { sendError } from '../utils/response';

export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  next: NextFunction
) => {
  // 1. Zod Validation Errors
  if (err instanceof ZodError) {
    const formattedErrors = err.errors.map((e) => ({
      field: e.path.join('.'),
      message: e.message,
    }));

    return sendError({
      res,
      statusCode: 400,
      message: 'Validation failed',
      errors: formattedErrors,
    });
  }

  // 2. Prisma P2002 Unique Constraint Violation
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      const target = Array.isArray(err.meta?.target)
        ? (err.meta.target as string[]).join(', ')
        : (err.meta?.target as string) || 'unique constraint';

      return sendError({
        res,
        statusCode: 409,
        message: `A record with this ${target} already exists.`,
        errors: [{ field: target, message: `Duplicate value on unique field: ${target}` }],
      });
    }

    if (err.code === 'P2025') {
      return sendError({
        res,
        statusCode: 404,
        message: (err.meta?.cause as string) || 'Requested record was not found.',
      });
    }

    if (err.code === 'P2003') {
      return sendError({
        res,
        statusCode: 400,
        message: 'Foreign key constraint failed on related entity.',
      });
    }
  }

  // 3. Known Operational App Errors
  if (err instanceof AppError) {
    return sendError({
      res,
      statusCode: err.statusCode,
      message: err.message,
      errors: err.errors,
    });
  }

  // 4. JWT Authentication Errors
  if (err.name === 'JsonWebTokenError') {
    return sendError({
      res,
      statusCode: 401,
      message: 'Invalid authorization token',
    });
  }

  if (err.name === 'TokenExpiredError') {
    return sendError({
      res,
      statusCode: 401,
      message: 'Authorization token has expired',
    });
  }

  // 5. Unhandled / Internal Server Errors
  console.error('[Unhandled Error]:', err);
  return sendError({
    res,
    statusCode: 500,
    message: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message || 'Internal server error',
    errors: process.env.NODE_ENV === 'development' ? [err.stack] : [],
  });
};

