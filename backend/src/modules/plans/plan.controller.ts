
import { Request, Response, NextFunction } from 'express';
import { sendSuccess } from '../../utils/response';
import {
  createPlan,
  getPlans,
  getPlanById,
  updatePlan,
  deletePlan,
  addProductToPlan,
  updatePlanProduct,
  removeProductFromPlan,
} from './plan.service';

// 1. Create plan
export const createPlanController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const plan = await createPlan(req.body);

    return sendSuccess({
      res,
      statusCode: 201,
      message: 'Plan created successfully',
      data: plan,
    });
  } catch (error) {
    next(error);
  }
};

// 2. Get all plans
export const getPlansController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const result = await getPlans({
      search: req.query.search as string,
      billingPeriod: req.query.billingPeriod as any,
      page: req.query.page ? Number(req.query.page) : undefined,
      limit: req.query.limit ? Number(req.query.limit) : undefined,
    });

    return sendSuccess({
      res,
      message: 'Plans retrieved successfully',
      data: result.plans,
      meta: result.pagination,
    });
  } catch (error) {
    next(error);
  }
};

// 3. Get plan by ID
export const getPlanByIdController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const plan = await getPlanById(req.params.id as string);

    return sendSuccess({
      res,
      message: 'Plan retrieved successfully',
      data: plan,
    });
  } catch (error) {
    next(error);
  }
};

// 4. Update plan
export const updatePlanController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const plan = await updatePlan(req.params.id as string, req.body);

    return sendSuccess({
      res,
      message: 'Plan updated successfully',
      data: plan,
    });
  } catch (error) {
    next(error);
  }
};

// 5. Delete (deactivate) plan
export const deletePlanController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    await deletePlan(req.params.id as string);

    return sendSuccess({
      res,
      message: 'Plan deactivated successfully',
    });
  } catch (error) {
    next(error);
  }
};

// 6. Add product to plan
export const addProductToPlanController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const result = await addProductToPlan(req.params.id as string, req.body);

    return sendSuccess({
      res,
      statusCode: 201,
      message: 'Product added to plan successfully',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

// 7. Update product in plan
export const updatePlanProductController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const result = await updatePlanProduct(
      req.params.id as string,
      req.params.productId as string,
      req.body
    );

    return sendSuccess({
      res,
      message: 'Plan product updated successfully',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

// 8. Remove product from plan
export const removePlanProductController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const result = await removeProductFromPlan(
      req.params.id as string,
      req.params.productId as string
    );

    return sendSuccess({
      res,
      message: result.message,
    });
  } catch (error) {
    next(error);
  }
};
