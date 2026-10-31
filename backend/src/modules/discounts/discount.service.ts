
import { DiscountType, Prisma } from '@prisma/client';
import prisma from '../../config/prisma';
import { BadRequestError, NotFoundError } from '../../utils/errors';

interface CreateDiscountInput {
  name: string;
  code?: string | null;
  type: DiscountType;
  value: number;
  startDate?: Date | null;
  endDate?: Date | null;
  minOrderAmount?: number | null;
  isActive?: boolean;
}

interface UpdateDiscountInput {
  name?: string;
  code?: string | null;
  type?: DiscountType;
  value?: number;
  startDate?: Date | null;
  endDate?: Date | null;
  minOrderAmount?: number | null;
  isActive?: boolean;
}

interface DiscountQuery {
  search?: string;
  type?: DiscountType;
  isActive?: boolean;
  page?: number;
  limit?: number;
}

const validateDiscount = (type: DiscountType, value: number) => {
  if (!Number.isFinite(value) || value <= 0) {
    throw new BadRequestError('Discount value must be positive');
  }

  if (type === DiscountType.PERCENTAGE && value > 100) {
    throw new BadRequestError('Percentage discount cannot exceed 100%');
  }
};

export const createDiscount = async (data: CreateDiscountInput) => {
  validateDiscount(data.type, data.value);

  if (data.startDate && data.endDate && data.endDate < data.startDate) {
    throw new BadRequestError('End date must be after start date');
  }

  if (data.minOrderAmount != null && data.minOrderAmount < 0) {
    throw new BadRequestError('Minimum order amount cannot be negative');
  }

  return prisma.discount.create({
    data: {
      name: data.name,
      code: data.code,
      type: data.type,
      value: new Prisma.Decimal(data.value),
      startDate: data.startDate,
      endDate: data.endDate,
      minOrderAmount:
        data.minOrderAmount != null
          ? new Prisma.Decimal(data.minOrderAmount)
          : null,
      isActive: data.isActive ?? true,
    },
  });
};

export const getDiscounts = async (query: DiscountQuery) => {
  const page = query.page ?? 1;
  const limit = query.limit ?? 10;

  const where: Prisma.DiscountWhereInput = {
    ...(query.type && { type: query.type }),
    ...(query.isActive !== undefined && { isActive: query.isActive }),
    ...(query.search && {
      OR: [
        { name: { contains: query.search, mode: 'insensitive' } },
        { code: { contains: query.search, mode: 'insensitive' } },
      ],
    }),
  };

  const [discounts, total] = await Promise.all([
    prisma.discount.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.discount.count({ where }),
  ]);

  return {
    discounts,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
};

export const getDiscountById = async (id: string) => {
  const discount = await prisma.discount.findUnique({
    where: { id },
  });

  if (!discount) {
    throw new NotFoundError('Discount not found');
  }

  return discount;
};

export const updateDiscount = async (
  id: string,
  data: UpdateDiscountInput
) => {
  const existing = await getDiscountById(id);

  const type = data.type ?? existing.type;
  const value = data.value ?? Number(existing.value);

  validateDiscount(type, value);

  const startDate =
    data.startDate === undefined ? existing.startDate : data.startDate;
  const endDate =
    data.endDate === undefined ? existing.endDate : data.endDate;

  if (startDate && endDate && endDate < startDate) {
    throw new BadRequestError('End date must be after start date');
  }

  if (data.minOrderAmount !== undefined && data.minOrderAmount !== null &&
      data.minOrderAmount < 0) {
    throw new BadRequestError('Minimum order amount cannot be negative');
  }

  return prisma.discount.update({
    where: { id },
    data: {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.code !== undefined && { code: data.code }),
      ...(data.type !== undefined && { type: data.type }),
      ...(data.value !== undefined && {
        value: new Prisma.Decimal(data.value),
      }),
      ...(data.startDate !== undefined && { startDate: data.startDate }),
      ...(data.endDate !== undefined && { endDate: data.endDate }),
      ...(data.minOrderAmount !== undefined && {
        minOrderAmount:
          data.minOrderAmount !== null
            ? new Prisma.Decimal(data.minOrderAmount)
            : null,
      }),
      ...(data.isActive !== undefined && { isActive: data.isActive }),
    },
  });
};

export const deactivateDiscount = async (id: string) => {
  await getDiscountById(id);

  return prisma.discount.update({
    where: { id },
    data: { isActive: false },
  });
};
