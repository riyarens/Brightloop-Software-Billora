import {
  BillingPeriod,
  InvoiceStatus,
  Prisma,
  SubscriptionStatus,
} from '@prisma/client';

import prisma from '../../config/prisma';
import { generateInvoiceNumber } from '../../utils/invoice_numbering';
import { calculateLinePricing } from '../../utils/pricing';

const addBillingPeriod = (
  date: Date,
  period: BillingPeriod,
  interval: number
): Date => {
  const result = new Date(date);

  switch (period) {
    case 'DAILY':
      result.setDate(result.getDate() + interval);
      break;

    case 'WEEKLY':
      result.setDate(result.getDate() + interval * 7);
      break;

    case 'MONTHLY': {
      const originalDay = result.getDate();
      result.setDate(1);
      result.setMonth(result.getMonth() + interval);

      const lastDay = new Date(
        result.getFullYear(),
        result.getMonth() + 1,
        0
      ).getDate();

      result.setDate(Math.min(originalDay, lastDay));
      break;
    }

    case 'YEARLY': {
      const originalMonth = result.getMonth();
      const originalDay = result.getDate();

      result.setDate(1);
      result.setFullYear(result.getFullYear() + interval);
      result.setMonth(originalMonth);

      const lastDay = new Date(
        result.getFullYear(),
        originalMonth + 1,
        0
      ).getDate();

      result.setDate(Math.min(originalDay, lastDay));
      break;
    }
  }

  return result;
};

const getDueDate = (paymentTerms: string): Date => {
  const dueDate = new Date();
  const match = paymentTerms.match(/(\d+)\s*days?/i);

  if (match) {
    dueDate.setDate(dueDate.getDate() + Number(match[1]));
  }

  return dueDate;
};

class BillingService {
  async previewDueSubscriptions() {
    const now = new Date();

    return prisma.subscription.findMany({
      where: {
        status: SubscriptionStatus.ACTIVE,
        isPaused: false,
        autoRenew: true,
        nextBillingDate: { lte: now },
        OR: [
          { expiryDate: null },
          { expiryDate: { gt: now } },
        ],
        plan: { isActive: true },
      },
      include: {
        customer: true,
        plan: true,
        lines: {
          include: {
            variant: true,
            tax: true,
            discount: true,
          },
        },
      },
      orderBy: { nextBillingDate: 'asc' },
    });
  }

  async generateDueInvoices() {
    const subscriptions = await this.previewDueSubscriptions();

    const results = {
      processed: 0,
      generated: 0,
      skipped: 0,
      failed: 0,
      invoices: [] as any[],
      errors: [] as string[],
    };

    for (const subscription of subscriptions) {
      results.processed++;

      try {
        const invoice = await prisma.$transaction(async (tx) => {
          const periodStart = subscription.nextBillingDate!;

          const existing = await tx.invoice.findFirst({
            where: {
              subscriptionId: subscription.id,
              billingPeriodStart: periodStart,
            },
          });

          if (existing) {
            results.skipped++;
            return null;
          }

          if (subscription.lines.length === 0) {
            throw new Error(
              `Subscription ${subscription.subscriptionNumber} has no billing lines`
            );
          }

          const periodEnd = addBillingPeriod(
            periodStart,
            subscription.plan.billingPeriod,
            subscription.plan.billingInterval
          );

          const invoiceLines = subscription.lines.map((line) => {
            const pricing = calculateLinePricing({
              unitPrice: line.unitPrice,
              quantity: line.quantity,
              extraPrice: line.variant?.extraPrice ?? 0,
              taxRate: line.taxRate,
              isIncludedInPrice:
                line.tax?.isIncludedInPrice ?? false,
              discountValue: line.discount?.value ?? 0,
              discountType:
                line.discount?.type ?? 'FIXED',
            });

            return {
              productId: line.productId,
              variantId: line.variantId,
              description: line.description,
              quantity: line.quantity,
              unitPrice: pricing.unitPriceWithVariant,
              taxId: line.taxId,
              taxRate: line.taxRate,
              discountId: line.discountId,
              discountAmount: pricing.discountAmount,
              total: pricing.total,
              subtotal: pricing.subtotal,
              taxAmount: pricing.taxAmount,
            };
          });

          const subtotal = invoiceLines.reduce(
            (sum, line) => sum.add(line.subtotal),
            new Prisma.Decimal(0)
          );

          const taxAmount = invoiceLines.reduce(
            (sum, line) => sum.add(line.taxAmount),
            new Prisma.Decimal(0)
          );

          const discountAmount = invoiceLines.reduce(
            (sum, line) => sum.add(line.discountAmount),
            new Prisma.Decimal(0)
          );

          const total = invoiceLines.reduce(
            (sum, line) => sum.add(line.total),
            new Prisma.Decimal(0)
          );

          const createdInvoice = await tx.invoice.create({
            data: {
              invoiceNumber: generateInvoiceNumber(),
              subscriptionId: subscription.id,
              customerId: subscription.customerId,
              billingPeriodStart: periodStart,
              billingPeriodEnd: periodEnd,
              dueDate: getDueDate(subscription.paymentTerms),
              subtotal,
              taxAmount,
              discountAmount,
              total,
              status: InvoiceStatus.CONFIRMED,
              notes: `Recurring invoice for ${subscription.subscriptionNumber}`,
              lines: {
                create: invoiceLines.map((line) => ({
                  productId: line.productId,
                  variantId: line.variantId,
                  description: line.description,
                  quantity: line.quantity,
                  unitPrice: line.unitPrice,
                  taxId: line.taxId,
                  taxRate: line.taxRate,
                  discountId: line.discountId,
                  discountAmount: line.discountAmount,
                  total: line.total,
                })),
              },
            },
            include: {
              customer: true,
              lines: true,
            },
          });

          await tx.subscription.update({
            where: { id: subscription.id },
            data: {
              lastBillingDate: periodStart,
              nextBillingDate: periodEnd,
            },
          });

          return createdInvoice;
        });

        if (invoice) {
          results.generated++;
          results.invoices.push(invoice);
        }
      } catch (error) {
        results.failed++;
        results.errors.push(
          `${subscription.subscriptionNumber}: ${
            error instanceof Error ? error.message : 'Unknown error'
          }`
        );
      }
    }

    return results;
  }
}

export default new BillingService();