import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodObject } from 'zod';

export interface ValidationTarget {
  body?: ZodSchema;
  query?: ZodSchema;
  params?: ZodSchema;
}

export const validateRequest = (schema: ValidationTarget | ZodObject<any>) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      if ('parseAsync' in schema) {
        // If passed a combined ZodObject({ body: ..., query: ..., params: ... })
        const parsed = (await schema.parseAsync({
          body: req.body,
          query: req.query,
          params: req.params,
        })) as any;

        if (parsed.body !== undefined) req.body = parsed.body;
        if (parsed.query !== undefined) req.query = parsed.query;
        if (parsed.params !== undefined) req.params = parsed.params;
      } else {
        // If passed an object { body: ..., query: ..., params: ... }
        if (schema.body) {
          req.body = await schema.body.parseAsync(req.body);
        }
        if (schema.query) {
          req.query = (await schema.query.parseAsync(req.query)) as any;
        }
        if (schema.params) {
          req.params = (await schema.params.parseAsync(req.params)) as any;
        }
      }
      next();
    } catch (error) {
      next(error);
    }
  };
};
