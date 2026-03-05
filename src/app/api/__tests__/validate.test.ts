// src/app/api/__tests__/validate.test.ts
import { POST as validateInvoice } from '@/app/api/invoices/[id]/validate/route';
import { db } from '@/lib/db';
import { validateSARSInvoice } from '@/lib/validation/sars';
import { NextRequest } from 'next/server';

jest.mock('@/lib/db');
jest.mock('@/lib/validation/sars');

describe('POST /api/invoices/[id]/validate', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return 404 for non-existent invoice', async () => {
    const mockDb = db as jest.Mocked<typeof db>;
    mockDb.invoice.findUnique = jest.fn().mockResolvedValue(null);

    const request = new NextRequest('http://localhost:3000/api/invoices/nonexistent/validate', {
      method: 'POST',
    });

    const response = await validateInvoice(request, { params: { id: 'nonexistent' } });
    const json = await response.json();

    expect(response.status).toBe(404);
    expect(json.error).toContain('not found');
  });

  it('should validate invoice and return results', async () => {
    const mockDb = db as jest.Mocked<typeof db>;
    const mockValidate = validateSARSInvoice as jest.MockedFunction<typeof validateSARSInvoice>;

    const invoiceMock = {
      id: 'inv-1',
      userId: 'user-1',
      status: 'needs_review',
      invoiceLabel: 'Tax Invoice',
      vendorName: 'ACME',
      vendorVatNumber: '4123456789',
      totalAmount: 10000,
      lineItems: [],
    };

    const validationResults = [
      { field: 'invoiceLabel', valid: true, message: 'Valid', severity: 'info' },
      { field: 'vendorVatNumber', valid: true, message: 'Valid', severity: 'info' },
    ];

    mockDb.invoice.findUnique = jest.fn().mockResolvedValue(invoiceMock);
    mockValidate.mockReturnValue(validationResults);
    mockDb.auditLog.create = jest.fn().mockResolvedValue({});

    const request = new NextRequest('http://localhost:3000/api/invoices/inv-1/validate', {
      method: 'POST',
    });

    const response = await validateInvoice(request, { params: { id: 'inv-1' } });
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.invoiceId).toBe('inv-1');
    expect(json.valid).toBe(true);
    expect(json.validationResults.length).toBe(2);
  });

  it('should separate errors and warnings', async () => {
    const mockDb = db as jest.Mocked<typeof db>;
    const mockValidate = validateSARSInvoice as jest.MockedFunction<typeof validateSARSInvoice>;

    const invoiceMock = {
      id: 'inv-1',
      userId: 'user-1',
      status: 'needs_review',
      lineItems: [],
    };

    const validationResults = [
      { field: 'invoiceLabel', valid: false, message: 'Missing', severity: 'error' },
      { field: 'vatNumber', valid: true, message: 'Warning', severity: 'warning' },
      { field: 'description', valid: true, message: 'OK', severity: 'info' },
    ];

    mockDb.invoice.findUnique = jest.fn().mockResolvedValue(invoiceMock);
    mockValidate.mockReturnValue(validationResults);
    mockDb.auditLog.create = jest.fn().mockResolvedValue({});

    const request = new NextRequest('http://localhost:3000/api/invoices/inv-1/validate', {
      method: 'POST',
    });

    const response = await validateInvoice(request, { params: { id: 'inv-1' } });
    const json = await response.json();

    expect(json.valid).toBe(false);
    expect(json.errors.length).toBe(1);
    expect(json.warnings.length).toBe(1);
  });

  it('should auto-update status to validated on pass', async () => {
    const mockDb = db as jest.Mocked<typeof db>;
    const mockValidate = validateSARSInvoice as jest.MockedFunction<typeof validateSARSInvoice>;

    const invoiceMock = {
      id: 'inv-1',
      userId: 'user-1',
      status: 'needs_review',
      lineItems: [],
    };

    mockDb.invoice.findUnique = jest.fn().mockResolvedValue(invoiceMock);
    mockValidate.mockReturnValue([
      { field: 'label', valid: true, message: 'OK', severity: 'info' },
    ]);
    mockDb.invoice.update = jest.fn().mockResolvedValue({});
    mockDb.auditLog.create = jest.fn().mockResolvedValue({});

    const request = new NextRequest('http://localhost:3000/api/invoices/inv-1/validate', {
      method: 'POST',
    });

    await validateInvoice(request, { params: { id: 'inv-1' } });

    expect(mockDb.invoice.update).toHaveBeenCalledWith({
      where: { id: 'inv-1' },
      data: { status: 'validated' },
    });
  });

  it('should not update status if already validated', async () => {
    const mockDb = db as jest.Mocked<typeof db>;
    const mockValidate = validateSARSInvoice as jest.MockedFunction<typeof validateSARSInvoice>;

    const invoiceMock = {
      id: 'inv-1',
      userId: 'user-1',
      status: 'validated', // Already validated
      lineItems: [],
    };

    mockDb.invoice.findUnique = jest.fn().mockResolvedValue(invoiceMock);
    mockValidate.mockReturnValue([
      { field: 'label', valid: true, message: 'OK', severity: 'info' },
    ]);
    mockDb.auditLog.create = jest.fn().mockResolvedValue({});

    const request = new NextRequest('http://localhost:3000/api/invoices/inv-1/validate', {
      method: 'POST',
    });

    await validateInvoice(request, { params: { id: 'inv-1' } });

    // Should not call update since already validated
    expect(mockDb.invoice.update).not.toHaveBeenCalled();
  });

  it('should log validation in audit trail', async () => {
    const mockDb = db as jest.Mocked<typeof db>;
    const mockValidate = validateSARSInvoice as jest.MockedFunction<typeof validateSARSInvoice>;

    const invoiceMock = {
      id: 'inv-1',
      userId: 'user-1',
      status: 'needs_review',
      lineItems: [],
    };

    mockDb.invoice.findUnique = jest.fn().mockResolvedValue(invoiceMock);
    mockValidate.mockReturnValue([
      { field: 'label', valid: true, message: 'OK', severity: 'info' },
      { field: 'vat', valid: false, message: 'Mismatch', severity: 'warning' },
    ]);
    mockDb.auditLog.create = jest.fn().mockResolvedValue({});

    const request = new NextRequest('http://localhost:3000/api/invoices/inv-1/validate', {
      method: 'POST',
    });

    await validateInvoice(request, { params: { id: 'inv-1' } });

    expect(mockDb.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: 'user-1',
        action: 'validate',
        status: 'success',
        details: expect.stringContaining('errors'),
      }),
    });
  });
});
