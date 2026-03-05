// ============================================================
// AIRAuto – File Upload Route
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getStorage, generateStorageKey } from '@/lib/storage';
import { getExtractionQueue } from '@/lib/queue';

/**
 * POST /api/upload
 * 
 * Upload an invoice (PDF/JPG/PNG) and queue for async extraction.
 * 
 * Request (multipart/form-data):
 *   - file: File
 *   - userId: string (optional, defaults to authenticated user)
 * 
 * Response:
 *   {
 *     invoiceId: string,
 *     status: "uploaded",
 *     jobId: string (queue job ID)
 *   }
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Parse multipart form
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const userId = (formData.get('userId') as string) || 'default-user';

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Validate file type
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Allowed: PDF, JPG, PNG' },
        { status: 400 }
      );
    }

    // Validate file size (50MB max)
    const maxSize = 50 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'File too large. Maximum 50MB' },
        { status: 400 }
      );
    }

    // Check user exists
    const user = await db.user.findUnique({ where: { id: userId } });
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Convert file to buffer
    const buffer = Buffer.from(await file.arrayBuffer());

    // Generate storage key and upload
    const storageKey = generateStorageKey(userId, file.name);
    const storage = getStorage();
    await storage.uploadFile(storageKey, buffer, file.type);

    // Determine file type
    let fileType: 'pdf' | 'jpg' | 'png' = 'pdf';
    if (file.type === 'image/jpeg') fileType = 'jpg';
    else if (file.type === 'image/png') fileType = 'png';

    // Create invoice record
    const invoice = await db.invoice.create({
      data: {
        userId,
        originalFileName: file.name,
        originalFilePath: storageKey,
        fileType,
        status: 'uploaded',
      },
    });

    // Queue extraction job
    const queue = getExtractionQueue();
    const job = await queue.add(
      'extract',
      {
        invoiceId: invoice.id,
        userId,
        filePath: storageKey,
        fileName: file.name,
        fileType,
      },
      {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
        removeOnComplete: false,
        removeOnFail: false,
      }
    );

    // Log audit
    await db.auditLog.create({
      data: {
        userId,
        action: 'upload',
        resource: 'invoice',
        resourceId: invoice.id,
        status: 'success',
        details: JSON.stringify({
          fileName: file.name,
          fileSize: file.size,
          jobId: job.id,
        }),
      },
    });

    return NextResponse.json({
      invoiceId: invoice.id,
      status: 'uploaded',
      jobId: job.id,
    });
  } catch (error) {
    console.error('[Upload] Error:', error);

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Upload failed',
      },
      { status: 500 }
    );
  }
}
