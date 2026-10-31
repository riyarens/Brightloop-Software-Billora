import { Request, Response, NextFunction } from 'express';
import customerService from './customer.service';
import { sendSuccess } from '../../utils/response';
import { UnauthorizedError } from '../../utils/errors';

export class CustomerController {
  getCustomers = async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new UnauthorizedError('Authentication required');
      }

      const result = await customerService.getCustomers(req.query as any, req.user);
      return sendSuccess({
        res,
        statusCode: 200,
        message: 'Customers retrieved successfully',
        data: result.data,
        meta: result.meta,
      });
    } catch (error) {
      next(error);
    }
  };

  getCustomerById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new UnauthorizedError('Authentication required');
      }

      const customerId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const result = await customerService.getCustomerById(customerId, req.user);
      return sendSuccess({
        res,
        statusCode: 200,
        message: 'Customer retrieved successfully',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  updateCustomer = async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new UnauthorizedError('Authentication required');
      }

      const customerId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const result = await customerService.updateCustomer(
        customerId,
        req.body,
        req.user
      );
      return sendSuccess({
        res,
        statusCode: 200,
        message: 'Customer updated successfully',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };
}

export const customerController = new CustomerController();
export default customerController;
