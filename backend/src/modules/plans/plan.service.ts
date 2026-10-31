
import { Prisma, BillingPeriod } from '@prisma/client';
import prisma from '../../config/prisma';
import {
  BadRequestError,
  NotFoundError,
  ConflictError,
} from '../../utils/errors';

// Helper: validate plan dates and policies
const validatePlanData = (data: {
  startDate?: Date;
  endDate?: Date;
  allowPause?: boolean;
  maxPauseDurationDays?: number;
}) => {
  if (
    data.startDate &&
    data.endDate &&
    data.endDate <= data.startDate
  ) {
    throw new BadRequestError('End date must be after start date');
  }

  if (
    data.maxPauseDurationDays !== undefined &&
    data.allowPause === false &&
    data.maxPauseDurationDays > 0
  ) {
    throw new BadRequestError(
      'Maximum pause duration requires pause to be enabled'
    );
  }
};

// 1. Create a plan

export const createPlan = async (data: {
  name: string;
  code?: string;
  description?: string;
  billingPeriod?: BillingPeriod;
  billingInterval?: number;
  price?: number;
  minQuantity?: number;
  startDate?: Date;
  endDate?: Date;
  autoClose?: boolean;
  allowPause?: boolean;
  maxPauseDurationDays?: number;
  allowRenew?: boolean;
  allowEarlyClose?: boolean;
  isActive?: boolean;
  products?: {
    productId: string;
    defaultQuantity?: number;
    isMandatory?: boolean;
  }[];
}) => {
  const { products = [], ...planData } = data;

  validatePlanData(planData);

  if (planData.price !== undefined && planData.price < 0) {
    throw new BadRequestError('Plan price cannot be negative');
  }

  // Prevent duplicate products in the same request
  const productIds = products.map((item) => item.productId);
  const uniqueProductIds = [...new Set(productIds)];

  if (uniqueProductIds.length !== productIds.length) {
    throw new BadRequestError(
      'Duplicate products cannot be added to the same plan'
    );
  }

  // Check that all supplied products exist and are active
  if (uniqueProductIds.length > 0) {
    const existingProducts = await prisma.product.findMany({
      where: {
        id: { in: uniqueProductIds },
        isActive: true,
      },
      select: { id: true },
    });

    if (existingProducts.length !== uniqueProductIds.length) {
      throw new NotFoundError(
        'One or more products were not found or are inactive'
      );
    }
  }

  try {
    return await prisma.plan.create({
      data: {
        name: planData.name.trim(),
        code: planData.code,
        description: planData.description,
        billingPeriod:
          planData.billingPeriod ?? BillingPeriod.MONTHLY,
        billingInterval: planData.billingInterval ?? 1,
        price: new Prisma.Decimal(planData.price ?? 0),
        minQuantity: planData.minQuantity ?? 1,
        startDate: planData.startDate,
        endDate: planData.endDate,
        autoClose: planData.autoClose,
        allowPause: planData.allowPause,
        maxPauseDurationDays: planData.maxPauseDurationDays,
        allowRenew: planData.allowRenew,
        allowEarlyClose: planData.allowEarlyClose,
        isActive: planData.isActive,

        // Create associated products together with the plan
        ...(products.length > 0 && {
          planProducts: {
            create: products.map((item) => ({
              productId: item.productId,
              defaultQuantity: item.defaultQuantity ?? 1,
              isMandatory: item.isMandatory ?? false,
            })),
          },
        }),
      },
      include: {
        planProducts: {
          include: { product: true },
        },
      },
    });
  } catch (error: any) {
    if (error.code === 'P2002') {
      throw new ConflictError(
        'A plan with this code already exists'
      );
    }
    throw error;
  }
};


// 2. Get all active plans with pagination and search
export const getPlans = async (filters: {
  search?: string;
  billingPeriod?: BillingPeriod;
  page?: number;
  limit?: number;
}) => {
  const page = Math.max(1, filters.page ?? 1);
  const limit = Math.min(100, Math.max(1, filters.limit ?? 10));

  const where: Prisma.PlanWhereInput = {
    isActive: true,
  };

  if (filters.billingPeriod) {
    where.billingPeriod = filters.billingPeriod;
  }

  if (filters.search) {
    where.OR = [
      { name: { contains: filters.search, mode: 'insensitive' } },
      { code: { contains: filters.search, mode: 'insensitive' } },
    ];
  }

  const [plans, total] = await prisma.$transaction([
    prisma.plan.findMany({
      where,
      include: {
        planProducts: {
          include: { product: true },
        },
      },
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.plan.count({ where }),
  ]);

  return {
    plans,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
};

// 3. Get a plan by ID
export const getPlanById = async (id: string) => {
  const plan = await prisma.plan.findUnique({
    where: { id },
    include: {
      planProducts: {
        include: { product: true },
      },
    },
  });

  if (!plan) {
    throw new NotFoundError('Plan not found');
  }

  return plan;
};

// 4. Update a plan
export const updatePlan = async (
  id: string,
  data: {
    name?: string;
    code?: string;
    description?: string;
    billingPeriod?: BillingPeriod;
    billingInterval?: number;
    price?: number;
    minQuantity?: number;
    startDate?: Date;
    endDate?: Date;
    autoClose?: boolean;
    allowPause?: boolean;
    maxPauseDurationDays?: number;
    allowRenew?: boolean;
    allowEarlyClose?: boolean;
    isActive?: boolean;
  }
) => {
  const existingPlan = await getPlanById(id);

  validatePlanData({
    startDate: data.startDate ?? existingPlan.startDate ?? undefined,
    endDate: data.endDate ?? existingPlan.endDate ?? undefined,
    allowPause: data.allowPause ?? existingPlan.allowPause,
    maxPauseDurationDays:
      data.maxPauseDurationDays ??
      existingPlan.maxPauseDurationDays ??
      undefined,
  });

  if (data.price !== undefined && data.price < 0) {
    throw new BadRequestError('Plan price cannot be negative');
  }

  try {
    return await prisma.plan.update({
      where: { id },
      data: {
        ...data,
        name: data.name?.trim(),
        price:
          data.price !== undefined
            ? new Prisma.Decimal(data.price)
            : undefined,
      },
      include: {
        planProducts: {
          include: { product: true },
        },
      },
    });
  } catch (error: any) {
    if (error.code === 'P2002') {
      throw new ConflictError('A plan with this code already exists');
    }
    throw error;
  }
};

// 5. Soft-delete a plan
export const deletePlan = async (id: string) => {
  await getPlanById(id);

  return prisma.plan.update({
    where: { id },
    data: { isActive: false },
  });
};

// 6. Add a product to a plan
export const addProductToPlan = async (
  planId: string,
  data: {
    productId: string;
    defaultQuantity?: number;
    isMandatory?: boolean;
  }
) => {
  await getPlanById(planId);

  const product = await prisma.product.findUnique({
    where: { id: data.productId },
  });

  if (!product || !product.isActive) {
    throw new NotFoundError('Active product not found');
  }

  try {
    return await prisma.planProduct.create({
      data: {
        planId,
        productId: data.productId,
        defaultQuantity: data.defaultQuantity ?? 1,
        isMandatory: data.isMandatory ?? false,
      },
      include: { product: true },
    });
  } catch (error: any) {
    if (error.code === 'P2002') {
      throw new ConflictError('This product is already added to the plan');
    }
    throw error;
  }
};

// 7. Update a product associated with a plan
export const updatePlanProduct = async (
  planId: string,
  productId: string,
  data: {
    defaultQuantity?: number;
    isMandatory?: boolean;
  }
) => {
  const existing = await prisma.planProduct.findUnique({
    where: {
      planId_productId: { planId, productId },
    },
  });

  if (!existing) {
    throw new NotFoundError('Product is not associated with this plan');
  }

  return prisma.planProduct.update({
    where: {
      planId_productId: { planId, productId },
    },
    data,
    include: { product: true },
  });
};

// 8. Remove a product from a plan
export const removeProductFromPlan = async (
  planId: string,
  productId: string
) => {
  const existing = await prisma.planProduct.findUnique({
    where: {
      planId_productId: { planId, productId },
    },
  });

  if (!existing) {
    throw new NotFoundError('Product is not associated with this plan');
  }

  await prisma.planProduct.delete({
    where: {
      planId_productId: { planId, productId },
    },
  });

  return { message: 'Product removed from plan successfully' };
};
