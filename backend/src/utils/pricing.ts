
import { Prisma } from '@prisma/client';

export interface PricingLineInput {
  unitPrice: number | string | Prisma.Decimal;
  quantity: number;
  extraPrice?: number | string | Prisma.Decimal;
  taxRate?: number | string | Prisma.Decimal;
  isIncludedInPrice?: boolean;
  discountValue?: number | string | Prisma.Decimal;
  discountType?: 'PERCENTAGE' | 'FIXED';
}

export interface CalculatedLineResult {
  basePrice: Prisma.Decimal;
  unitPriceWithVariant: Prisma.Decimal;
  subtotal: Prisma.Decimal;
  discountAmount: Prisma.Decimal;
  taxAmount: Prisma.Decimal;
  total: Prisma.Decimal;
}

export function calculateLinePricing(
  input: PricingLineInput
): CalculatedLineResult {
  if (!Number.isInteger(input.quantity) || input.quantity <= 0) {
    throw new Error('Quantity must be a positive integer');
  }

  const basePrice = new Prisma.Decimal(input.unitPrice);
  const extraPrice = new Prisma.Decimal(input.extraPrice ?? 0);
  const quantity = new Prisma.Decimal(input.quantity);
  const taxRate = new Prisma.Decimal(input.taxRate ?? 0);

  if (
    !basePrice.isFinite() ||
    !extraPrice.isFinite() ||
    !taxRate.isFinite() ||
    basePrice.isNegative() ||
    extraPrice.isNegative()
  ) {
    throw new Error('Invalid or negative pricing value');
  }

  if (taxRate.isNegative() || taxRate.greaterThan(100)) {
    throw new Error('Tax rate must be between 0 and 100');
  }

  const unitPriceWithVariant = basePrice.plus(extraPrice);
  const grossSubtotal = unitPriceWithVariant.times(quantity);

  let discountAmount = new Prisma.Decimal(0);

  if (input.discountValue !== undefined) {
    const rawDiscount = new Prisma.Decimal(input.discountValue);

    if (!rawDiscount.isFinite() || rawDiscount.isNegative()) {
      throw new Error('Discount cannot be negative or invalid');
    }

    if (input.discountType === 'PERCENTAGE') {
      if (rawDiscount.greaterThan(100)) {
        throw new Error('Percentage discount cannot exceed 100');
      }

      discountAmount = grossSubtotal.times(rawDiscount).dividedBy(100);
    } else if (input.discountType === 'FIXED') {
      discountAmount = rawDiscount;
    } else {
      throw new Error('Invalid discount type');
    }
  }

  if (discountAmount.greaterThan(grossSubtotal)) {
    discountAmount = grossSubtotal;
  }

  const discountedAmount = grossSubtotal.minus(discountAmount);

  let taxAmount = new Prisma.Decimal(0);
  let total = new Prisma.Decimal(0);
  let subtotal = grossSubtotal;

  if (taxRate.greaterThan(0)) {
    if (input.isIncludedInPrice ?? false) {
      // Tax-inclusive: extract tax from the discounted amount.
      taxAmount = discountedAmount
        .times(taxRate)
        .dividedBy(taxRate.plus(100));

      total = discountedAmount;
      subtotal = total.minus(taxAmount);
    } else {
      // Tax-exclusive: add tax after discount.
      taxAmount = discountedAmount.times(taxRate).dividedBy(100);
      total = discountedAmount.plus(taxAmount);
      subtotal = grossSubtotal;
    }
  } else {
    total = discountedAmount;
  }

  return {
    basePrice: new Prisma.Decimal(basePrice.toFixed(2)),
    unitPriceWithVariant: new Prisma.Decimal(
      unitPriceWithVariant.toFixed(2)
    ),
    subtotal: new Prisma.Decimal(subtotal.toFixed(2)),
    discountAmount: new Prisma.Decimal(discountAmount.toFixed(2)),
    taxAmount: new Prisma.Decimal(taxAmount.toFixed(2)),
    total: new Prisma.Decimal(total.toFixed(2)),
  };
}
