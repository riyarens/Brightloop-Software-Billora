import { randomBytes } from 'node:crypto';

/**
 * Generates a unique invoice number.
 * Format: INV-YYYYMMDD-XXXXXXXX
 */
export function generateInvoiceNumber(): string {
  const date = new Date();

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  const randomSuffix = randomBytes(4).toString('hex').toUpperCase();

  return `INV-${year}${month}${day}-${randomSuffix}`;
}