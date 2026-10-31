import { Request, Response, NextFunction } from 'express';
import { PaymentMethod } from '@prisma/client';
import paymentService from './payment.service';
import { sendSuccess } from '../../utils/response';
import { BadRequestError, UnauthorizedError } from '../../utils/errors';

class PaymentController {
  async createPayment(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      if (!req.user) {
        throw new UnauthorizedError();
      }

      const {
        invoiceId,
        amount,
        paymentMethod,
        transactionReference,
        note,
      } = req.body;

      if (!invoiceId || !amount || !paymentMethod) {
        throw new BadRequestError(
          'invoiceId, amount and paymentMethod are required'
        );
      }

      if (
        !Object.values(PaymentMethod).includes(paymentMethod)
      ) {
        throw new BadRequestError('Invalid payment method');
      }

      const payment = await paymentService.createPayment({
  invoiceId,
  amount: Number(amount),
  paymentMethod,
  customerId:
    req.user.role === 'CUSTOMER'
      ? req.user.customerId || undefined
      : undefined,
  transactionReference,
  note,
});

      return sendSuccess({
        res,
        statusCode: 201,
        message: 'Payment recorded successfully',
        data: payment,
      });
    } catch (error) {
      next(error);
    }
  }

  async getPayments(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      if (!req.user) {
        throw new UnauthorizedError();
      }

      const result = await paymentService.getPayments({
        page: Number(req.query.page) || 1,
        limit: Number(req.query.limit) || 10,
        invoiceId: req.query.invoiceId as string,
        customerId:
          req.user.role === 'CUSTOMER'
            ? req.user.customerId || undefined
            : undefined,
      });

      return sendSuccess({
        res,
        message: 'Payments retrieved successfully',
        data: result.payments,
        meta: result.pagination,
      });
    } catch (error) {
      next(error);
    }
  }

  async getPaymentById(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      if (!req.user) {
        throw new UnauthorizedError();
      }

      const id = Array.isArray(req.params.id)
        ? req.params.id[0]
        : req.params.id;

      const payment = await paymentService.getPaymentById(
        id,
        req.user.role === 'CUSTOMER'
          ? req.user.customerId || undefined
          : undefined
      );

      return sendSuccess({
        res,
        message: 'Payment retrieved successfully',
        data: payment,
      });
    } catch (error) {
      next(error);
    }
  }
}

export default new PaymentController();