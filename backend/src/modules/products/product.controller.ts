
import { Request, Response, NextFunction } from 'express';
import {
  createProduct,
  getProducts,
  getProductById,
  updateProduct,
  deleteProduct,
} from './product.service';
import { sendSuccess } from '../../utils/response';

export const createProductController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const product = await createProduct(req.body);

    return sendSuccess({
      res,
      statusCode: 201,
      message: 'Product created successfully',
      data: product,
    });
  } catch (error) {
    next(error);
  }
};

export const getProductsController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const result = await getProducts({
      search: req.query.search as string,
      type: req.query.type as any,
      page: req.query.page ? Number(req.query.page) : undefined,
      limit: req.query.limit ? Number(req.query.limit) : undefined,
    });

    return sendSuccess({
      res,
      message: 'Products retrieved successfully',
      data: result.products,
      meta: result.pagination,
    });
  } catch (error) {
    next(error);
  }
};

export const getProductByIdController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const product = await getProductById(req.params.id as string);

    return sendSuccess({
      res,
      message: 'Product retrieved successfully',
      data: product,
    });
  } catch (error) {
    next(error);
  }
};

export const updateProductController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const product = await updateProduct(req.params.id as string, req.body);

    return sendSuccess({
      res,
      message: 'Product updated successfully',
      data: product,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteProductController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    await deleteProduct(req.params.id as string);

    return sendSuccess({
      res,
      message: 'Product deactivated successfully',
    });
  } catch (error) {
    next(error);
  }
};
