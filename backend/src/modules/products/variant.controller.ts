
import { Request, Response, NextFunction } from 'express';
import {
  createVariant,
  getVariantsByProduct,
  updateVariant,
  deleteVariant,
} from './variant.service';
import { sendSuccess } from '../../utils/response';

export const createVariantController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const variant = await createVariant(req.params.id as string, req.body);

    return sendSuccess({
      res,
      statusCode: 201,
      message: 'Variant created successfully',
      data: variant,
    });
  } catch (error) {
    next(error);
  }
};

export const getVariantsController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const variants = await getVariantsByProduct(req.params.id as string);

    return sendSuccess({
      res,
      message: 'Variants retrieved successfully',
      data: variants,
    });
  } catch (error) {
    next(error);
  }
};

export const updateVariantController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const variant = await updateVariant(req.params.id as string, req.body);

    return sendSuccess({
      res,
      message: 'Variant updated successfully',
      data: variant,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteVariantController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    await deleteVariant(req.params.id as string);

    return sendSuccess({
      res,
      message: 'Variant deactivated successfully',
    });
  } catch (error) {
    next(error);
  }
};
