import { Request, Response, NextFunction } from 'express';
import reportsService from './reports.service';
import { sendSuccess } from '../../utils/response';

export class ReportsController {
  getDashboard = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { from, to } = req.query;
      const data = await reportsService.getDashboardReport(
        typeof from === 'string' ? from : undefined,
        typeof to === 'string' ? to : undefined
      );

      // Dashboard.tsx expects the object with stats, revenueByMonth, etc.
      // Send directly as the payload
      return res.status(200).json(data);
    } catch (error) {
      next(error);
    }
  };
}

export const reportsController = new ReportsController();
export default reportsController;

