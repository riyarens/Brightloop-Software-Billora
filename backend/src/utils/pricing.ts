// ==============================================================================
// BILLORA - Shared Pricing Utility Adapter
// Owned by: Member 2 (Niranjana)
// Member 1 integration adapter conforming to the team pricing contract.
// Uses Prisma.Decimal for high-precision financial arithmetic (no float errors).
// ==============================================================================

import { Prisma } from '@prisma/client';

export interface PricingLineInput {
  unitPrice: number | string | Prisma.Decimal;
  quantity: number;
  extraPrice?: number | string | Prisma.Decimal; // e.g. +560 for Odoo brand variant
  taxRate?: number | string | Prisma.Decimal;    // e.g. 18.00 for 18%
  isIncludedInPrice?: boolean;                   // Default: false (Tax-inclusive vs Tax-exclusive)
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

/**
 * Calculates financial totals for a subscription, quotation, or invoice line.
 * Respects variant brand adjustments (e.g. Odoo +560), discounts, and tax modes.
 */
export function calculateLinePricing(input: PricingLineInput): CalculatedLineResult {
  const basePrice = new Prisma.Decimal(input.unitPrice || 0);
  const extraPrice = new Prisma.Decimal(input.extraPrice || 0);
  const quantity = new Prisma.Decimal(Math.max(1, input.quantity || 1));

  // 1. Calculate Unit Price with Variant extra price (e.g., 1000 + 560 = 1560)
  const unitPriceWithVariant = basePrice.plus(extraPrice);

  // 2. Gross subtotal before discount and tax
  const grossSubtotal = unitPriceWithVariant.times(quantity);

  // 3. Discount calculation
  let discountAmount = new Prisma.Decimal(0);
  if (input.discountValue) {
    const rawDiscount = new Prisma.Decimal(input.discountValue);
    if (input.discountType === 'PERCENTAGE') {
      discountAmount = grossSubtotal.times(rawDiscount).dividedBy(100);
    } else {
      discountAmount = rawDiscount;
    }
  }

  // Cap discount at grossSubtotal
  if (discountAmount.greaterThan(grossSubtotal)) {
    discountAmount = grossSubtotal;
  }

  const discountedAmount = grossSubtotal.minus(discountAmount);

  // 4. Tax and Total calculation (Supports both Tax-Exclusive and Tax-Inclusive modes)
  let taxAmount = new Prisma.Decimal(0);
  let total = new Prisma.Decimal(0);
  let netSubtotal = grossSubtotal;

  const taxRate = new Prisma.Decimal(input.taxRate || 0);

  if (taxRate.greaterThan(0)) {
    if (input.isIncludedInPrice) {
      // Tax-Inclusive: Price already includes tax (Odoo formula: Tax = Amount * (Rate / (100 + Rate)))
      taxAmount = discountedAmount.times(taxRate).dividedBy(taxRate.plus(100));
      total = discountedAmount;
      netSubtotal = total.minus(taxAmount);
    } else {
      // Tax-Exclusive: Tax is added on top of taxable subtotal (Standard: Tax = Amount * (Rate / 100))
      taxAmount = discountedAmount.times(taxRate).dividedBy(100);
      total = discountedAmount.plus(taxAmount);
      netSubtotal = grossSubtotal;
    }
  } else {
    total = discountedAmount;
  }

  return {
    basePrice: new Prisma.Decimal(basePrice.toFixed(2)),
    unitPriceWithVariant: new Prisma.Decimal(unitPriceWithVariant.toFixed(2)),
    subtotal: new Prisma.Decimal(netSubtotal.toFixed(2)),
    discountAmount: new Prisma.Decimal(discountAmount.toFixed(2)),
    taxAmount: new Prisma.Decimal(taxAmount.toFixed(2)),
    total: new Prisma.Decimal(total.toFixed(2)),
  };
}
