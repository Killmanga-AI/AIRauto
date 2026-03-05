// src/app/api/__tests__/upload.test.ts
import { POST } from '@/app/api/upload/route';
import { db } from '@/lib/db';
import { getStorage, generateStorageKey } from '@/lib/storage';
import { getExtractionQueue } from '@/lib/queue';
import { NextRequest } from 'next/server';

// Mock dependencies
jest.mock('@/lib/db');
jest.mock('@/lib/storage');
jest.mock('@/lib/queue');

describe('POST /api/upload', () => {
  let mockRequest: Partial<NextRequest>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should reject requests without file', async () => {
    const formData = new FormData();
    formData.append('userId', 'user-1');

    mockRequest = {
      formData: jest.fn().mockResolvedValue(formData),
      nextUrl: { searchParams: new URLSearchParams() },
    } as any;

    const response = await POST(mockRequest as NextRequest);
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json.error).toContain('No file provided');
  });

  it('should reject invalid file types', async () => {
    const file = new File(['content'], 'test.txt', { type: 'text/plain' });
    const formData = new FormData();
    formData.append('file', file);
    formData.append('userId', 'user-1');

    mockRequest = {
      formData: jest.fn().mockResolvedValue(formData),
      nextUrl: { searchParams: new URLSearchParams() },
    } as any;

    const response = await POST(mockRequest as NextRequest);
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json.error).toContain('Invalid file type');
  });

  it('should reject files larger than 50MB', async () => {
    const largeBuffer = Buffer.alloc(51 * 1024 * 1024);
    const file = new File([largeBuffer], 'large.pdf', { type: 'application/pdf' });
    const formData = new FormData();
    formData.append('file', file);
    formData.append('userId', 'user-1');

    mockRequest = {
      formData: jest.fn().mockResolvedValue(formData),
      nextUrl: { searchParams: new URLSearchParams() },
    } as any;

    const response = await POST(mockRequest as NextRequest);
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json.error).toContain('too large');
  });

  it('should accept valid PDF file', async () => {
    const file = new File(['PDF content'], 'invoice.pdf', { type: 'application/pdf' });
    const formData = new FormData();
    formData.append('file', file);
    formData.append('userId', 'user-1');

    mockRequest = {
      formData: jest.fn().mockResolvedValue(formData),
      nextUrl: { searchParams: new URLSearchParams() },
    } as any;

    const mockDb = db as jest.Mocked<typeof db>;
    const mockStorage = getStorage as jest.MockedFunction<typeof getStorage>;
    const mockQueue = getExtractionQueue as jest.MockedFunction<typeof getExtractionQueue>;

    mockDb.user.findUnique = jest.fn().mockResolvedValue({ id: 'user-1', email: 'test@test.com' });
    mockDb.invoice.create = jest.fn().mockResolvedValue({
      id: 'invoice-1',
      userId: 'user-1',
      originalFileName: 'invoice.pdf',
      originalFilePath: 'user-1/test.pdf',
      fileType: 'pdf',
      status: 'uploaded',
    });
    mockDb.auditLog.create = jest.fn().mockResolvedValue({});

    const mockStorageInstance = {
      uploadFile: jest.fn().mockResolvedValue('user-1/test.pdf'),
    };
    mockStorage.mockReturnValue(mockStorageInstance as any);

    const mockQueueInstance = {
      add: jest.fn().mockResolvedValue({ id: 'job-1' }),
    };
    mockQueue.mockReturnValue(mockQueueInstance as any);

    const response = await POST(mockRequest as NextRequest);
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.invoiceId).toBe('invoice-1');
    expect(json.status).toBe('uploaded');
    expect(json.jobId).toBe('job-1');
  });

  it('should accept valid JPG file', async () => {
    const file = new File(['JPG content'], 'receipt.jpg', { type: 'image/jpeg' });
    const formData = new FormData();
    formData.append('file', file);
    formData.append('userId', 'user-1');

    mockRequest = {
      formData: jest.fn().mockResolvedValue(formData),
      nextUrl: { searchParams: new URLSearchParams() },
    } as any;

    const mockDb = db as jest.Mocked<typeof db>;
    const mockStorage = getStorage as jest.MockedFunction<typeof getStorage>;
    const mockQueue = getExtractionQueue as jest.MockedFunction<typeof getExtractionQueue>;

    mockDb.user.findUnique = jest.fn().mockResolvedValue({ id: 'user-1' });
    mockDb.invoice.create = jest.fn().mockResolvedValue({
      id: 'invoice-1',
      fileType: 'jpg',
    });
    mockDb.auditLog.create = jest.fn().mockResolvedValue({});

    mockStorage.mockReturnValue({ uploadFile: jest.fn().mockResolvedValue('user-1/test.jpg') } as any);
    mockQueue.mockReturnValue({ add: jest.fn().mockResolvedValue({ id: 'job-1' }) } as any);

    const response = await POST(mockRequest as NextRequest);
    const json = await response.json();

    expect(response.status).toBe(200);
    expect((mockDb.invoice.create as jest.Mock).mock.calls[0][0].data.fileType).toBe('jpg');
  });

  it('should use default userId if not provided', async () => {
    const file = new File(['PDF'], 'invoice.pdf', { type: 'application/pdf' });
    const formData = new FormData();
    formData.append('file', file);

    mockRequest = {
      formData: jest.fn().mockResolvedValue(formData),
      nextUrl: { searchParams: new URLSearchParams() },
    } as any;

    const mockDb = db as jest.Mocked<typeof db>;
    mockDb.user.findUnique = jest.fn().mockResolvedValue({ id: 'default-user' });
    mockDb.invoice.create = jest.fn().mockResolvedValue({ id: 'invoice-1' });
    mockDb.auditLog.create = jest.fn().mockResolvedValue({});

    getStorage.mockReturnValue({ uploadFile: jest.fn().mockResolvedValue('path') } as any);
    getExtractionQueue.mockReturnValue({ add: jest.fn().mockResolvedValue({ id: 'job-1' }) } as any);

    await POST(mockRequest as NextRequest);

    // Should use 'default-user' userId
    expect((mockDb.user.findUnique as jest.Mock).mock.calls[0][0].where.id).toBe('default-user');
  });

  it('should log successful upload to audit trail', async () => {
    const file = new File(['PDF'], 'invoice.pdf', { type: 'application/pdf' });
    const formData = new FormData();
    formData.append('file', file);
    formData.append('userId', 'user-1');

    mockRequest = {
      formData: jest.fn().mockResolvedValue(formData),
      nextUrl: { searchParams: new URLSearchParams() },
    } as any;

    const mockDb = db as jest.Mocked<typeof db>;
    mockDb.user.findUnique = jest.fn().mockResolvedValue({ id: 'user-1' });
    mockDb.invoice.create = jest.fn().mockResolvedValue({ id: 'invoice-1', userId: 'user-1' });
    mockDb.auditLog.create = jest.fn().mockResolvedValue({});

    getStorage.mockReturnValue({ uploadFile: jest.fn().mockResolvedValue('path') } as any);
    getExtractionQueue.mockReturnValue({ add: jest.fn().mockResolvedValue({ id: 'job-1' }) } as any);

    await POST(mockRequest as NextRequest);

    expect(mockDb.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: 'user-1',
        action: 'upload',
        resource: 'invoice',
        status: 'success',
      }),
    });
  });
});
