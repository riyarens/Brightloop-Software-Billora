import { Request, Response, NextFunction } from 'express';
import staffService from './staff.service';
import { sendSuccess } from '../../utils/response';

export class StaffController {
  createStaff = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await staffService.createStaff(req.body);
      return sendSuccess({
        res,
        statusCode: 201,
        message: 'Staff account created successfully',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  getStaffList = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await staffService.getStaffList(req.query as any);
      return sendSuccess({
        res,
        statusCode: 200,
        message: 'Staff members retrieved successfully',
        data: result.data,
        meta: result.meta,
      });
    } catch (error) {
      next(error);
    }
  };

  getStaffById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const staffId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const result = await staffService.getStaffById(staffId);
      return sendSuccess({
        res,
        statusCode: 200,
        message: 'Staff member details retrieved successfully',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };
}

export const staffController = new StaffController();
export default staffController;
