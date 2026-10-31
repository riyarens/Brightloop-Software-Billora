
import { Request, Response, NextFunction } from 'express';

import {
  createQuotation,
  getQuotations,
  getQuotationById,
  updateQuotation,
  deleteQuotation,
  createQuotationTemplate,
  getQuotationTemplates,
  updateQuotationTemplate,
} from './quotation.service';

import { sendSuccess } from '../../utils/response';

export const createQuotationController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const quotation = await createQuotation(req.body);

    return sendSuccess({
      res,
      statusCode: 201,
      message: 'Quotation created successfully',
      data: quotation,
    });
  } catch (error) {
    next(error);
  }
};

export const getQuotationsController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const result = await getQuotations(req.query as any);

    return sendSuccess({
      res,
      message: 'Quotations retrieved successfully',
      data: result.quotations,
      meta: result.pagination,
    });
  } catch (error) {
    next(error);
  }
};

export const getQuotationByIdController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const quotation = await getQuotationById(req.params.id as string);

    return sendSuccess({
      res,
      message: 'Quotation retrieved successfully',
      data: quotation,
    });
  } catch (error) {
    next(error);
  }
};

export const updateQuotationController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const quotation = await updateQuotation(
      req.params.id as string,
      req.body
    );

    return sendSuccess({
      res,
      message: 'Quotation updated successfully',
      data: quotation,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteQuotationController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    await deleteQuotation(req.params.id as string);

    return sendSuccess({
      res,
      message: 'Quotation deleted successfully',
      data: null,
    });
  } catch (error) {
    next(error);
  }
};

// Quotation templates

export const createQuotationTemplateController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const template = await createQuotationTemplate(req.body);

    return sendSuccess({
      res,
      statusCode: 201,
      message: 'Quotation template created successfully',
      data: template,
    });
  } catch (error) {
    next(error);
  }
};

export const getQuotationTemplatesController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const templates = await getQuotationTemplates();

    return sendSuccess({
      res,
      message: 'Quotation templates retrieved successfully',
      data: templates,
    });
  } catch (error) {
    next(error);
  }
};

export const updateQuotationTemplateController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const template = await updateQuotationTemplate(
      req.params.id as string,
      req.body
    );

    return sendSuccess({
      res,
      message: 'Quotation template updated successfully',
      data: template,
    });
  } catch (error) {
    next(error);
  }
};
