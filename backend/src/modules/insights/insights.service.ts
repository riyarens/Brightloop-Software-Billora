import { SubscriptionStatus, InvoiceStatus, PaymentStatus } from '@prisma/client';
import prisma from '../../config/prisma';

export class InsightsService {
  getChips(): string[] {
    return [
      'What is our Monthly Recurring Revenue?',
      'Show overdue invoices',
      'Which plans generate the most revenue?',
      'How many subscriptions are active?',
      'Show recent payments',
      'List our top customers',
    ];
  }

  async askAssistant(question: string) {
    const q = question.toLowerCase();

    // 1. MRR or Monthly Revenue
    if (q.includes('mrr') || q.includes('monthly recurring') || q.includes('recurring revenue')) {
      const activeSubs = await prisma.subscription.findMany({
        where: { status: SubscriptionStatus.ACTIVE },
        include: { lines: true, plan: true },
      });

      let mrr = 0;
      for (const sub of activeSubs) {
        const subTotal = sub.lines.reduce((sum, l) => sum + Number(l.total), 0);
        if (sub.plan?.billingPeriod === 'MONTHLY') {
          mrr += subTotal / (sub.plan.billingInterval || 1);
        } else if (sub.plan?.billingPeriod === 'YEARLY') {
          mrr += subTotal / 12;
        } else {
          mrr += subTotal;
        }
      }

      return {
        type: 'number',
        title: 'Monthly Recurring Revenue (MRR)',
        unit: '₹',
        data: Math.round(mrr),
      };
    }

    // 2. Overdue Invoices
    if (q.includes('overdue') || q.includes('unpaid') || q.includes('leakage')) {
      const now = new Date();
      const overdueList = await prisma.invoice.findMany({
        where: {
          status: { in: [InvoiceStatus.CONFIRMED, InvoiceStatus.SENT] },
          dueDate: { lt: now },
        },
        include: { customer: { select: { name: true } } },
        orderBy: { dueDate: 'asc' },
        take: 10,
      });

      const tableData = overdueList.map((inv) => ({
        invoice: inv.invoiceNumber,
        customer: inv.customer.name,
        total: Number(inv.total),
        paid: Number(inv.amountPaid),
        due: new Date(inv.dueDate).toLocaleDateString(),
        status: inv.status,
      }));

      return {
        type: 'table',
        title: 'Overdue Invoices Requiring Follow-Up',
        data: tableData,
      };
    }

    // 3. Plans
    if (q.includes('plan')) {
      const plans = await prisma.plan.findMany({
        include: {
          subscriptions: {
            where: { status: SubscriptionStatus.ACTIVE },
            include: { lines: true },
          },
        },
      });

      const tableData = plans.map((p) => {
        const activeCount = p.subscriptions.length;
        const totalRev = p.subscriptions.reduce((sum, s) => {
          return sum + s.lines.reduce((lSum, l) => lSum + Number(l.total), 0);
        }, 0);

        return {
          plan: p.name,
          period: p.billingPeriod,
          price: Number(p.price),
          activeSubscriptions: activeCount,
          totalRevenue: totalRev,
        };
      });

      return {
        type: 'table',
        title: 'Plan Performance & Revenue Metrics',
        data: tableData,
      };
    }

    // 4. Subscriptions
    if (q.includes('subscription')) {
      const subs = await prisma.subscription.findMany({
        include: {
          customer: { select: { name: true } },
          plan: { select: { name: true, billingPeriod: true } },
          lines: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
      });

      const tableData = subs.map((s) => ({
        number: s.subscriptionNumber,
        customer: s.customer.name,
        plan: s.plan.name,
        period: s.plan.billingPeriod,
        status: s.status,
        amount: s.lines.reduce((sum, l) => sum + Number(l.total), 0),
      }));

      return {
        type: 'table',
        title: 'Recent Subscriptions',
        data: tableData,
      };
    }

    // 5. Payments
    if (q.includes('payment') || q.includes('paid')) {
      const payments = await prisma.payment.findMany({
        include: {
          invoice: {
            include: { customer: { select: { name: true } } },
          },
        },
        orderBy: { paymentDate: 'desc' },
        take: 10,
      });

      const tableData = payments.map((p) => ({
        paymentNumber: p.paymentNumber,
        invoice: p.invoice.invoiceNumber,
        customer: p.invoice.customer.name,
        amount: Number(p.amount),
        method: p.paymentMethod,
        date: new Date(p.paymentDate).toLocaleDateString(),
        status: p.status,
      }));

      return {
        type: 'table',
        title: 'Recent Payment Transactions',
        data: tableData,
      };
    }

    // 6. Customers
    if (q.includes('customer')) {
      const customers = await prisma.customer.findMany({
        include: {
          _count: {
            select: { subscriptions: true, invoices: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
      });

      const tableData = customers.map((c) => ({
        name: c.name,
        email: c.email,
        company: c.company || '-',
        city: c.city || '-',
        subscriptions: c._count.subscriptions,
        invoices: c._count.invoices,
      }));

      return {
        type: 'table',
        title: 'Top Customer Accounts',
        data: tableData,
      };
    }

    // Fallback / Help
    return {
      type: 'help',
      title: 'I can answer questions regarding revenue, billing, and plans. Click one of these suggestions:',
      data: [
        'What is our Monthly Recurring Revenue?',
        'Show overdue invoices',
        'Which plans generate the most revenue?',
        'Show recent payments',
        'How many subscriptions are active?',
      ],
    };
  }
}

export const insightsService = new InsightsService();
export default insightsService;

