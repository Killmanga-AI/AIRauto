// ============================================================
// AIRAuto – South Africa VAT Calculation Engine
// ============================================================

import { SA_VAT_RATE } from '@/types/invoice';

/** Calculate VAT from a VAT-exclusive amount */
export function calculateVatFromExclusive(exclusiveAmount: number): {
    vatAmount: number;
    inclusiveAmount: number;
} {
    const vatAmount = round(exclusiveAmount * SA_VAT_RATE);
    return {
        vatAmount,
        inclusiveAmount: round(exclusiveAmount + vatAmount),
    };
}

/** Calculate VAT from a VAT-inclusive amount */
export function calculateVatFromInclusive(inclusiveAmount: number): {
    vatAmount: number;
    exclusiveAmount: number;
} {
    const exclusiveAmount = round(inclusiveAmount / (1 + SA_VAT_RATE));
    const vatAmount = round(inclusiveAmount - exclusiveAmount);
    return {
        vatAmount,
        exclusiveAmount,
    };
}

/** Cross-check extracted VAT against calculated VAT (legacy signature) */
export function validateVatAmountLegacy(
    extractedSubtotal: number,
    extractedVat: number,
    extractedTotal: number,
    tolerance: number = 1.0  // R1 tolerance for rounding
): {
    valid: boolean;
    expectedVat: number;
    expectedTotal: number;
    discrepancy: number;
    message: string;
} {
    const expectedVat = round(extractedSubtotal * SA_VAT_RATE);
    const expectedTotal = round(extractedSubtotal + expectedVat);

    const vatDiscrepancy = Math.abs(extractedVat - expectedVat);
    const totalDiscrepancy = Math.abs(extractedTotal - expectedTotal);

    const valid = vatDiscrepancy <= tolerance && totalDiscrepancy <= tolerance;

    let message = '';
    if (!valid) {
        if (vatDiscrepancy > tolerance) {
            message = `VAT mismatch: extracted R${extractedVat.toFixed(2)} but expected R${expectedVat.toFixed(2)} (15% of R${extractedSubtotal.toFixed(2)})`;
        }
        if (totalDiscrepancy > tolerance) {
            message += ` Total mismatch: extracted R${extractedTotal.toFixed(2)} but expected R${expectedTotal.toFixed(2)}`;
        }
    }

    return {
        valid,
        expectedVat,
        expectedTotal,
        discrepancy: Math.max(vatDiscrepancy, totalDiscrepancy),
        message: message || 'VAT calculation verified at 15%',
    };
}

/** 
 * Detect if an amount is likely VAT-inclusive or exclusive
 * by checking if the ratio matches common patterns 
 */
export function detectVatInclusion(
    amount1: number,
    amount2: number
): 'inclusive' | 'exclusive' | 'unknown' {
    const ratio = amount2 / amount1;

    // Check if amount1 * 1.15 ≈ amount2 (amount1 is exclusive)
    if (Math.abs(ratio - 1.15) < 0.005) return 'exclusive';

    // Check if amount1 / 1.15 ≈ amount2 (amount1 is inclusive)
    if (Math.abs(1 / ratio - 1.15) < 0.005) return 'inclusive';

    return 'unknown';
}

/** Format amount in ZAR */
export function formatZAR(amount: number): string {
    return `R ${amount.toLocaleString('en-ZA', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    })}`;
}

/** Round to 2 decimal places (financial rounding) */
function round(value: number): number {
    return Math.round(value * 100) / 100;
}

// ============================================================
// High-level helpers used by tests and business logic
// ============================================================

export type VatSupplyType =
  | 'exclusive'
  | 'inclusive'
  | 'zero-rated'
  | 'exempt';

export interface VatCalculationResult {
  subtotal: number;
  vat: number;
  total: number;
}

/**
 * High-level VAT helper used in tests and business logic.
 * - "exclusive": amount is VAT-exclusive
 * - "inclusive": amount is VAT-inclusive
 * - "zero-rated" / "exempt": VAT is always 0, total = subtotal
 */
export function calculateVAT(
  amount: number,
  supplyType: VatSupplyType,
): VatCalculationResult | null {
  const rate = SA_VAT_RATE;

  switch (supplyType) {
    case 'exclusive': {
      const subtotal = round(amount);
      const vat = round(subtotal * rate);
      const total = round(subtotal + vat);
      return { subtotal, vat, total };
    }
    case 'inclusive': {
      const total = round(amount);
      const subtotal = round(total / (1 + rate));
      const vat = round(total - subtotal);
      return { subtotal, vat, total };
    }
    case 'zero-rated':
    case 'exempt': {
      const subtotal = round(amount);
      const vat = 0;
      const total = subtotal;
      return { subtotal, vat, total };
    }
    default:
      // For unknown supply types we return null so callers can handle it explicitly
      return null;
  }
}

/**
 * Cross-check a VAT breakdown against expected values.
 * Preferred high-level API used in tests:
 *   validateVatAmount({ subtotal, vat, total, vatRate })
 */
export function validateVatAmount(input: {
  subtotal: number;
  vat: number;
  total: number;
  vatRate: number;
}): {
  valid: boolean;
  error: string | null;
} {
  const { subtotal, vat, total, vatRate } = input;

  const expectedVat = round(subtotal * vatRate);
  const expectedTotal = round(subtotal + expectedVat);

  const vatDiscrepancy = Math.abs(vat - expectedVat);
  const totalDiscrepancy = Math.abs(total - expectedTotal);

  // Special rule: zero VAT on a standard-rated supply should be treated as invalid,
  // even if the arithmetic technically matches.
  if (vatRate > 0 && vat === 0 && subtotal > 0) {
    return {
      valid: false,
      error: 'VAT amount cannot be zero for a standard-rated supply',
    };
  }

  const tolerance = 1.0; // R1 tolerance for rounding
  const withinTolerance =
    vatDiscrepancy <= tolerance && totalDiscrepancy <= tolerance;

  if (withinTolerance) {
    return { valid: true, error: null };
  }

  if (vatDiscrepancy > tolerance) {
    return {
      valid: false,
      error: `VAT mismatch: expected R${expectedVat.toFixed(
        2,
      )} but received R${vat.toFixed(2)}`,
    };
  }

  return {
    valid: false,
    error: `total mismatch: expected R${expectedTotal.toFixed(
      2,
    )} but received R${total.toFixed(2)}`,
  };
}
