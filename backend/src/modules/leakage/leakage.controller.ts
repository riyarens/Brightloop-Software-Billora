import { Request, Response, NextFunction } from 'express';
import leakageService from './leakage.service';
import { sendSuccess } from '../../utils/response';
import { UnauthorizedError } from '../../utils/errors';

class LeakageController {
  async getLeakageReport(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      if (!req.user) throw new UnauthorizedError();

      const customerId =
        req.user.role === 'CUSTOMER'
          ? req.user.customerId || undefined
          : undefined;

      const report =
        await leakageService.getLeakageReport(customerId);

      return sendSuccess({
        res,
        message: 'Revenue leakage report generated successfully',
        data: report,
      });
    } catch (error) {
      next(error);
    }
  }

  async getAlerts(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      if (!req.user) throw new UnauthorizedError();

      const customerId =
        req.user.role === 'CUSTOMER'
          ? req.user.customerId || undefined
          : undefined;

      const alerts = await leakageService.getAlerts(customerId);

      return sendSuccess({
        res,
        message: 'Revenue alerts retrieved successfully',
        data: alerts,
      });
    } catch (error) {
      next(error);
    }
  }
}

export default new LeakageController();