import { Request, Response, NextFunction } from 'express';
import billingService from './billing.service';
import { sendSuccess } from '../../utils/response';
import { UnauthorizedError } from '../../utils/errors';

class BillingController {
  async preview(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new UnauthorizedError();

      const subscriptions =
        await billingService.previewDueSubscriptions();

      return sendSuccess({
        res,
        message: 'Due subscriptions retrieved successfully',
        data: subscriptions,
      });
    } catch (error) {
      next(error);
    }
  }

  async generate(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new UnauthorizedError();

      const result = await billingService.generateDueInvoices();

      return sendSuccess({
        res,
        message: 'Recurring billing run completed',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
}

export default new BillingController();