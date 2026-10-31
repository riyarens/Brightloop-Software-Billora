import {
  BillingPeriod,
  Prisma,
  Role,
  SubscriptionEventType,
  SubscriptionStatus,
} from '@prisma/client';
import prisma from '../../config/prisma';
import {
  CreateSubscriptionInput,
  GetSubscriptionsQuery,
  SubscriptionLineInput,
  UpdateSubscriptionInput,
} from './subscription.validation';
import {
  BadRequestError,
  ForbiddenError,
  NotFoundError,
} from '../../utils/errors';
import { AuthUser } from '../../types/express';
import { calculateLinePricing } from '../../utils/pricing';

export class SubscriptionService {
  /**
   * Concurrency-safe unique subscription number generator (e.g. SUB-0001, SUB-0002)
   */
  async generateSubscriptionNumber(tx: Prisma.TransactionClient): Promise<string> {
    const lastSub = await tx.subscription.findFirst({
      orderBy: { createdAt: 'desc' },
      select: { subscriptionNumber: true },
    });

    let nextNumber = 1;
    if (lastSub?.subscriptionNumber && lastSub.subscriptionNumber.startsWith('SUB-')) {
      const parts = lastSub.subscriptionNumber.split('-');
      const num = parseInt(parts[1], 10);
      if (!isNaN(num)) {
        nextNumber = num + 1;
      }
    }

    return `SUB-${String(nextNumber).padStart(4, '0')}`;
  }

  /**
   * Calculate next billing date based on plan's billing period and interval
   */
  calculateNextBillingDate(
    startDate: Date,
    billingPeriod: BillingPeriod,
    billingInterval = 1
  ): Date {
    const nextDate = new Date(startDate);
    const interval = Math.max(1, billingInterval);

    switch (billingPeriod) {
      case BillingPeriod.DAILY:
        nextDate.setDate(nextDate.getDate() + interval);
        break;
      case BillingPeriod.WEEKLY:
        nextDate.setDate(nextDate.getDate() + interval * 7);
        break;
      case BillingPeriod.MONTHLY:
        nextDate.setMonth(nextDate.getMonth() + interval);
        break;
      case BillingPeriod.YEARLY:
        nextDate.setFullYear(nextDate.getFullYear() + interval);
        break;
    }

    return nextDate;
  }

  /**
   * Helper to resolve pricing and financial totals for line items using pricing.ts adapter
   */
  async resolveLinePricing(lines: SubscriptionLineInput[]) {
    return Promise.all(
      lines.map(async (line) => {
        // 1. Fetch Product
        const product = await prisma.product.findUnique({
          where: { id: line.productId },
        });
        if (!product || !product.isActive) {
          throw new BadRequestError(`Product with ID ${line.productId} not found or inactive`);
        }

        // 2. Fetch Variant (if specified)
        let extraPrice = new Prisma.Decimal(0);
        if (line.variantId) {
          const variant = await prisma.variant.findUnique({
            where: { id: line.variantId },
          });
          if (!variant || !variant.isActive) {
            throw new BadRequestError(`Variant with ID ${line.variantId} not found or inactive`);
          }
          if (variant.productId !== line.productId) {
            throw new BadRequestError(`Variant does not belong to product ${product.name}`);
          }
          extraPrice = variant.extraPrice;
        }

        // 3. Fetch Tax (if specified)
        let taxRate = new Prisma.Decimal(0);
        let isIncludedInPrice = false;
        if (line.taxId) {
          const tax = await prisma.tax.findUnique({
            where: { id: line.taxId },
          });
          if (!tax || !tax.isActive) {
            throw new BadRequestError(`Tax with ID ${line.taxId} not found or inactive`);
          }
          taxRate = tax.rate;
          isIncludedInPrice = tax.isIncludedInPrice;
        }

        // 4. Fetch Discount (if specified)
        let discountValue = new Prisma.Decimal(0);
        let discountType: 'PERCENTAGE' | 'FIXED' = 'PERCENTAGE';
        if (line.discountId) {
          const discount = await prisma.discount.findUnique({
            where: { id: line.discountId },
          });
          if (!discount || !discount.isActive) {
            throw new BadRequestError(`Discount with ID ${line.discountId} not found or inactive`);
          }
          discountValue = discount.value;
          discountType = discount.type;
        }

        // Base unit price: provided price or product's salesPrice
        const unitPrice = line.unitPrice !== undefined
          ? new Prisma.Decimal(line.unitPrice)
          : product.salesPrice;

        // Call shared pricing adapter
        const calculation = calculateLinePricing({
          unitPrice,
          quantity: line.quantity,
          extraPrice,
          taxRate,
          isIncludedInPrice,
          discountValue,
          discountType,
        });

        return {
          productId: line.productId,
          variantId: line.variantId || null,
          description: line.description || product.name,
          quantity: line.quantity,
          unitPrice: calculation.unitPriceWithVariant,
          taxId: line.taxId || null,
          taxRate: calculation.taxAmount.greaterThan(0) ? taxRate : new Prisma.Decimal(0),
          discountId: line.discountId || null,
          discountAmount: calculation.discountAmount,
          total: calculation.total,
        };
      })
    );
  }

  /**
   * Create a new Subscription
   */
  async createSubscription(input: CreateSubscriptionInput, user: AuthUser) {
    // 1. Verify Customer
    const customer = await prisma.customer.findUnique({
      where: { id: input.customerId },
    });
    if (!customer || !customer.isActive) {
      throw new BadRequestError('Customer not found or inactive');
    }

    // 2. Verify Plan
    const plan = await prisma.plan.findUnique({
      where: { id: input.planId },
    });
    if (!plan || !plan.isActive) {
      throw new BadRequestError('Plan not found or inactive');
    }

    // 3. Verify Minimum Quantity across lines
    const totalQuantity = input.lines.reduce((sum, line) => sum + line.quantity, 0);
    if (totalQuantity < plan.minQuantity) {
      throw new BadRequestError(
        `Total quantity (${totalQuantity}) does not satisfy plan minimum quantity (${plan.minQuantity})`
      );
    }

    // 4. Calculate line pricings
    const resolvedLines = await this.resolveLinePricing(input.lines);

    const startDate = input.startDate ? new Date(input.startDate) : new Date();
    const expiryDate = input.expiryDate ? new Date(input.expiryDate) : null;
    const initialStatus = input.status || SubscriptionStatus.DRAFT;

    // Next billing date if starting in ACTIVE state
    const nextBillingDate =
      initialStatus === SubscriptionStatus.ACTIVE
        ? this.calculateNextBillingDate(startDate, plan.billingPeriod, plan.billingInterval)
        : null;

    // 5. Concurrency-safe transactional creation
    const subscription = await prisma.$transaction(async (tx) => {
      const subscriptionNumber = await this.generateSubscriptionNumber(tx);

      const createdSub = await tx.subscription.create({
        data: {
          subscriptionNumber,
          customerId: input.customerId,
          planId: input.planId,
          quotationId: input.quotationId || null,
          status: initialStatus,
          startDate,
          expiryDate,
          nextBillingDate,
          paymentTerms: input.paymentTerms || 'Immediate Payment',
          autoRenew: input.autoRenew !== undefined ? input.autoRenew : true,
          notes: input.notes,
          lines: {
            create: resolvedLines,
          },
          events: {
            create: [
              {
                previousStatus: null,
                newStatus: initialStatus,
                eventType: SubscriptionEventType.CREATED,
                note: 'Subscription created',
                userId: user.id,
              },
              ...(initialStatus === SubscriptionStatus.ACTIVE
                ? [
                    {
                      previousStatus: SubscriptionStatus.DRAFT,
                      newStatus: SubscriptionStatus.ACTIVE,
                      eventType: SubscriptionEventType.ACTIVATED,
                      note: 'Subscription activated upon creation',
                      userId: user.id,
                    },
                  ]
                : []),
            ],
          },
        },
        include: {
          customer: true,
          plan: true,
          lines: {
            include: {
              product: true,
              variant: true,
              tax: true,
              discount: true,
            },
          },
          events: {
            orderBy: { timestamp: 'desc' },
          },
        },
      });

      return createdSub;
    });

    return subscription;
  }

  /**
   * Get paginated subscriptions list (ADMIN, STAFF)
   */
  async getSubscriptions(query: GetSubscriptionsQuery, user: AuthUser) {
    const page = Math.max(1, parseInt(query.page || '1', 10));
    const limit = Math.max(1, Math.min(100, parseInt(query.limit || '10', 10)));
    const skip = (page - 1) * limit;

    const where: Prisma.SubscriptionWhereInput = {};

    // Customer can only view their own subscriptions
    if (user.role === Role.CUSTOMER) {
      if (!user.customerId) {
        return { data: [], meta: { page: 1, limit, total: 0, totalPages: 0 } };
      }
      where.customerId = user.customerId;
    } else {
      if (query.customerId) {
        where.customerId = query.customerId;
      }
    }

    if (query.status) {
      where.status = query.status;
    }

    if (query.planId) {
      where.planId = query.planId;
    }

    if (query.search) {
      const searchTerm = query.search.trim();
      where.OR = [
        { subscriptionNumber: { contains: searchTerm, mode: 'insensitive' } },
        { customer: { name: { contains: searchTerm, mode: 'insensitive' } } },
        { customer: { email: { contains: searchTerm, mode: 'insensitive' } } },
      ];
    }

    const [subscriptions, total] = await Promise.all([
      prisma.subscription.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          customer: {
            select: { id: true, name: true, email: true, company: true },
          },
          plan: {
            select: { id: true, name: true, billingPeriod: true, price: true },
          },
          lines: {
            include: { product: true, variant: true },
          },
          _count: {
            select: { events: true, invoices: true },
          },
        },
      }),
      prisma.subscription.count({ where }),
    ]);

    return {
      data: subscriptions,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  /**
   * Get authenticated customer's own subscriptions
   */
  async getMySubscriptions(user: AuthUser, query: { page?: string; limit?: string }) {
    const customerId = user.customerId;
    if (user.role !== Role.CUSTOMER || !customerId) {
      throw new ForbiddenError('Customer portal access required');
    }

    return this.getSubscriptions(
      {
        page: query.page || '1',
        limit: query.limit || '10',
        customerId,
      },
      user
    );
  }

  /**
   * Get single subscription by ID with strict customer ownership verification
   */
  async getSubscriptionById(id: string, user: AuthUser) {
    const subscription = await prisma.subscription.findUnique({
      where: { id },
      include: {
        customer: true,
        plan: true,
        lines: {
          include: {
            product: true,
            variant: true,
            tax: true,
            discount: true,
          },
        },
        events: {
          orderBy: { timestamp: 'desc' },
          include: {
            user: {
              select: { id: true, email: true, firstName: true, lastName: true },
            },
          },
        },
        invoices: {
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
      },
    });

    if (!subscription) {
      throw new NotFoundError('Subscription not found');
    }

    // Ownership check for customers: must own this subscription
    if (user.role === Role.CUSTOMER) {
      if (subscription.customer.userId !== user.id && subscription.customerId !== user.customerId) {
        throw new ForbiddenError('Forbidden: You can only access your own subscriptions');
      }
    }

    return subscription;
  }

  /**
   * Update subscription (ADMIN and STAFF)
   */
  async updateSubscription(id: string, input: UpdateSubscriptionInput, user: AuthUser) {
    const existing = await prisma.subscription.findUnique({
      where: { id },
      include: { plan: true },
    });

    if (!existing) {
      throw new NotFoundError('Subscription not found');
    }

    if (existing.status === SubscriptionStatus.CLOSED) {
      throw new BadRequestError('Closed subscriptions cannot be modified');
    }

    let resolvedLines: any[] | undefined = undefined;
    if (input.lines && input.lines.length > 0) {
      const totalQuantity = input.lines.reduce((sum, line) => sum + line.quantity, 0);
      if (totalQuantity < existing.plan.minQuantity) {
        throw new BadRequestError(
          `Total quantity (${totalQuantity}) does not satisfy plan minimum quantity (${existing.plan.minQuantity})`
        );
      }
      resolvedLines = await this.resolveLinePricing(input.lines);
    }

    const updated = await prisma.$transaction(async (tx) => {
      // If lines updated, delete old lines and recreate
      if (resolvedLines) {
        await tx.subscriptionLine.deleteMany({
          where: { subscriptionId: id },
        });
      }

      const sub = await tx.subscription.update({
        where: { id },
        data: {
          paymentTerms: input.paymentTerms,
          autoRenew: input.autoRenew,
          notes: input.notes,
          startDate: input.startDate ? new Date(input.startDate) : undefined,
          expiryDate: input.expiryDate ? new Date(input.expiryDate) : undefined,
          ...(resolvedLines
            ? {
                lines: {
                  create: resolvedLines,
                },
              }
            : {}),
          events: {
            create: {
              previousStatus: existing.status,
              newStatus: existing.status,
              eventType: SubscriptionEventType.MODIFIED,
              note: 'Subscription details updated',
              userId: user.id,
            },
          },
        },
        include: {
          customer: true,
          plan: true,
          lines: {
            include: { product: true, variant: true },
          },
          events: {
            orderBy: { timestamp: 'desc' },
          },
        },
      });

      return sub;
    });

    return updated;
  }

  /**
   * Validate and transition subscription status
   * Valid Graph:
   * DRAFT -> QUOTATION, CONFIRMED, ACTIVE, CLOSED
   * QUOTATION -> CONFIRMED, CLOSED
   * CONFIRMED -> ACTIVE, CLOSED
   * ACTIVE -> CLOSED
   * CLOSED is terminal
   */
  async updateStatus(id: string, newStatus: SubscriptionStatus, note: string | undefined, user: AuthUser) {
    const subscription = await prisma.subscription.findUnique({
      where: { id },
      include: { plan: true, lines: true },
    });

    if (!subscription) {
      throw new NotFoundError('Subscription not found');
    }

    const currentStatus = subscription.status;

    if (currentStatus === newStatus) {
      return subscription;
    }

    if (currentStatus === SubscriptionStatus.CLOSED) {
      throw new BadRequestError('Cannot transition a closed subscription. CLOSED is a terminal state.');
    }

    // Valid state transitions
    const validTransitions: Record<SubscriptionStatus, SubscriptionStatus[]> = {
      [SubscriptionStatus.DRAFT]: [
        SubscriptionStatus.QUOTATION,
        SubscriptionStatus.CONFIRMED,
        SubscriptionStatus.ACTIVE,
        SubscriptionStatus.CLOSED,
      ],
      [SubscriptionStatus.QUOTATION]: [
        SubscriptionStatus.CONFIRMED,
        SubscriptionStatus.CLOSED,
      ],
      [SubscriptionStatus.CONFIRMED]: [
        SubscriptionStatus.ACTIVE,
        SubscriptionStatus.CLOSED,
      ],
      [SubscriptionStatus.ACTIVE]: [
        SubscriptionStatus.CLOSED,
      ],
      [SubscriptionStatus.CLOSED]: [],
    };

    const allowed = validTransitions[currentStatus] || [];
    if (!allowed.includes(newStatus)) {
      throw new BadRequestError(
        `Invalid status transition from ${currentStatus} to ${newStatus}. Allowed transitions: ${allowed.join(', ') || 'none'}`
      );
    }

    // Determine event type
    let eventType: SubscriptionEventType = SubscriptionEventType.MODIFIED;
    if (newStatus === SubscriptionStatus.CONFIRMED) eventType = SubscriptionEventType.CONFIRMED;
    if (newStatus === SubscriptionStatus.ACTIVE) eventType = SubscriptionEventType.ACTIVATED;
    if (newStatus === SubscriptionStatus.CLOSED) eventType = SubscriptionEventType.CLOSED;

    // If activating, calculate nextBillingDate if not already set
    let nextBillingDate = subscription.nextBillingDate;
    if (newStatus === SubscriptionStatus.ACTIVE && !nextBillingDate) {
      nextBillingDate = this.calculateNextBillingDate(
        subscription.startDate,
        subscription.plan.billingPeriod,
        subscription.plan.billingInterval
      );
    }

    const updated = await prisma.$transaction(async (tx) => {
      const sub = await tx.subscription.update({
        where: { id },
        data: {
          status: newStatus,
          nextBillingDate,
          isPaused: newStatus === SubscriptionStatus.CLOSED ? false : subscription.isPaused,
          events: {
            create: {
              previousStatus: currentStatus,
              newStatus,
              eventType,
              note: note || `Status transitioned from ${currentStatus} to ${newStatus}`,
              userId: user.id,
            },
          },
        },
        include: {
          customer: true,
          plan: true,
          lines: true,
          events: { orderBy: { timestamp: 'desc' } },
        },
      });

      return sub;
    });

    return updated;
  }

  /**
   * Pause active subscription (ADMIN, STAFF, or owning CUSTOMER)
   */
  async pauseSubscription(id: string, reason: string | undefined, user: AuthUser) {
    const subscription = await this.getSubscriptionById(id, user);

    if (subscription.status !== SubscriptionStatus.ACTIVE) {
      throw new BadRequestError('Only ACTIVE subscriptions can be paused');
    }

    if (subscription.isPaused) {
      throw new BadRequestError('Subscription is already paused');
    }

    // Plan policy check: allowPause
    if (!subscription.plan.allowPause) {
      throw new BadRequestError('The assigned subscription plan does not allow pausing');
    }

    const updated = await prisma.$transaction(async (tx) => {
      const sub = await tx.subscription.update({
        where: { id },
        data: {
          isPaused: true,
          pausedAt: new Date(),
          pauseCount: { increment: 1 },
          events: {
            create: {
              previousStatus: subscription.status,
              newStatus: subscription.status,
              eventType: SubscriptionEventType.PAUSED,
              note: reason || 'Subscription paused',
              userId: user.id,
            },
          },
        },
        include: {
          customer: true,
          plan: true,
          lines: true,
          events: { orderBy: { timestamp: 'desc' } },
        },
      });

      return sub;
    });

    return updated;
  }

  /**
   * Resume paused subscription (ADMIN, STAFF, or owning CUSTOMER)
   */
  async resumeSubscription(id: string, user: AuthUser) {
    const subscription = await this.getSubscriptionById(id, user);

    if (subscription.status !== SubscriptionStatus.ACTIVE) {
      throw new BadRequestError('Only ACTIVE subscriptions can be resumed');
    }

    if (!subscription.isPaused) {
      throw new BadRequestError('Subscription is not currently paused');
    }

    // Calculate pause duration to shift next billing date and expiry
    let shiftedNextBilling = subscription.nextBillingDate;
    let shiftedExpiry = subscription.expiryDate;

    if (subscription.pausedAt) {
      const pausedMs = Date.now() - new Date(subscription.pausedAt).getTime();
      const pausedDays = Math.max(1, Math.ceil(pausedMs / (1000 * 60 * 60 * 24)));

      if (shiftedNextBilling) {
        shiftedNextBilling = new Date(shiftedNextBilling.getTime() + pausedDays * 24 * 60 * 60 * 1000);
      }
      if (shiftedExpiry) {
        shiftedExpiry = new Date(shiftedExpiry.getTime() + pausedDays * 24 * 60 * 60 * 1000);
      }
    }

    const updated = await prisma.$transaction(async (tx) => {
      const sub = await tx.subscription.update({
        where: { id },
        data: {
          isPaused: false,
          pausedAt: null,
          nextBillingDate: shiftedNextBilling,
          expiryDate: shiftedExpiry,
          events: {
            create: {
              previousStatus: subscription.status,
              newStatus: subscription.status,
              eventType: SubscriptionEventType.RESUMED,
              note: 'Subscription resumed',
              userId: user.id,
            },
          },
        },
        include: {
          customer: true,
          plan: true,
          lines: true,
          events: { orderBy: { timestamp: 'desc' } },
        },
      });

      return sub;
    });

    return updated;
  }

  /**
   * Renew subscription for next billing period (ADMIN, STAFF)
   */
  async renewSubscription(id: string, user: AuthUser) {
    const subscription = await prisma.subscription.findUnique({
      where: { id },
      include: { plan: true },
    });

    if (!subscription) {
      throw new NotFoundError('Subscription not found');
    }

    if (subscription.status !== SubscriptionStatus.ACTIVE && subscription.status !== SubscriptionStatus.CONFIRMED) {
      throw new BadRequestError('Only ACTIVE or CONFIRMED subscriptions can be renewed');
    }

    // Plan policy check: allowRenew
    if (!subscription.plan.allowRenew) {
      throw new BadRequestError('The assigned subscription plan does not allow renewal');
    }

    // Shift expiry date forward by one billing interval
    const baseDate = subscription.expiryDate || subscription.startDate;
    const newExpiry = this.calculateNextBillingDate(
      baseDate,
      subscription.plan.billingPeriod,
      subscription.plan.billingInterval
    );

    const updated = await prisma.$transaction(async (tx) => {
      const sub = await tx.subscription.update({
        where: { id },
        data: {
          expiryDate: newExpiry,
          events: {
            create: {
              previousStatus: subscription.status,
              newStatus: subscription.status,
              eventType: SubscriptionEventType.RENEWED,
              note: `Subscription renewed until ${newExpiry.toISOString()}`,
              userId: user.id,
            },
          },
        },
        include: {
          customer: true,
          plan: true,
          lines: true,
          events: { orderBy: { timestamp: 'desc' } },
        },
      });

      return sub;
    });

    return updated;
  }

  /**
   * Early close subscription (ADMIN, STAFF)
   */
  async closeSubscription(id: string, reason: string | undefined, user: AuthUser) {
    const subscription = await prisma.subscription.findUnique({
      where: { id },
      include: { plan: true },
    });

    if (!subscription) {
      throw new NotFoundError('Subscription not found');
    }

    if (subscription.status === SubscriptionStatus.CLOSED) {
      throw new BadRequestError('Subscription is already closed');
    }

    // Plan policy check: allowEarlyClose
    if (!subscription.plan.allowEarlyClose) {
      throw new BadRequestError('The assigned subscription plan does not allow early closure');
    }

    const updated = await prisma.$transaction(async (tx) => {
      const sub = await tx.subscription.update({
        where: { id },
        data: {
          status: SubscriptionStatus.CLOSED,
          isPaused: false,
          events: {
            create: {
              previousStatus: subscription.status,
              newStatus: SubscriptionStatus.CLOSED,
              eventType: SubscriptionEventType.CLOSED,
              note: reason || 'Subscription closed early',
              userId: user.id,
            },
          },
        },
        include: {
          customer: true,
          plan: true,
          lines: true,
          events: { orderBy: { timestamp: 'desc' } },
        },
      });

      return sub;
    });

    return updated;
  }
}

export const subscriptionService = new SubscriptionService();
export default subscriptionService;
