import { Request, Response, NextFunction } from 'express';
import authService from './auth.service';
import { sendSuccess } from '../../utils/response';
import { UnauthorizedError } from '../../utils/errors';

export class AuthController {
  register = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await authService.registerCustomer(req.body);
      return sendSuccess({
        res,
        statusCode: 201,
        message: 'Customer account registered successfully',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  login = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await authService.login(req.body);
      return sendSuccess({
        res,
        statusCode: 200,
        message: 'Login successful',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  getMe = async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new UnauthorizedError('Authentication required');
      }

      const user = await authService.getMe(req.user.id);
      return sendSuccess({
        res,
        statusCode: 200,
        message: 'User profile retrieved successfully',
        data: user,
      });
    } catch (error) {
      next(error);
    }
  };

  forgotPassword = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await authService.forgotPassword(req.body);
      return sendSuccess({
        res,
        statusCode: 200,
        message: result.message,
      });
    } catch (error) {
      next(error);
    }
  };

  resetPassword = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await authService.resetPassword(req.body);
      return sendSuccess({
        res,
        statusCode: 200,
        message: result.message,
      });
    } catch (error) {
      next(error);
    }
  };
}

export const authController = new AuthController();
export default authController;
