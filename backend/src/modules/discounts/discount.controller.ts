
import { Request, Response, NextFunction } from 'express';
import {
  createDiscount,
  getDiscounts,
  getDiscountById,
  updateDiscount,
  deactivateDiscount,
} from './discount.service';
import { sendSuccess } from '../../utils/response';

export const createDiscountController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const discount = await createDiscount(req.body);
    return sendSuccess({
      res,
      statusCode: 201,
      message: 'Discount created successfully',
      data: discount,
    });
  } catch (error) {
    next(error);
  }
};

export const getDiscountsController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const result = await getDiscounts(req.query as any);
    return sendSuccess({
      res,
      message: 'Discounts retrieved successfully',
      data: result.discounts,
      meta: result.pagination,
    });
  } catch (error) {
    next(error);
  }
};

export const getDiscountByIdController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const discount = await getDiscountById(req.params.id as string);
    return sendSuccess({
      res,
      message: 'Discount retrieved successfully',
      data: discount,
    });
  } catch (error) {
    next(error);
  }
};

export const updateDiscountController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const discount = await updateDiscount(req.params.id as string, req.body);
    return sendSuccess({
      res,
      message: 'Discount updated successfully',
      data: discount,
    });
  } catch (error) {
    next(error);
  }
};

export const deactivateDiscountController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const discount = await deactivateDiscount(req.params.id as string);
    return sendSuccess({
      res,
      message: 'Discount deactivated successfully',
      data: discount,
    });
  } catch (error) {
    next(error);
  }
};
