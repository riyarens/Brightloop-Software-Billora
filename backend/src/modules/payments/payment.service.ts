import { Prisma, PaymentMethod, InvoiceStatus } from '@prisma/client';
import { randomBytes } from 'node:crypto';
import prisma from '../../config/prisma';
import {
  BadRequestError,
  NotFoundError,
  ConflictError,
} from '../../utils/errors';

const generatePaymentNumber = () => {
  const date = new Date();
  const suffix = randomBytes(3).toString('hex').toUpperCase();

  return `PAY-${date.getFullYear()}${String(
    date.getMonth() + 1
  ).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}-${suffix}`;
};

class PaymentService {
  async createPayment(input: {
  invoiceId: string;
  amount: number;
  paymentMethod: PaymentMethod;
  customerId?: string;
  transactionReference?: string;
  note?: string;
}) {
    const amount = new Prisma.Decimal(input.amount);

    if (!amount.isFinite() || amount.lte(0)) {
      throw new BadRequestError('Payment amount must be greater than zero');
    }

    try {
      return await prisma.$transaction(async (tx) => {
        const invoice = await tx.invoice.findFirst({
  where: {
    id: input.invoiceId,
    ...(input.customerId && {
      customerId: input.customerId,
    }),
  },
});

        if (!invoice) {
          throw new NotFoundError('Invoice not found');
        }

        if (
          invoice.status === InvoiceStatus.CANCELLED ||
          invoice.status === InvoiceStatus.DRAFT
        ) {
          throw new BadRequestError(
            'Payment cannot be recorded for this invoice'
          );
        }

        const outstanding = invoice.total.minus(invoice.amountPaid);

        if (outstanding.lte(0)) {
          throw new ConflictError('Invoice is already fully paid');
        }

        if (amount.gt(outstanding)) {
          throw new BadRequestError(
            `Payment exceeds outstanding balance of ${outstanding.toString()}`
          );
        }

        const payment = await tx.payment.create({
          data: {
            paymentNumber: generatePaymentNumber(),
            invoiceId: invoice.id,
            paymentMethod: input.paymentMethod,
            amount,
            transactionReference: input.transactionReference,
            note: input.note,
          },
        });

        const newAmountPaid = invoice.amountPaid.plus(amount);

        const newStatus = newAmountPaid.gte(invoice.total)
          ? InvoiceStatus.PAID
          : invoice.status;

        await tx.invoice.update({
          where: { id: invoice.id },
          data: {
            amountPaid: newAmountPaid,
            status: newStatus,
          },
        });

        return payment;
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictError('Payment number already exists. Retry.');
      }

      throw error;
    }
  }

  async getPayments(filters: {
    page?: number;
    limit?: number;
    invoiceId?: string;
    customerId?: string;
  }) {
    const page = filters.page || 1;
    const limit = filters.limit || 10;

    const where: Prisma.PaymentWhereInput = {
      ...(filters.invoiceId && { invoiceId: filters.invoiceId }),
      ...(filters.customerId && {
        invoice: { customerId: filters.customerId },
      }),
    };

    const [payments, total] = await prisma.$transaction([
      prisma.payment.findMany({
        where,
        include: {
          invoice: {
            select: {
              id: true,
              invoiceNumber: true,
              customerId: true,
              total: true,
              amountPaid: true,
              status: true,
            },
          },
        },
        orderBy: { paymentDate: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.payment.count({ where }),
    ]);

    return {
      payments,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getPaymentById(id: string, customerId?: string) {
    const payment = await prisma.payment.findFirst({
      where: {
        id,
        ...(customerId && {
          invoice: { customerId },
        }),
      },
      include: {
        invoice: {
          include: {
            customer: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
    });

    if (!payment) {
      throw new NotFoundError('Payment not found');
    }

    return payment;
  }
}

export default new PaymentService();