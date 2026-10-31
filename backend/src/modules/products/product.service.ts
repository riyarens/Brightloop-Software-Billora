
import { prisma } from '../../config/prisma';
import { ProductType, Prisma } from '@prisma/client';
import {
  BadRequestError,
  NotFoundError,
  ConflictError,
} from '../../utils/errors';

// CREATE PRODUCT
export const createProduct = async (data: {
  name: string;
  code?: string;
  description?: string;
  type?: ProductType;
  salesPrice: number;
  costPrice?: number;
  notes?: string;
}) => {
  if (data.salesPrice < 0 || (data.costPrice ?? 0) < 0) {
    throw new BadRequestError('Prices cannot be negative');
  }

  try {
    return await prisma.product.create({
      data: {
        ...data,
        salesPrice: new Prisma.Decimal(data.salesPrice),
        costPrice: new Prisma.Decimal(data.costPrice ?? 0),
      },
    });
  } catch (error: any) {
    if (error.code === 'P2002') {
      throw new ConflictError('Product code already exists');
    }
    throw error;
  }
};

// GET ALL PRODUCTS
export const getProducts = async (filters: {
  search?: string;
  type?: ProductType;
  page?: number;
  limit?: number;
}) => {
  const page = Math.max(1, filters.page ?? 1);
  const limit = Math.min(100, Math.max(1, filters.limit ?? 10));

  const where: Prisma.ProductWhereInput = {
    isActive: true,
    ...(filters.type ? { type: filters.type } : {}),
    ...(filters.search
      ? {
          OR: [
            {
              name: {
                contains: filters.search,
                mode: 'insensitive',
              },
            },
            {
              code: {
                contains: filters.search,
                mode: 'insensitive',
              },
            },
          ],
        }
      : {}),
  };

  const [products, total] = await prisma.$transaction([
    prisma.product.findMany({
      where,
      include: { variants: true },
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.product.count({ where }),
  ]);

  return {
    products,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
};

// GET PRODUCT BY ID
export const getProductById = async (id: string) => {
  const product = await prisma.product.findUnique({
    where: { id },
    include: { variants: true },
  });

  if (!product) {
    throw new NotFoundError('Product not found');
  }

  return product;
};

// UPDATE PRODUCT
export const updateProduct = async (
  id: string,
  data: Partial<{
    name: string;
    code: string;
    description: string;
    type: ProductType;
    salesPrice: number;
    costPrice: number;
    notes: string;
    isActive: boolean;
  }>
) => {
  await getProductById(id);

  if (
    (data.salesPrice !== undefined && data.salesPrice < 0) ||
    (data.costPrice !== undefined && data.costPrice < 0)
  ) {
    throw new BadRequestError('Prices cannot be negative');
  }

  const updateData: Prisma.ProductUpdateInput = {
    ...data,
    ...(data.salesPrice !== undefined
      ? { salesPrice: new Prisma.Decimal(data.salesPrice) }
      : {}),
    ...(data.costPrice !== undefined
      ? { costPrice: new Prisma.Decimal(data.costPrice) }
      : {}),
  };

  try {
    return await prisma.product.update({
      where: { id },
      data: updateData,
    });
  } catch (error: any) {
    if (error.code === 'P2002') {
      throw new ConflictError('Product code already exists');
    }
    throw error;
  }
};

// DELETE PRODUCT (SOFT DELETE)
export const deleteProduct = async (id: string) => {
  await getProductById(id);

  return prisma.product.update({
    where: { id },
    data: { isActive: false },
  });
};
