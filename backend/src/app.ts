
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
import productRoutes from './modules/products/product.routes';
import variantRoutes from './modules/products/variant.routes';
import planRoutes from './modules/plans/plan.routes';

export const createApp = (): Application => {
  const app = express();

  // Middleware
  app.use(
    cors({
      origin: [config.clientUrl, 'http://localhost:5173', 'http://localhost:3000'],
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

  // Module Routes
  app.use('/api/auth', authRoutes);
  app.use('/api/users/staff', staffRoutes);
  app.use('/api/customers', customerRoutes);

  // Product and Variant routes
  app.use('/api', variantRoutes);
  app.use('/api/products', productRoutes);

  // Plans routes
  app.use('/api/plans', planRoutes);

  // Subscription routes
  app.use('/api/subscriptions', subscriptionRoutes);

  // Customer Portal - current user's subscriptions
  app.get(
    '/api/me/subscriptions',
    authenticate,
    subscriptionController.getMySubscriptions.bind(subscriptionController)
  );

  // 404 handler
  app.use((req: Request, res: Response, next) => {
    next(new NotFoundError(`Route not found: ${req.method} ${req.originalUrl}`));
  });

  // Centralized Error Handler
  app.use(errorHandler);

  return app;
};

export default createApp;
