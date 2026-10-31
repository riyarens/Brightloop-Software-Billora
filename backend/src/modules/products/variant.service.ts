
import { Prisma } from '@prisma/client';
import prisma from '../../config/prisma';
import {
  BadRequestError,
  NotFoundError,
  ConflictError,
} from '../../utils/errors';

// CREATE VARIANT
export const createVariant = async (
  productId: string,
  data: {
    brand: string;
    name?: string;
    extraPrice?: number;
    sku?: string;
  }
) => {
  const product = await prisma.product.findUnique({
    where: { id: productId },
  });

  if (!product || !product.isActive) {
    throw new NotFoundError('Active product not found');
  }

  if (!data.brand.trim()) {
    throw new BadRequestError('Brand is required');
  }

  if ((data.extraPrice ?? 0) < 0) {
    throw new BadRequestError('Extra price cannot be negative');
  }

  try {
    return await prisma.variant.create({
      data: {
        productId,
        brand: data.brand.trim(),
        name: data.name,
        sku: data.sku,
        extraPrice: new Prisma.Decimal(data.extraPrice ?? 0),
      },
    });
  } catch (error: any) {
    if (error.code === 'P2002') {
      throw new ConflictError('Variant already exists');
    }
    throw error;
  }
};

// GET VARIANTS BY PRODUCT
export const getVariantsByProduct = async (productId: string) => {
  const product = await prisma.product.findUnique({
    where: { id: productId },
  });

  if (!product) {
    throw new NotFoundError('Product not found');
  }

  return prisma.variant.findMany({
    where: {
      productId,
      isActive: true,
    },
    orderBy: { createdAt: 'desc' },
  });
};

// GET VARIANT BY ID
export const getVariantById = async (id: string) => {
  const variant = await prisma.variant.findUnique({
    where: { id },
  });

  if (!variant) {
    throw new NotFoundError('Variant not found');
  }

  return variant;
};

// UPDATE VARIANT
export const updateVariant = async (
  id: string,
  data: {
    brand?: string;
    name?: string;
    extraPrice?: number;
    sku?: string;
    isActive?: boolean;
  }
) => {
  await getVariantById(id);

  if (data.brand !== undefined && !data.brand.trim()) {
    throw new BadRequestError('Brand cannot be empty');
  }

  if (data.extraPrice !== undefined && data.extraPrice < 0) {
    throw new BadRequestError('Extra price cannot be negative');
  }

  return prisma.variant.update({
    where: { id },
    data: {
      ...data,
      ...(data.brand !== undefined ? { brand: data.brand.trim() } : {}),
      ...(data.extraPrice !== undefined
        ? { extraPrice: new Prisma.Decimal(data.extraPrice) }
        : {}),
    },
  });
};

// SOFT DELETE VARIANT
export const deleteVariant = async (id: string) => {
  await getVariantById(id);

  return prisma.variant.update({
    where: { id },
    data: { isActive: false },
  });
};
