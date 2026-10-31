import { Request, Response, NextFunction } from 'express';
import subscriptionService from './subscription.service';
import { sendSuccess } from '../../utils/response';
import { UnauthorizedError } from '../../utils/errors';

export class SubscriptionController {
  private getId = (req: Request): string => {
    const val = req.params.id;
    return Array.isArray(val) ? val[0] : val;
  };

  createSubscription = async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) throw new UnauthorizedError('Authentication required');
      const result = await subscriptionService.createSubscription(req.body, req.user);
      return sendSuccess({
        res,
        statusCode: 201,
        message: 'Subscription created successfully',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  getSubscriptions = async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) throw new UnauthorizedError('Authentication required');
      const result = await subscriptionService.getSubscriptions(req.query as any, req.user);
      return sendSuccess({
        res,
        statusCode: 200,
        message: 'Subscriptions retrieved successfully',
        data: result.data,
        meta: result.meta,
      });
    } catch (error) {
      next(error);
    }
  };

  getMySubscriptions = async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) throw new UnauthorizedError('Authentication required');
      const result = await subscriptionService.getMySubscriptions(req.user, req.query as any);
      return sendSuccess({
        res,
        statusCode: 200,
        message: 'Your subscriptions retrieved successfully',
        data: result.data,
        meta: result.meta,
      });
    } catch (error) {
      next(error);
    }
  };

  getSubscriptionById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) throw new UnauthorizedError('Authentication required');
      const id = this.getId(req);
      const result = await subscriptionService.getSubscriptionById(id, req.user);
      return sendSuccess({
        res,
        statusCode: 200,
        message: 'Subscription details retrieved successfully',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  updateSubscription = async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) throw new UnauthorizedError('Authentication required');
      const id = this.getId(req);
      const result = await subscriptionService.updateSubscription(id, req.body, req.user);
      return sendSuccess({
        res,
        statusCode: 200,
        message: 'Subscription updated successfully',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  updateStatus = async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) throw new UnauthorizedError('Authentication required');
      const id = this.getId(req);
      const result = await subscriptionService.updateStatus(id, req.body.status, req.body.note, req.user);
      return sendSuccess({
        res,
        statusCode: 200,
        message: `Subscription status updated to ${req.body.status}`,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  pauseSubscription = async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) throw new UnauthorizedError('Authentication required');
      const id = this.getId(req);
      const result = await subscriptionService.pauseSubscription(id, req.body?.reason, req.user);
      return sendSuccess({
        res,
        statusCode: 200,
        message: 'Subscription paused successfully',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  resumeSubscription = async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) throw new UnauthorizedError('Authentication required');
      const id = this.getId(req);
      const result = await subscriptionService.resumeSubscription(id, req.user);
      return sendSuccess({
        res,
        statusCode: 200,
        message: 'Subscription resumed successfully',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  renewSubscription = async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) throw new UnauthorizedError('Authentication required');
      const id = this.getId(req);
      const result = await subscriptionService.renewSubscription(id, req.user);
      return sendSuccess({
        res,
        statusCode: 200,
        message: 'Subscription renewed successfully',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  closeSubscription = async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) throw new UnauthorizedError('Authentication required');
      const id = this.getId(req);
      const result = await subscriptionService.closeSubscription(id, req.body?.reason, req.user);
      return sendSuccess({
        res,
        statusCode: 200,
        message: 'Subscription closed successfully',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };
}

export const subscriptionController = new SubscriptionController();
export default subscriptionController;
