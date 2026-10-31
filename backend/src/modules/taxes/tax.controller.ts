
import { Request, Response, NextFunction } from 'express';
import { sendSuccess } from '../../utils/response';
import {
  createTax,
  getTaxes,
  getTaxById,
  updateTax,
  deleteTax,
} from './tax.service';

export const createTaxController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const tax = await createTax(req.body);

    return sendSuccess({
      res,
      statusCode: 201,
      message: 'Tax created successfully',
      data: tax,
    });
  } catch (error) {
    next(error);
  }
};

export const getTaxesController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const result = await getTaxes({
      search: req.query.search as string,
      type: req.query.type as any,
      page: req.query.page ? Number(req.query.page) : undefined,
      limit: req.query.limit ? Number(req.query.limit) : undefined,
    });

    return sendSuccess({
      res,
      message: 'Taxes retrieved successfully',
      data: result.taxes,
      meta: result.pagination,
    });
  } catch (error) {
    next(error);
  }
};

export const getTaxByIdController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const tax = await getTaxById(req.params.id as string);

    return sendSuccess({
      res,
      message: 'Tax retrieved successfully',
      data: tax,
    });
  } catch (error) {
    next(error);
  }
};

export const updateTaxController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const tax = await updateTax(req.params.id as string, req.body);

    return sendSuccess({
      res,
      message: 'Tax updated successfully',
      data: tax,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteTaxController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const tax = await deleteTax(req.params.id as string);

    return sendSuccess({
      res,
      message: 'Tax deactivated successfully',
      data: tax,
    });
  } catch (error) {
    next(error);
  }
};
