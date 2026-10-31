
import { Prisma, TaxType } from '@prisma/client';
import prisma from '../../config/prisma';
import {
  BadRequestError,
  NotFoundError,
  ConflictError,
} from '../../utils/errors';

interface CreateTaxInput {
  name: string;
  rate: number;
  type?: TaxType;
  isIncludedInPrice?: boolean;
  isActive?: boolean;
}

interface UpdateTaxInput {
  name?: string;
  rate?: number;
  type?: TaxType;
  isIncludedInPrice?: boolean;
  isActive?: boolean;
}

interface GetTaxesInput {
  search?: string;
  type?: TaxType;
  page?: number;
  limit?: number;
}


function validateTaxRate(rate: number, type?: TaxType) {
  if (!Number.isFinite(rate) || rate < 0) {
    throw new BadRequestError('Tax rate cannot be negative');
  }

  if (rate > 999.99) {
    throw new BadRequestError('Tax rate cannot exceed 999.99');
  }

  if (type === TaxType.PERCENTAGE && rate > 100) {
    throw new BadRequestError('Percentage tax rate cannot exceed 100');
  }
}


export async function createTax(input: CreateTaxInput) {
  const name = input.name.trim();

  if (!name) {
    throw new BadRequestError('Tax name is required');
  }

  const type = input.type ?? TaxType.PERCENTAGE;
  validateTaxRate(input.rate, type);

  try {
    return await prisma.tax.create({
      data: {
        name,
        rate: new Prisma.Decimal(input.rate),
        type,
        isIncludedInPrice: input.isIncludedInPrice ?? false,
        isActive: input.isActive ?? true,
      },
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new ConflictError('A tax with these unique details already exists');
    }
    throw error;
  }
}

export async function getTaxes(input: GetTaxesInput) {
  const page = input.page ?? 1;
  const limit = input.limit ?? 10;
  const skip = (page - 1) * limit;

  const where: Prisma.TaxWhereInput = {
    ...(input.search && {
      name: { contains: input.search, mode: 'insensitive' },
    }),
    ...(input.type && { type: input.type }),
  };

  const [taxes, total] = await prisma.$transaction([
    prisma.tax.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.tax.count({ where }),
  ]);

  return {
    taxes,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

export async function getTaxById(id: string) {
  const tax = await prisma.tax.findUnique({
    where: { id },
  });

  if (!tax) {
    throw new NotFoundError('Tax not found');
  }

  return tax;
}

export async function updateTax(id: string, input: UpdateTaxInput) {
  const existingTax = await getTaxById(id);

  if (input.name !== undefined && !input.name.trim()) {
    throw new BadRequestError('Tax name is required');
  }

  const type = input.type ?? existingTax.type;
  const rate = input.rate ?? Number(existingTax.rate);

  validateTaxRate(rate, type);

  return prisma.tax.update({
    where: { id },
    data: {
      ...(input.name !== undefined && { name: input.name.trim() }),
      ...(input.rate !== undefined && {
        rate: new Prisma.Decimal(input.rate),
      }),
      ...(input.type !== undefined && { type: input.type }),
      ...(input.isIncludedInPrice !== undefined && {
        isIncludedInPrice: input.isIncludedInPrice,
      }),
      ...(input.isActive !== undefined && { isActive: input.isActive }),
    },
  });
}

export async function deleteTax(id: string) {
  await getTaxById(id);

  return prisma.tax.update({
    where: { id },
    data: { isActive: false },
  });
}
