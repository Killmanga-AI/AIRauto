// src/app/api/__tests__/invoices.test.ts
import { GET as getInvoicesList } from '@/app/api/invoices/route';
import { GET as getInvoiceDetail, PUT as updateInvoice } from '@/app/api/invoices/[id]/route';
import { db } from '@/lib/db';
import { NextRequest } from 'next/server';

jest.mock('@/lib/db');

describe('GET /api/invoices (List)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return empty list when no invoices found', async () => {
    const mockDb = db as jest.Mocked<typeof db>;
    mockDb.invoice.count = jest.fn().mockResolvedValue(0);
    mockDb.invoice.findMany = jest.fn().mockResolvedValue([]);

    const request = new NextRequest('http://localhost:3000/api/invoices?userId=user-1');
    const response = await getInvoicesList(request);
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.invoices).toEqual([]);
    expect(json.total).toBe(0);
    expect(json.pages).toBe(0);
  });

  it('should return invoices with pagination', async () => {
    const mockDb = db as jest.Mocked<typeof db>;
    const invoicesMock = [
      { id: 'inv-1', status: 'validated' },
      { id: 'inv-2', status: 'needs_review' },
    ];

    mockDb.invoice.count = jest.fn().mockResolvedValue(2);
    mockDb.invoice.findMany = jest.fn().mockResolvedValue(invoicesMock);

    const request = new NextRequest('http://localhost:3000/api/invoices?userId=user-1&page=1&limit=20');
    const response = await getInvoicesList(request);
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.invoices.length).toBe(2);
    expect(json.total).toBe(2);
    expect(json.page).toBe(1);
    expect(json.pageSize).toBe(20);
    expect(json.pages).toBe(1);
  });

  it('should filter by status', async () => {
    const mockDb = db as jest.Mocked<typeof db>;
    const validatedMock = [{ id: 'inv-1', status: 'validated' }];

    mockDb.invoice.count = jest.fn().mockResolvedValue(1);
    mockDb.invoice.findMany = jest.fn().mockResolvedValue(validatedMock);

    const request = new NextRequest('http://localhost:3000/api/invoices?userId=user-1&status=validated');
    const response = await getInvoicesList(request);

    expect(response.status).toBe(200);
    expect((mockDb.invoice.findMany as jest.Mock).mock.calls[0][0].where.status).toBe('validated');
  });

  it('should sort by newest (default)', async () => {
    const mockDb = db as jest.Mocked<typeof db>;
    mockDb.invoice.count = jest.fn().mockResolvedValue(0);
    mockDb.invoice.findMany = jest.fn().mockResolvedValue([]);

    const request = new NextRequest('http://localhost:3000/api/invoices?userId=user-1&sort=newest');
    await getInvoicesList(request);

    expect((mockDb.invoice.findMany as jest.Mock).mock.calls[0][0].orderBy.createdAt).toBe('desc');
  });

  it('should sort by oldest', async () => {
    const mockDb = db as jest.Mocked<typeof db>;
    mockDb.invoice.count = jest.fn().mockResolvedValue(0);
    mockDb.invoice.findMany = jest.fn().mockResolvedValue([]);

    const request = new NextRequest('http://localhost:3000/api/invoices?userId=user-1&sort=oldest');
    await getInvoicesList(request);

    expect((mockDb.invoice.findMany as jest.Mock).mock.calls[0][0].orderBy.createdAt).toBe('asc');
  });

  it('should enforce limit max of 100', async () => {
    const mockDb = db as jest.Mocked<typeof db>;
    mockDb.invoice.count = jest.fn().mockResolvedValue(0);
    mockDb.invoice.findMany = jest.fn().mockResolvedValue([]);

    const request = new NextRequest('http://localhost:3000/api/invoices?userId=user-1&limit=500');
    await getInvoicesList(request);

    expect((mockDb.invoice.findMany as jest.Mock).mock.calls[0][0].take).toBe(100);
  });

  it('should require userId parameter', async () => {
    const request = new NextRequest('http://localhost:3000/api/invoices');
    const response = await getInvoicesList(request);
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json.error).toContain('userId');
  });

  it('should include line items in response', async () => {
    const mockDb = db as jest.Mocked<typeof db>;
    const invoiceMock = [
      {
        id: 'inv-1',
        lineItems: [{ id: 'line-1', description: 'Item 1' }],
      },
    ];

    mockDb.invoice.count = jest.fn().mockResolvedValue(1);
    mockDb.invoice.findMany = jest.fn().mockResolvedValue(invoiceMock);

    const request = new NextRequest('http://localhost:3000/api/invoices?userId=user-1');
    await getInvoicesList(request);

    expect((mockDb.invoice.findMany as jest.Mock).mock.calls[0][0].include.lineItems).toBe(true);
  });
});

describe('GET /api/invoices/[id]', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return invoice details', async () => {
    const mockDb = db as jest.Mocked<typeof db>;
    const invoiceMock = {
      id: 'inv-1',
      userId: 'user-1',
      status: 'validated',
      lineItems: [],
    };

    mockDb.invoice.findUnique = jest.fn().mockResolvedValue(invoiceMock);

    const request = new NextRequest('http://localhost:3000/api/invoices/inv-1');
    const response = await getInvoiceDetail(request, { params: { id: 'inv-1' } });
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.id).toBe('inv-1');
  });

  it('should return 404 for non-existent invoice', async () => {
    const mockDb = db as jest.Mocked<typeof db>;
    mockDb.invoice.findUnique = jest.fn().mockResolvedValue(null);

    const request = new NextRequest('http://localhost:3000/api/invoices/nonexistent');
    const response = await getInvoiceDetail(request, { params: { id: 'nonexistent' } });
    const json = await response.json();

    expect(response.status).toBe(404);
    expect(json.error).toContain('not found');
  });
});

describe('PUT /api/invoices/[id]', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should update invoice fields', async () => {
    const mockDb = db as jest.Mocked<typeof db>;
    const updatedInvoice = {
      id: 'inv-1',
      vendorName: 'Updated Name',
      status: 'needs_review',
    };

    mockDb.invoice.update = jest.fn().mockResolvedValue(updatedInvoice);
    mockDb.auditLog.create = jest.fn().mockResolvedValue({});

    const request = new NextRequest('http://localhost:3000/api/invoices/inv-1', {
      method: 'PUT',
      body: JSON.stringify({ vendorName: 'Updated Name' }),
    });

    const response = await updateInvoice(request, { params: { id: 'inv-1' } });
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.vendorName).toBe('Updated Name');
  });

  it('should only allow specific fields to be updated', async () => {
    const mockDb = db as jest.Mocked<typeof db>;
    mockDb.invoice.update = jest.fn().mockResolvedValue({});
    mockDb.auditLog.create = jest.fn().mockResolvedValue({});

    const request = new NextRequest('http://localhost:3000/api/invoices/inv-1', {
      method: 'PUT',
      body: JSON.stringify({
        vendorName: 'New Name',
        userId: 'hacked-user-id', // Should not be updatable
      }),
    });

    await updateInvoice(request, { params: { id: 'inv-1' } });

    const updateCall = (mockDb.invoice.update as jest.Mock).mock.calls[0];
    expect(updateCall[0].data.vendorName).toBe('New Name');
    expect(updateCall[0].data.userId).toBeUndefined();
  });

  it('should convert monetary values to cents', async () => {
    const mockDb = db as jest.Mocked<typeof db>;
    mockDb.invoice.update = jest.fn().mockResolvedValue({});
    mockDb.auditLog.create = jest.fn().mockResolvedValue({});

    const request = new NextRequest('http://localhost:3000/api/invoices/inv-1', {
      method: 'PUT',
      body: JSON.stringify({ totalAmount: 1000.50 }),
    });

    await updateInvoice(request, { params: { id: 'inv-1' } });

    const updateCall = (mockDb.invoice.update as jest.Mock).mock.calls[0];
    expect(updateCall[0].data.totalAmount).toBe(100050); // Store as cents
  });

  it('should reject empty update', async () => {
    const request = new NextRequest('http://localhost:3000/api/invoices/inv-1', {
      method: 'PUT',
      body: JSON.stringify({}),
    });

    const response = await updateInvoice(request, { params: { id: 'inv-1' } });
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json.error).toContain('No valid fields');
  });

  it('should log manual edit in audit trail', async () => {
    const mockDb = db as jest.Mocked<typeof db>;
    mockDb.invoice.update = jest.fn().mockResolvedValue({ id: 'inv-1', userId: 'user-1' });
    mockDb.auditLog.create = jest.fn().mockResolvedValue({});

    const request = new NextRequest('http://localhost:3000/api/invoices/inv-1', {
      method: 'PUT',
      body: JSON.stringify({ vendorName: 'Updated' }),
    });

    await updateInvoice(request, { params: { id: 'inv-1' } });

    expect(mockDb.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: 'manual_edit',
        resource: 'invoice',
      }),
    });
  });
});
