import { InvoiceStatus, Prisma } from '@prisma/client';
import prisma from '../../config/prisma';
import { BadRequestError, ForbiddenError, NotFoundError } from '../../utils/errors';

interface InvoiceFilters {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  from?: string;
  to?: string;
  userId: string;
  customerId?: string;
  role: string;
}

class InvoiceService {
  async getInvoices(filters: InvoiceFilters) {
    const page = Math.max(1, filters.page || 1);
    const limit = Math.min(100, Math.max(1, filters.limit || 10));
    const skip = (page - 1) * limit;

    const where: Prisma.InvoiceWhereInput = {};

    // Customers can only access their own invoices.
    if (filters.role === 'CUSTOMER') {
      if (!filters.customerId) {
        throw new ForbiddenError('No customer profile is linked to this account');
      }

      where.customerId = filters.customerId;
    }

    if (filters.search) {
      where.invoiceNumber = {
        contains: filters.search,
        mode: 'insensitive',
      };
    }

    if (filters.status) {
      if (!Object.values(InvoiceStatus).includes(filters.status as InvoiceStatus)) {
        throw new BadRequestError('Invalid invoice status');
      }

      where.status = filters.status as InvoiceStatus;
    }

    if (filters.from || filters.to) {
      const invoiceDate: Prisma.DateTimeFilter = {};

      if (filters.from) {
        const from = new Date(filters.from);
        if (Number.isNaN(from.getTime())) {
          throw new BadRequestError('Invalid from date');
        }
        invoiceDate.gte = from;
      }

      if (filters.to) {
        const to = new Date(filters.to);
        if (Number.isNaN(to.getTime())) {
          throw new BadRequestError('Invalid to date');
        }
        invoiceDate.lte = to;
      }

      where.invoiceDate = invoiceDate;
    }

    const [invoices, total] = await prisma.$transaction([
      prisma.invoice.findMany({
        where,
        skip,
        take: limit,
        orderBy: { invoiceDate: 'desc' },
        include: {
          customer: {
            select: {
              id: true,
              name: true,
              email: true,
              company: true,
            },
          },
          subscription: {
            select: {
              id: true,
              subscriptionNumber: true,
            },
          },
          _count: {
            select: {
              lines: true,
              payments: true,
            },
          },
        },
      }),
      prisma.invoice.count({ where }),
    ]);

    return {
      invoices,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getInvoiceById(id: string, userId: string, customerId?: string, role?: string) {
    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: {
        customer: true,
        subscription: {
          select: {
            id: true,
            subscriptionNumber: true,
            status: true,
            plan: {
              select: {
                name: true,
                billingPeriod: true,
              },
            },
          },
        },
        lines: {
          include: {
            product: true,
            variant: true,
            tax: true,
            discount: true,
          },
        },
        payments: {
          orderBy: { paymentDate: 'desc' },
        },
      },
    });

    if (!invoice) {
      throw new NotFoundError('Invoice not found');
    }

    if (role === 'CUSTOMER') {
      if (!customerId || invoice.customerId !== customerId) {
        throw new ForbiddenError('You can only access your own invoices');
      }
    }

    return invoice;
  }
}

export default new InvoiceService();