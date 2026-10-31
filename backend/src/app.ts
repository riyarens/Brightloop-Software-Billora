import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import { config } from './config';
import { errorHandler } from './middleware/errorHandler';
import { sendSuccess } from './utils/response';
import { NotFoundError } from './utils/errors';

// Module route imports
import authRoutes from './modules/auth/auth.routes';
import staffRoutes from './modules/users/staff.routes';
import customerRoutes from './modules/customers/customer.routes';
import subscriptionRoutes from './modules/subscriptions/subscription.routes';
import productRoutes from './modules/products/product.routes';
import variantRoutes from './modules/products/variant.routes';
import planRoutes from './modules/plans/plan.routes';
import taxRoutes from './modules/taxes/tax.routes';
import discountRoutes from './modules/discounts/discount.routes';
import quotationRoutes from './modules/quotations/quotation.routes';
import invoiceRoutes from './modules/invoices/invoice.routes';
import paymentRoutes from './modules/payments/payment.routes';
import leakageRoutes from './modules/leakage/leakage.routes';
import reportsRoutes from './modules/reports/reports.routes';
import insightsRoutes from './modules/insights/insights.routes';

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

  // Core Authentication & User Management Routes
  app.use('/api/auth', authRoutes);
  app.use('/api/users/staff', staffRoutes);
  app.use('/api/customers', customerRoutes);

  // Catalog, Pricing & Quotation Routes
  app.use('/api', variantRoutes);
  app.use('/api/products', productRoutes);
  app.use('/api/plans', planRoutes);
  app.use('/api/taxes', taxRoutes);
  app.use('/api/discounts', discountRoutes);
  app.use('/api/quotations', quotationRoutes);

  // Subscriptions Lifecycle Routes
  app.use('/api/subscriptions', subscriptionRoutes);

  // Billing, Invoicing, Payments & Revenue Leakage
  app.use('/api/invoices', invoiceRoutes);
  app.use('/api/payments', paymentRoutes);
  app.use('/api/leakage', leakageRoutes);

  // Analytics, Reports & AI Revenue Assistant
  app.use('/api/reports', reportsRoutes);
  app.use('/api/insights', insightsRoutes);

  // 404 handler for undefined routes
  app.use((req: Request, res: Response, next) => {
    next(new NotFoundError(`Route not found: ${req.method} ${req.originalUrl}`));
  });

  // Centralized Error Handler
  app.use(errorHandler);

  return app;
};

export default createApp;
