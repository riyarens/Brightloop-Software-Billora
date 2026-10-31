
import express, { Application, Request, Response } from 'express';
import cors from 'cors';

import { config } from './config';
import { errorHandler } from './middleware/errorHandler';
import { sendSuccess } from './utils/response';
import { NotFoundError } from './utils/errors';
import { authenticate } from './middleware/auth';

// Module route imports
import authRoutes from './modules/auth/auth.routes';
import staffRoutes from './modules/users/staff.routes';
import customerRoutes from './modules/customers/customer.routes';
import subscriptionRoutes from './modules/subscriptions/subscription.routes';
import subscriptionController from './modules/subscriptions/subscription.controller';

// Product & Variant module
import productRoutes from './modules/products/product.routes';
import variantRoutes from './modules/products/variant.routes';

// Plan module
import planRoutes from './modules/plans/plan.routes';

export const createApp = (): Application => {
  const app = express();
  const allowedOrigins = new Set([
    config.clientUrl,
    'http://localhost:5173',
    'http://localhost:3000',
  ]);

  // Middleware
  app.use(
    cors({
      origin: (origin, callback) => {
        const isLocalDevelopmentOrigin =
          config.nodeEnv !== 'production' &&
          /^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin ?? '');

        callback(
          null,
          !origin || allowedOrigins.has(origin) || isLocalDevelopmentOrigin,
        );
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    })
  );

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Healthcheck endpoint
  app.get('/api/health', (req: Request, res: Response) => {
    return sendSuccess({
      res,
      message: 'BILLORA Backend API is healthy and operational',
      data: {
        timestamp: new Date().toISOString(),
        service: 'BILLORA Subscription Management System',
        lead: 'Member 1 - Riya',
        status: 'UP',
      },
    });
  });

  // Base API index
  app.get('/api', (req: Request, res: Response) => {
    return sendSuccess({
      res,
      message: 'Welcome to BILLORA API - Subscription Management System',
      data: {
        version: '1.0.0',
        documentation: '/docs/API.md',
      },
    });
  });

  // Authentication routes
  app.use('/api/auth', authRoutes);

  // Staff and customer management
  app.use('/api/users/staff', staffRoutes);
  app.use('/api/customers', customerRoutes);

  // Subscription management
  app.use('/api/subscriptions', subscriptionRoutes);

  // Product and Variant management
  app.use('/api', variantRoutes);
  app.use('/api/products', productRoutes);

  // Plan and Plan Product management
  app.use('/api/plans', planRoutes);

  // Customer Portal - My Subscriptions
  app.get(
    '/api/me/subscriptions',
    authenticate,
    subscriptionController.getMySubscriptions.bind(subscriptionController)
  );

  // 404 handler for undefined routes
  app.use((req: Request, res: Response, next) => {
    next(
      new NotFoundError(
        `Route not found: ${req.method} ${req.originalUrl}`
      )
    );
  });

  // Centralized Error Handler
  app.use(errorHandler);

  return app;
};

export default createApp;
