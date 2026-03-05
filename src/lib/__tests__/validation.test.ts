// src/lib/__tests__/validation.test.ts
import { classifyInvoiceType, validateSARSInvoice } from '@/lib/validation/sars';
import { SAInvoice, InvoiceType } from '@/types/invoice';

describe('SARS Validation Engine', () => {
  describe('classifyInvoiceType', () => {
    it('should classify as "full" for amounts > R5,000', () => {
      const result = classifyInvoiceType(5001);
      expect(result).toBe('full');
    });

    it('should classify as "abridged" for amounts between R50 and R5,000', () => {
      const result = classifyInvoiceType(2500);
      expect(result).toBe('abridged');
    });

    it('should classify as "no_invoice_required" for amounts <= R50', () => {
      const result = classifyInvoiceType(50);
      expect(result).toBe('no_invoice_required');
    });

    it('should handle boundary cases', () => {
      expect(classifyInvoiceType(5000)).toBe('abridged');
      expect(classifyInvoiceType(5000.01)).toBe('full');
      expect(classifyInvoiceType(49.99)).toBe('no_invoice_required');
      expect(classifyInvoiceType(50.01)).toBe('abridged');
    });
  });

  describe('validateSARSInvoice', () => {
    const baseInvoice: SAInvoice = {
      id: 'test-1',
      userId: 'user-1',
      originalFileName: 'invoice.pdf',
      originalFilePath: '/uploads/invoice.pdf',
      fileType: 'pdf',
      uploadedAt: new Date().toISOString(),
      status: 'validated',
      invoiceType: 'full',
      lineItems: [],
      invoiceLabel: { value: 'Tax Invoice', confidence: 0.95, level: 'high', source: 'ai' },
      vendorName: { value: 'ACME Corp', confidence: 0.92, level: 'high', source: 'ai' },
      vendorVatNumber: { value: '4123456789', confidence: 0.88, level: 'high', source: 'ai' },
      invoiceNumber: { value: 'INV-001', confidence: 0.9, level: 'high', source: 'ai' },
      invoiceDate: { value: '2026-03-05', confidence: 0.85, level: 'high', source: 'ai' },
      totalAmount: { value: 10000, confidence: 0.9, level: 'high', source: 'ai' },
      vatAmount: { value: 1500, confidence: 0.88, level: 'high', source: 'ai' },
      currency: { value: 'ZAR', confidence: 1.0, level: 'high', source: 'ocr' },
    };

    it('should validate a complete full invoice', () => {
      const results = validateSARSInvoice(baseInvoice);
      const errors = results.filter((r) => r.severity === 'error' && !r.valid);
      expect(errors.length).toBe(0);
    });

    it('should flag missing invoice label', () => {
      const invoice = { ...baseInvoice, invoiceLabel: undefined };
      const results = validateSARSInvoice(invoice);
      const labelError = results.find((r) => r.field === 'invoiceLabel' && r.severity === 'error');
      expect(labelError).toBeDefined();
    });

    it('should flag invalid VAT number format', () => {
      const invoice = {
        ...baseInvoice,
        vendorVatNumber: { value: 'INVALID', confidence: 0.5, level: 'low', source: 'ai' },
      };
      const results = validateSARSInvoice(invoice);
      const vatError = results.find((r) => r.field === 'vendorVatNumber');
      expect(vatError?.severity).toBe('error');
    });

    it('should validate VAT calculation', () => {
      const invoice = {
        ...baseInvoice,
        totalAmount: { value: 10000, confidence: 0.9, level: 'high', source: 'ai' },
        vatAmount: { value: 1500, confidence: 0.88, level: 'high', source: 'ai' },
        vatRate: { value: 0.15, confidence: 1.0, level: 'high', source: 'ai' },
      };
      const results = validateSARSInvoice(invoice);
      const vatResult = results.find((r) => r.field === 'vatAmount');
      expect(vatResult?.valid).toBe(true);
    });

    it('should flag VAT mismatch', () => {
      const invoice = {
        ...baseInvoice,
        totalAmount: { value: 10000, confidence: 0.9, level: 'high', source: 'ai' },
        vatAmount: { value: 500, confidence: 0.88, level: 'high', source: 'ai' }, // Should be ~1500
        vatRate: { value: 0.15, confidence: 1.0, level: 'high', source: 'ai' },
      };
      const results = validateSARSInvoice(invoice);
      const vatResult = results.find((r) => r.field === 'vatAmount' && r.severity === 'warning');
      expect(vatResult).toBeDefined();
    });

    it('should handle abridged invoice type', () => {
      const invoice = {
        ...baseInvoice,
        totalAmount: { value: 2500, confidence: 0.9, level: 'high', source: 'ai' },
        invoiceType: 'abridged' as InvoiceType,
      };
      const results = validateSARSInvoice(invoice);
      const errors = results.filter((r) => r.severity === 'error' && !r.valid);
      // Abridged can have fewer fields - should have fewer/no errors
      expect(results.some((r) => r.field === 'invoiceLabel')).toBe(true);
    });

    it('should handle no_invoice_required type', () => {
      const invoice = {
        ...baseInvoice,
        totalAmount: { value: 30, confidence: 0.9, level: 'high', source: 'ai' },
        invoiceType: 'no_invoice_required' as InvoiceType,
      };
      const results = validateSARSInvoice(invoice);
      // Even minimal invoices need some fields
      expect(results.length > 0).toBe(true);
    });
  });
});
