import { Response } from 'express';

export interface ApiResponseOptions<T = any> {
  res: Response;
  statusCode?: number;
  message?: string;
  data?: T;
  meta?: any;
}

export interface ApiErrorOptions {
  res: Response;
  statusCode?: number;
  message?: string;
  errors?: any[];
}

export const sendSuccess = <T = any>({
  res,
  statusCode = 200,
  message = 'Operation completed successfully',
  data,
  meta,
}: ApiResponseOptions<T>) => {
  return res.status(statusCode).json({
    success: true,
    message,
    ...(data !== undefined ? { data } : {}),
    ...(meta !== undefined ? { meta } : {}),
  });
};

export const sendError = ({
  res,
  statusCode = 500,
  message = 'An unexpected error occurred',
  errors = [],
}: ApiErrorOptions) => {
  return res.status(statusCode).json({
    success: false,
    message,
    errors,
  });
};

