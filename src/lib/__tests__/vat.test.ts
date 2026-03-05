// src/lib/__tests__/vat.test.ts
import { calculateVAT, validateVatAmount } from '@/lib/validation/vat';

describe('VAT Calculation & Validation', () => {
  describe('calculateVAT', () => {
    it('should calculate 15% VAT correctly', () => {
      // R1000 + 15% VAT = R1150
      const result = calculateVAT(1000, 'exclusive');
      expect(result.vat).toBe(150);
      expect(result.total).toBe(1150);
    });

    it('should extract VAT from inclusive amount', () => {
      // R1150 inclusive = R1000 + R150 VAT
      const result = calculateVAT(1150, 'inclusive');
      expect(result.subtotal).toBe(1000);
      expect(result.vat).toBe(150);
    });

    it('should handle zero-rated supplies', () => {
      const result = calculateVAT(1000, 'zero-rated');
      expect(result.vat).toBe(0);
      expect(result.total).toBe(1000);
    });

    it('should handle exempt supplies', () => {
      const result = calculateVAT(1000, 'exempt');
      expect(result.vat).toBe(0);
      expect(result.total).toBe(1000);
    });

    it('should round to cents correctly', () => {
      const result = calculateVAT(1000.33, 'exclusive');
      expect(result.vat).toBe(Math.round(1000.33 * 0.15 * 100) / 100);
    });

    it('should handle large amounts', () => {
      const result = calculateVAT(1000000, 'exclusive');
      expect(result.vat).toBe(150000);
      expect(result.total).toBe(1150000);
    });

    it('should return null for unknown supply type', () => {
      // @ts-ignore - testing invalid input
      const result = calculateVAT(1000, 'invalid-type');
      expect(result).toBeNull();
    });
  });

  describe('validateVatAmount', () => {
    it('should validate correct VAT calculation', () => {
      const result = validateVatAmount({
        subtotal: 1000,
        vat: 150,
        total: 1150,
        vatRate: 0.15,
      });

      expect(result.valid).toBe(true);
      expect(result.error).toBeNull();
    });

    it('should flag incorrect VAT amount', () => {
      const result = validateVatAmount({
        subtotal: 1000,
        vat: 100, // Should be 150
        total: 1100,
        vatRate: 0.15,
      });

      expect(result.valid).toBe(false);
      expect(result.error).toContain('VAT');
    });

    it('should flag incorrect total', () => {
      const result = validateVatAmount({
        subtotal: 1000,
        vat: 150,
        total: 1140, // Should be 1150
        vatRate: 0.15,
      });

      expect(result.valid).toBe(false);
      expect(result.error).toContain('total');
    });

    it('should allow small rounding differences', () => {
      const result = validateVatAmount({
        subtotal: 999.99,
        vat: 149.99,
        total: 1149.98,
        vatRate: 0.15,
      });

      expect(result.valid).toBe(true);
    });

    it('should handle non-standard VAT rate', () => {
      const result = validateVatAmount({
        subtotal: 1000,
        vat: 80, // 8% rate
        total: 1080,
        vatRate: 0.08,
      });

      expect(result.valid).toBe(true);
    });

    it('should flag zero VAT on standard-rated supply', () => {
      const result = validateVatAmount({
        subtotal: 1000,
        vat: 0,
        total: 1000,
        vatRate: 0.15,
      });

      expect(result.valid).toBe(false);
    });
  });
});
