
import { Decimal } from '@prisma/client/runtime/library';

// ==========================================
// BILLORA - SHARED PRICING UTILITY
// ==========================================

export interface PricingLineInput {
  unitPrice: number | string | Decimal;
  quantity: number;
  extraPrice?: number | string | Decimal;
  taxRate?: number | string | Decimal;
  discountValue?: number | string | Decimal;
  discountType?: 'PERCENTAGE' | 'FIXED';
}

export interface CalculatedLineResult {
  basePrice: Decimal;
  unitPriceWithVariant: Decimal;
  subtotal: Decimal;
  taxAmount: Decimal;
  discountAmount: Decimal;
  total: Decimal;
}

/**
 * Calculates product pricing including variant,
 * quantity, discount and tax.
 *
 * All monetary calculations use Prisma Decimal.
 */
export function calculateLinePricing(
  input: PricingLineInput
): CalculatedLineResult {

  // 1. Validate quantity
  if (!Number.isInteger(input.quantity) || input.quantity <= 0) {
    throw new Error('Quantity must be a positive integer');
  }

  // 2. Convert inputs to Decimal
  const basePrice = new Decimal(input.unitPrice);
  const extraPrice = new Decimal(input.extraPrice ?? 0);
  const taxRate = new Decimal(input.taxRate ?? 0);

  // 3. Validate prices and tax
  if (basePrice.isNegative() || extraPrice.isNegative()) {
    throw new Error('Prices cannot be negative');
  }

  if (taxRate.isNegative() || taxRate.greaterThan(100)) {
    throw new Error('Tax rate must be between 0 and 100');
  }

  // 4. Add variant price (Odoo = +560)
  const unitPriceWithVariant = basePrice.plus(extraPrice);

  // 5. Calculate subtotal
  const subtotal = unitPriceWithVariant.times(input.quantity);

  // 6. Calculate discount
  let discountAmount = new Decimal(0);

  if (input.discountValue !== undefined) {
    const discountValue = new Decimal(input.discountValue);

    if (discountValue.isNegative()) {
      throw new Error('Discount cannot be negative');
    }

    if (input.discountType === 'PERCENTAGE') {
      if (discountValue.greaterThan(100)) {
        throw new Error('Percentage discount cannot exceed 100');
      }

      discountAmount = subtotal
        .times(discountValue)
        .dividedBy(100);
    } else if (input.discountType === 'FIXED') {
      discountAmount = discountValue;
    } else {
      throw new Error('Invalid discount type');
    }

    // Discount cannot exceed subtotal
    if (discountAmount.greaterThan(subtotal)) {
      discountAmount = subtotal;
    }
  }

  // 7. Calculate taxable amount
  const taxableAmount = subtotal.minus(discountAmount);

  // 8. Calculate tax after discount
  const taxAmount = taxableAmount
    .times(taxRate)
    .dividedBy(100);

  // 9. Calculate final total
  const total = taxableAmount.plus(taxAmount);

  // 10. Return calculated result
  return {
    basePrice,
    unitPriceWithVariant,
    subtotal,
    taxAmount,
    discountAmount,
    total,
  };
}
