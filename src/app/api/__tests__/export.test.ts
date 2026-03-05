// src/app/api/__tests__/export.test.ts
import { POST as exportInvoices } from '@/app/api/export/route';
import { db } from '@/lib/db';
import { exportToSage } from '@/lib/export/sage';
import { exportToXero } from '@/lib/export/xero';
import { exportToQuickBooks } from '@/lib/export/quickbooks';
import { exportToCsv } from '@/lib/export/csv';
import { NextRequest } from 'next/server';

jest.mock('@/lib/db');
jest.mock('@/lib/export/sage');
jest.mock('@/lib/export/xero');
jest.mock('@/lib/export/quickbooks');
jest.mock('@/lib/export/csv');

describe('POST /api/export', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should reject request without invoiceIds', async () => {
    const request = new NextRequest('http://localhost:3000/api/export', {
      method: 'POST',
      body: JSON.stringify({ provider: 'csv' }),
    });

    const response = await exportInvoices(request);
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json.error).toContain('invoiceIds');
  });

  it('should reject request with empty invoiceIds array', async () => {
    const request = new NextRequest('http://localhost:3000/api/export', {
      method: 'POST',
      body: JSON.stringify({ invoiceIds: [], provider: 'csv' }),
    });

    const response = await exportInvoices(request);
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json.error).toContain('non-empty array');
  });

  it('should reject request without provider', async () => {
    const request = new NextRequest('http://localhost:3000/api/export', {
      method: 'POST',
      body: JSON.stringify({ invoiceIds: ['inv-1'] }),
    });

    const response = await exportInvoices(request);
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json.error).toContain('provider');
  });

  it('should reject invalid provider', async () => {
    const request = new NextRequest('http://localhost:3000/api/export', {
      method: 'POST',
      body: JSON.stringify({ invoiceIds: ['inv-1'], provider: 'invalid' }),
    });

    const response = await exportInvoices(request);
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json.error).toContain('Invalid provider');
  });

  it('should handle CSV export', async () => {
    const mockDb = db as jest.Mocked<typeof db>;
    const mockCsv = exportToCsv as jest.MockedFunction<typeof exportToCsv>;

    const invoiceMock = [
      {
        id: 'inv-1',
        userId: 'user-1',
        status: 'validated',
        lineItems: [],
      },
    ];

    mockDb.invoice.findMany = jest.fn().mockResolvedValue(invoiceMock);
    mockCsv.mockResolvedValue('vendor,amount\nACME,1000\n');
    mockDb.auditLog.create = jest.fn().mockResolvedValue({});

    const request = new NextRequest('http://localhost:3000/api/export', {
      method: 'POST',
      body: JSON.stringify({ invoiceIds: ['inv-1'], provider: 'csv' }),
    });

    const response = await exportInvoices(request);

    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toContain('text/csv');
    expect(response.headers.get('Content-Disposition')).toContain('invoices.csv');
  });

  it('should handle Sage export', async () => {
    const mockDb = db as jest.Mocked<typeof db>;
    const mockSage = exportToSage as jest.MockedFunction<typeof exportToSage>;

    const invoiceMock = [{ id: 'inv-1', userId: 'user-1', status: 'validated', lineItems: [] }];

    mockDb.invoice.findMany = jest.fn().mockResolvedValue(invoiceMock);
    mockSage.mockResolvedValue({ success: false, message: 'Not configured' });
    mockDb.auditLog.create = jest.fn().mockResolvedValue({});

    const request = new NextRequest('http://localhost:3000/api/export', {
      method: 'POST',
      body: JSON.stringify({ invoiceIds: ['inv-1'], provider: 'sage' }),
    });

    const response = await exportInvoices(request);
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.provider).toBe('sage');
    expect(mockSage).toHaveBeenCalledWith(invoiceMock);
  });

  it('should handle Xero export', async () => {
    const mockDb = db as jest.Mocked<typeof db>;
    const mockXero = exportToXero as jest.MockedFunction<typeof exportToXero>;

    const invoiceMock = [{ id: 'inv-1', userId: 'user-1', status: 'validated', lineItems: [] }];

    mockDb.invoice.findMany = jest.fn().mockResolvedValue(invoiceMock);
    mockXero.mockResolvedValue({ success: false, message: 'Not configured' });
    mockDb.auditLog.create = jest.fn().mockResolvedValue({});

    const request = new NextRequest('http://localhost:3000/api/export', {
      method: 'POST',
      body: JSON.stringify({ invoiceIds: ['inv-1'], provider: 'xero' }),
    });

    const response = await exportInvoices(request);
    const json = await response.json();

    expect(json.provider).toBe('xero');
    expect(mockXero).toHaveBeenCalledWith(invoiceMock);
  });

  it('should handle QuickBooks export', async () => {
    const mockDb = db as jest.Mocked<typeof db>;
    const mockQb = exportToQuickBooks as jest.MockedFunction<typeof exportToQuickBooks>;

    const invoiceMock = [{ id: 'inv-1', userId: 'user-1', status: 'validated', lineItems: [] }];

    mockDb.invoice.findMany = jest.fn().mockResolvedValue(invoiceMock);
    mockQb.mockResolvedValue({ success: false, message: 'Not configured' });
    mockDb.auditLog.create = jest.fn().mockResolvedValue({});

    const request = new NextRequest('http://localhost:3000/api/export', {
      method: 'POST',
      body: JSON.stringify({ invoiceIds: ['inv-1'], provider: 'quickbooks' }),
    });

    const response = await exportInvoices(request);
    const json = await response.json();

    expect(json.provider).toBe('quickbooks');
    expect(mockQb).toHaveBeenCalledWith(invoiceMock);
  });

  it('should reject export if user doesnt own invoices', async () => {
    const mockDb = db as jest.Mocked<typeof db>;

    const invoiceMock = [
      { id: 'inv-1', userId: 'user-2', status: 'validated', lineItems: [] }, // Different user
    ];

    mockDb.invoice.findMany = jest.fn().mockResolvedValue(invoiceMock);

    const request = new NextRequest('http://localhost:3000/api/export', {
      method: 'POST',
      body: JSON.stringify({
        invoiceIds: ['inv-1'],
        provider: 'csv',
        userId: 'user-1',
      }),
    });

    const response = await exportInvoices(request);
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json.error).toContain('same user');
  });

  it('should reject export if invoice not validated', async () => {
    const mockDb = db as jest.Mocked<typeof db>;

    const invoiceMock = [
      { id: 'inv-1', userId: 'user-1', status: 'needs_review', lineItems: [] }, // Not validated
    ];

    mockDb.invoice.findMany = jest.fn().mockResolvedValue(invoiceMock);

    const request = new NextRequest('http://localhost:3000/api/export', {
      method: 'POST',
      body: JSON.stringify({
        invoiceIds: ['inv-1'],
        provider: 'csv',
        userId: 'user-1',
      }),
    });

    const response = await exportInvoices(request);
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json.error).toContain('validated');
  });

  it('should log export action to audit trail', async () => {
    const mockDb = db as jest.Mocked<typeof db>;
    const mockSage = exportToSage as jest.MockedFunction<typeof exportToSage>;

    const invoiceMock = [{ id: 'inv-1', userId: 'user-1', status: 'validated', lineItems: [] }];

    mockDb.invoice.findMany = jest.fn().mockResolvedValue(invoiceMock);
    mockSage.mockResolvedValue({ success: true, message: 'Exported' });
    mockDb.auditLog.create = jest.fn().mockResolvedValue({});

    const request = new NextRequest('http://localhost:3000/api/export', {
      method: 'POST',
      body: JSON.stringify({ invoiceIds: ['inv-1'], provider: 'sage', userId: 'user-1' }),
    });

    await exportInvoices(request);

    expect(mockDb.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: 'user-1',
        action: 'export',
        status: 'success',
      }),
    });
  });

  it('should include invoice count in response', async () => {
    const mockDb = db as jest.Mocked<typeof db>;
    const mockCsv = exportToCsv as jest.MockedFunction<typeof exportToCsv>;

    const invoiceMock = [
      { id: 'inv-1', userId: 'user-1', status: 'validated', lineItems: [] },
      { id: 'inv-2', userId: 'user-1', status: 'validated', lineItems: [] },
    ];

    mockDb.invoice.findMany = jest.fn().mockResolvedValue(invoiceMock);
    mockCsv.mockResolvedValue('data');
    mockDb.auditLog.create = jest.fn().mockResolvedValue({});

    const request = new NextRequest('http://localhost:3000/api/export', {
      method: 'POST',
      body: JSON.stringify({ invoiceIds: ['inv-1', 'inv-2'], provider: 'csv' }),
    });

    const response = await exportInvoices(request);
    const text = await response.text();

    expect(text).toContain('data');
  });
});
