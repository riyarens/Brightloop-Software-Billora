import {
  Prisma,
  InvoiceStatus,
  RevenueAlertType,
  AlertSeverity,
} from '@prisma/client';

import prisma from '../../config/prisma';

class LeakageService {
  async getLeakageReport(customerId?: string) {
    const now = new Date();

    const invoices = await prisma.invoice.findMany({
      where: {
        status: {
          in: [InvoiceStatus.CONFIRMED, InvoiceStatus.SENT],
        },
        dueDate: { lt: now },
        ...(customerId && { customerId }),
      },
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        subscription: {
          select: {
            subscriptionNumber: true,
          },
        },
      },
      orderBy: { dueDate: 'asc' },
    });

    const leakageInvoices = [];

    let totalOutstanding = new Prisma.Decimal(0);

    for (const invoice of invoices) {
      const outstanding = invoice.total.minus(invoice.amountPaid);

      if (outstanding.lte(0)) continue;

      const daysOverdue = Math.floor(
        (now.getTime() - invoice.dueDate.getTime()) /
          (1000 * 60 * 60 * 24)
      );

      totalOutstanding = totalOutstanding.plus(outstanding);

      const severity =
        daysOverdue > 30
          ? AlertSeverity.HIGH
          : daysOverdue > 7
            ? AlertSeverity.MEDIUM
            : AlertSeverity.LOW;

      const alertType =
        invoice.amountPaid.gt(0)
          ? RevenueAlertType.REVENUE_LEAKAGE
          : RevenueAlertType.OVERDUE_INVOICE;

      // Avoid creating duplicate unresolved alerts.
      const existingAlert = await prisma.revenueAlert.findFirst({
        where: {
          invoiceId: invoice.id,
          alertType,
          isResolved: false,
        },
      });

      if (!existingAlert) {
        await prisma.revenueAlert.create({
          data: {
            alertType,
            severity,
            title: invoice.amountPaid.gt(0)
              ? 'Partially Paid Overdue Invoice'
              : 'Overdue Invoice',
            description:
              `Invoice ${invoice.invoiceNumber} is ${daysOverdue} days overdue. ` +
              `Outstanding amount: ${outstanding.toString()}.`,
            invoiceId: invoice.id,
            subscriptionId: invoice.subscriptionId,
          },
        });
      }

      leakageInvoices.push({
        invoiceId: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        customer: invoice.customer,
        subscriptionNumber: invoice.subscription.subscriptionNumber,
        total: invoice.total,
        amountPaid: invoice.amountPaid,
        outstanding,
        dueDate: invoice.dueDate,
        daysOverdue,
        severity,
      });
    }

    return {
      summary: {
        overdueInvoices: leakageInvoices.length,
        totalOutstanding,
      },
      invoices: leakageInvoices,
    };
  }

  async getAlerts(customerId?: string) {
    return prisma.revenueAlert.findMany({
      where: {
        isResolved: false,
        ...(customerId && {
          invoice: { customerId },
        }),
      },
      include: {
        invoice: {
          select: {
            invoiceNumber: true,
            total: true,
            amountPaid: true,
            dueDate: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}

export default new LeakageService();