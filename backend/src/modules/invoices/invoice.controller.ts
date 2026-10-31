import { Request, Response, NextFunction } from 'express';
import invoiceService from './invoice.service';
import { sendSuccess } from '../../utils/response';
import { BadRequestError, UnauthorizedError } from '../../utils/errors';

class InvoiceController {
  getInvoices = async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new UnauthorizedError('Authentication required');
      }

      const page = Number(req.query.page || 1);
      const limit = Number(req.query.limit || 10);

      if (!Number.isInteger(page) || page < 1 ||
          !Number.isInteger(limit) || limit < 1) {
        throw new BadRequestError('Invalid pagination parameters');
      }

      const result = await invoiceService.getInvoices({
        page,
        limit,
        search: req.query.search as string,
        status: req.query.status as string,
        from: req.query.from as string,
        to: req.query.to as string,
        userId: req.user.id,
        customerId: req.user.customerId,
        role: req.user.role,
      });

      return sendSuccess({
        res,
        message: 'Invoices retrieved successfully',
        data: result.invoices,
        meta: result.pagination,
      });
    } catch (error) {
      next(error);
    }
  };

  getInvoiceById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new UnauthorizedError('Authentication required');
      }

      const invoiceId = Array.isArray(req.params.id)
  ? req.params.id[0]
  : req.params.id;

const invoice = await invoiceService.getInvoiceById(
  invoiceId,
  req.user.id,
  req.user.customerId,
  req.user.role
);

      return sendSuccess({
        res,
        message: 'Invoice details retrieved successfully',
        data: invoice,
      });
    } catch (error) {
      next(error);
    }
  };
}

export default new InvoiceController();