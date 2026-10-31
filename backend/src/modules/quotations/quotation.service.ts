
import {
  Prisma,
  QuotationStatus,
  DiscountType,
  TaxType,
} from '@prisma/client';

import prisma from '../../config/prisma';
import { BadRequestError, NotFoundError } from '../../utils/errors';
import { calculateLinePricing } from '../../utils/pricing';

interface QuotationLineInput {
  productId: string;
  variantId?: string | null;
  description?: string | null;
  quantity: number;
  unitPrice: number;
  taxId?: string | null;
  discountId?: string | null;
}

interface CreateQuotationInput {
  customerId: string;
  planId?: string | null;
  templateId?: string | null;
  validUntil?: Date | null;
  termsAndConditions?: string | null;
  lines: QuotationLineInput[];
}

interface UpdateQuotationInput {
  customerId?: string;
  planId?: string | null;
  templateId?: string | null;
  status?: QuotationStatus;
  validUntil?: Date | null;
  termsAndConditions?: string | null;
  lines?: QuotationLineInput[];
}

interface QuotationQuery {
  search?: string;
  status?: QuotationStatus;
  customerId?: string;
  page?: number;
  limit?: number;
}

const calculateQuotationLines = async (
  tx: Prisma.TransactionClient,
  lines: QuotationLineInput[]
) => {
  const calculatedLines = [];

  let subtotal = new Prisma.Decimal(0);
  let taxAmount = new Prisma.Decimal(0);
  let discountAmount = new Prisma.Decimal(0);
  let total = new Prisma.Decimal(0);

  for (const line of lines) {
    const product = await tx.product.findUnique({
      where: { id: line.productId },
    });

    if (!product || !product.isActive) {
      throw new BadRequestError(
        `Product ${line.productId} not found or inactive`
      );
    }

    let extraPrice = new Prisma.Decimal(0);

    if (line.variantId) {
      const variant = await tx.variant.findUnique({
        where: { id: line.variantId },
      });

      if (
        !variant ||
        !variant.isActive ||
        variant.productId !== line.productId
      ) {
        throw new BadRequestError('Invalid or inactive product variant');
      }

      extraPrice = variant.extraPrice;
    }

    let taxRate = new Prisma.Decimal(0);
    let isIncludedInPrice = false;
    let fixedTax = new Prisma.Decimal(0);
    let taxId: string | null = null;

    if (line.taxId) {
      const tax = await tx.tax.findUnique({
        where: { id: line.taxId },
      });

      if (!tax || !tax.isActive) {
        throw new BadRequestError('Tax not found or inactive');
      }

      taxId = tax.id;

      if (tax.type === TaxType.PERCENTAGE) {
        taxRate = tax.rate;
        isIncludedInPrice = tax.isIncludedInPrice;
      } else {
        // The shared pricing utility supports percentage taxes.
        // Apply fixed taxes separately.
        fixedTax = tax.rate;
      }
    }

    let discountValue: Prisma.Decimal | undefined;
    let discountType: 'PERCENTAGE' | 'FIXED' | undefined;
    let discountId: string | null = null;

    if (line.discountId) {
      const discount = await tx.discount.findUnique({
        where: { id: line.discountId },
      });

      if (!discount || !discount.isActive) {
        throw new BadRequestError('Discount not found or inactive');
      }

      const now = new Date();

      if (discount.startDate && discount.startDate > now) {
        throw new BadRequestError('Discount is not active yet');
      }

      if (discount.endDate && discount.endDate < now) {
        throw new BadRequestError('Discount has expired');
      }

      discountId = discount.id;

      const grossAmount = new Prisma.Decimal(line.unitPrice)
        .plus(extraPrice)
        .times(line.quantity);

      if (
        discount.minOrderAmount &&
        grossAmount.lessThan(discount.minOrderAmount)
      ) {
        throw new BadRequestError(
          'Order amount does not meet the discount minimum'
        );
      }

      discountValue = discount.value;
      discountType = discount.type as DiscountType;
    }

    const result = calculateLinePricing({
      unitPrice: line.unitPrice,
      quantity: line.quantity,
      extraPrice,
      taxRate,
      isIncludedInPrice,
      discountValue,
      discountType,
    });

    const finalTax = result.taxAmount.plus(fixedTax);
    const finalTotal = result.total.plus(fixedTax);

    calculatedLines.push({
      productId: line.productId,
      variantId: line.variantId ?? null,
      description: line.description ?? null,
      quantity: line.quantity,
      unitPrice: result.unitPriceWithVariant,
      taxId,
      taxRate,
      discountId,
      discountAmount: result.discountAmount,
      total: finalTotal,
    });

    subtotal = subtotal.plus(result.subtotal);
    taxAmount = taxAmount.plus(finalTax);
    discountAmount = discountAmount.plus(result.discountAmount);
    total = total.plus(finalTotal);
  }

  return {
    calculatedLines,
    subtotal,
    taxAmount,
    discountAmount,
    total,
  };
};

export const createQuotation = async (data: CreateQuotationInput) => {
  return prisma.$transaction(async (tx) => {
    const customer = await tx.customer.findUnique({
      where: { id: data.customerId },
    });

    if (!customer || !customer.isActive) {
      throw new BadRequestError('Customer not found or inactive');
    }

    if (data.planId) {
      const plan = await tx.plan.findUnique({
        where: { id: data.planId },
      });

      if (!plan || !plan.isActive) {
        throw new BadRequestError('Plan not found or inactive');
      }
    }

    let template = null;

    if (data.templateId) {
      template = await tx.quotationTemplate.findUnique({
        where: { id: data.templateId },
      });

      if (!template || !template.isActive) {
        throw new BadRequestError('Quotation template not found or inactive');
      }
    }

    const pricing = await calculateQuotationLines(tx, data.lines);

    const duration = template?.defaultDurationDays;

    const validUntil =
      data.validUntil ??
      (duration
        ? new Date(Date.now() + duration * 24 * 60 * 60 * 1000)
        : null);

    const quotation = await tx.quotation.create({
      data: {
        quotationNumber: `QUO-${Date.now()}`,
        customerId: data.customerId,
        planId: data.planId ?? null,
        templateId: data.templateId ?? null,
        validUntil,
        termsAndConditions:
          data.termsAndConditions ??
          template?.termsAndConditions ??
          null,
        subtotal: pricing.subtotal,
        taxAmount: pricing.taxAmount,
        discountAmount: pricing.discountAmount,
        total: pricing.total,
        lines: {
          create: pricing.calculatedLines,
        },
      },
      include: {
        customer: true,
        plan: true,
        template: true,
        lines: {
          include: {
            product: true,
            variant: true,
            tax: true,
            discount: true,
          },
        },
      },
    });

    return quotation;
  });
};

export const getQuotations = async (query: QuotationQuery) => {
  const page = query.page ?? 1;
  const limit = query.limit ?? 10;

  const where: Prisma.QuotationWhereInput = {
    ...(query.status && { status: query.status }),
    ...(query.customerId && { customerId: query.customerId }),
    ...(query.search && {
      OR: [
        { quotationNumber: { contains: query.search, mode: 'insensitive' } },
        {
          customer: {
            name: { contains: query.search, mode: 'insensitive' },
          },
        },
      ],
    }),
  };

  const [quotations, total] = await Promise.all([
    prisma.quotation.findMany({
      where,
      include: {
        customer: true,
        lines: { include: { product: true, variant: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.quotation.count({ where }),
  ]);

  return {
    quotations,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
};

export const getQuotationById = async (id: string) => {
  const quotation = await prisma.quotation.findUnique({
    where: { id },
    include: {
      customer: true,
      plan: true,
      template: true,
      lines: {
        include: {
          product: true,
          variant: true,
          tax: true,
          discount: true,
        },
      },
    },
  });

  if (!quotation) {
    throw new NotFoundError('Quotation not found');
  }

  return quotation;
};

export const updateQuotation = async (
  id: string,
  data: UpdateQuotationInput
) => {
  await getQuotationById(id);

  return prisma.$transaction(async (tx) => {
    const updateData: Prisma.QuotationUpdateInput = {};

    if (data.customerId !== undefined) {
      const customer = await tx.customer.findUnique({
        where: { id: data.customerId },
      });

      if (!customer || !customer.isActive) {
        throw new BadRequestError('Customer not found or inactive');
      }

      updateData.customer = { connect: { id: data.customerId } };
    }

    if (data.planId !== undefined) {
      updateData.plan = data.planId
        ? { connect: { id: data.planId } }
        : { disconnect: true };
    }

    if (data.templateId !== undefined) {
      updateData.template = data.templateId
        ? { connect: { id: data.templateId } }
        : { disconnect: true };
    }

    if (data.status !== undefined) {
      updateData.status = data.status;
    }

    if (data.validUntil !== undefined) {
      updateData.validUntil = data.validUntil;
    }

    if (data.termsAndConditions !== undefined) {
      updateData.termsAndConditions = data.termsAndConditions;
    }

    if (data.lines) {
      const pricing = await calculateQuotationLines(tx, data.lines);

      await tx.quotationLine.deleteMany({
        where: { quotationId: id },
      });

      updateData.subtotal = pricing.subtotal;
      updateData.taxAmount = pricing.taxAmount;
      updateData.discountAmount = pricing.discountAmount;
      updateData.total = pricing.total;

      return tx.quotation.update({
        where: { id },
        data: {
          ...updateData,
          lines: { create: pricing.calculatedLines },
        },
        include: {
          customer: true,
          lines: { include: { product: true, variant: true } },
        },
      });
    }

    return tx.quotation.update({
      where: { id },
      data: updateData,
      include: {
        customer: true,
        lines: { include: { product: true, variant: true } },
      },
    });
  });
};

export const deleteQuotation = async (id: string) => {
  await getQuotationById(id);

  return prisma.quotation.delete({
    where: { id },
  });
};

// Quotation template management

export const createQuotationTemplate = async (data: {
  name: string;
  description?: string | null;
  planId?: string | null;
  defaultDurationDays?: number | null;
  termsAndConditions?: string | null;
  isActive?: boolean;
}) => {
  return prisma.quotationTemplate.create({
    data: {
      ...data,
      isActive: data.isActive ?? true,
    },
  });
};

export const getQuotationTemplates = async () => {
  return prisma.quotationTemplate.findMany({
    where: { isActive: true },
    include: { plan: true },
    orderBy: { createdAt: 'desc' },
  });
};


export const updateQuotationTemplate = async (
  id: string,
  data: {
    name?: string;
    description?: string | null;
    planId?: string | null;
    defaultDurationDays?: number | null;
    termsAndConditions?: string | null;
    isActive?: boolean;
  }
) => {
  const existing = await prisma.quotationTemplate.findUnique({
    where: { id },
  });

  if (!existing) {
    throw new NotFoundError('Quotation template not found');
  }

  const { planId, ...otherData } = data;

  return prisma.quotationTemplate.update({
    where: { id },
    data: {
      ...otherData,
      ...(planId !== undefined && {
        plan: planId
          ? { connect: { id: planId } }
          : { disconnect: true },
      }),
    },
  });
};
