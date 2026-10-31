import { Prisma, SubscriptionStatus, InvoiceStatus, PaymentStatus } from '@prisma/client';
import prisma from '../../config/prisma';

export class ReportsService {
  async getDashboardReport(from?: string, to?: string) {
    const now = new Date();
    const fromDate = from ? new Date(from) : undefined;
    const toDate = to ? new Date(to) : undefined;

    // 1. Active Subscriptions count
    const activeSubs = await prisma.subscription.findMany({
      where: { status: SubscriptionStatus.ACTIVE },
      include: {
        lines: true,
        plan: true,
      },
    });

    const activeSubscriptionsCount = activeSubs.length;

    // 2. Monthly Recurring Revenue (MRR)
    let mrr = 0;
    for (const sub of activeSubs) {
      const subTotal = sub.lines.reduce(
        (sum, l) => sum + Number(l.total),
        0
      );
      if (sub.plan) {
        if (sub.plan.billingPeriod === 'MONTHLY') {
          mrr += subTotal / (sub.plan.billingInterval || 1);
        } else if (sub.plan.billingPeriod === 'YEARLY') {
          mrr += subTotal / 12;
        } else if (sub.plan.billingPeriod === 'WEEKLY') {
          mrr += (subTotal * 52) / 12;
        } else if (sub.plan.billingPeriod === 'DAILY') {
          mrr += subTotal * 30;
        } else {
          mrr += subTotal;
        }
      } else {
        mrr += subTotal;
      }
    }

    // 3. Payments Received
    const paymentWhere: Prisma.PaymentWhereInput = {
      status: PaymentStatus.SUCCESS,
    };
    if (fromDate || toDate) {
      paymentWhere.paymentDate = {};
      if (fromDate) paymentWhere.paymentDate.gte = fromDate;
      if (toDate) paymentWhere.paymentDate.lte = toDate;
    }

    const payments = await prisma.payment.findMany({
      where: paymentWhere,
    });
    const totalPayments = payments.reduce((sum, p) => sum + Number(p.amount), 0);

    // 4. Outstanding & Overdue Invoices
    const unpaidInvoices = await prisma.invoice.findMany({
      where: {
        status: { in: [InvoiceStatus.CONFIRMED, InvoiceStatus.SENT] },
      },
    });

    let outstanding = 0;
    let overdueInvoices = 0;
    for (const inv of unpaidInvoices) {
      const remaining = Number(inv.total) - Number(inv.amountPaid);
      if (remaining > 0) {
        outstanding += remaining;
        if (new Date(inv.dueDate) < now) {
          overdueInvoices++;
        }
      }
    }

    // 5. Renewal Risk
    const fourteenDaysLater = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
    const renewalRisk = await prisma.subscription.count({
      where: {
        status: SubscriptionStatus.ACTIVE,
        OR: [
          { isPaused: true },
          { autoRenew: false },
          { expiryDate: { lte: fourteenDaysLater } },
        ],
      },
    });

    // 6. Revenue by Month (Last 6 Months)
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const revenueByMonthMap = new Map<string, number>();

    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${monthNames[d.getMonth()]} ${d.getFullYear().toString().slice(2)}`;
      revenueByMonthMap.set(key, 0);
    }

    const allSuccessfulPayments = await prisma.payment.findMany({
      where: { status: PaymentStatus.SUCCESS },
      select: { amount: true, paymentDate: true },
    });

    for (const p of allSuccessfulPayments) {
      const d = new Date(p.paymentDate);
      const key = `${monthNames[d.getMonth()]} ${d.getFullYear().toString().slice(2)}`;
      if (revenueByMonthMap.has(key)) {
        revenueByMonthMap.set(key, (revenueByMonthMap.get(key) || 0) + Number(p.amount));
      }
    }

    const revenueByMonth = Array.from(revenueByMonthMap.entries()).map(([month, revenue]) => ({
      month,
      revenue,
    }));

    // 7. Revenue by Plan
    const plansWithSubs = await prisma.plan.findMany({
      include: {
        subscriptions: {
          include: {
            lines: true,
          },
        },
      },
    });

    const revenueByPlan = plansWithSubs.map((p) => {
      const planRevenue = p.subscriptions.reduce((sum, s) => {
        return sum + s.lines.reduce((lSum, l) => lSum + Number(l.total), 0);
      }, 0);
      return {
        name: p.name,
        revenue: planRevenue,
      };
    });

    // 8. Invoice Status Distribution
    const invoiceStatuses = await prisma.invoice.groupBy({
      by: ['status'],
      _count: { status: true },
    });

    const invoiceStatus = invoiceStatuses.map((s) => ({
      name: s.status,
      value: s._count.status,
    }));

    // 9. Subscription Growth
    const subscriptionGrowthMap = new Map<string, number>();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${monthNames[d.getMonth()]} ${d.getFullYear().toString().slice(2)}`;
      subscriptionGrowthMap.set(key, 0);
    }

    const allSubs = await prisma.subscription.findMany({
      select: { createdAt: true },
    });

    for (const sub of allSubs) {
      const d = new Date(sub.createdAt);
      const key = `${monthNames[d.getMonth()]} ${d.getFullYear().toString().slice(2)}`;
      if (subscriptionGrowthMap.has(key)) {
        subscriptionGrowthMap.set(key, (subscriptionGrowthMap.get(key) || 0) + 1);
      }
    }

    const subscriptionGrowth = Array.from(subscriptionGrowthMap.entries()).map(([month, subscriptions]) => ({
      month,
      subscriptions,
    }));

    return {
      stats: {
        activeSubscriptions: activeSubscriptionsCount,
        mrr: Math.round(mrr),
        totalPayments: Math.round(totalPayments),
        outstanding: Math.round(outstanding),
        overdueInvoices,
        renewalRisk,
      },
      revenueByMonth,
      revenueByPlan,
      invoiceStatus,
      subscriptionGrowth,
    };
  }
}

export const reportsService = new ReportsService();
export default reportsService;

