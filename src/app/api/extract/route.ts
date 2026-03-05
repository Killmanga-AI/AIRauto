// ============================================================
// AIRAuto – Extract Route (Manually Trigger Extraction)
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getExtractionQueue } from '@/lib/queue';

/**
 * POST /api/extract
 * 
 * Manually trigger extraction on an already-uploaded invoice.
 * Useful for re-running extraction if it failed or to use different AI model.
 * 
 * Request Body:
 *   {
 *     invoiceId: string,
 *     userId: string (optional, defaults to invoice owner)
 *   }
 * 
 * Response:
 *   {
 *     invoiceId: string,
 *     jobId: string,
 *     status: "queued"
 *   }
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();
    const { invoiceId, userId } = body;

    if (!invoiceId) {
      return NextResponse.json(
        { error: 'invoiceId is required' },
        { status: 400 }
      );
    }

    // Fetch invoice
    const invoice = await db.invoice.findUnique({
      where: { id: invoiceId },
    });

    if (!invoice) {
      return NextResponse.json(
        { error: 'Invoice not found' },
        { status: 404 }
      );
    }

    // Verify user has permission
    const authUserId = userId || invoice.userId;
    if (authUserId !== invoice.userId) {
      return NextResponse.json(
        { error: 'Not authorized' },
        { status: 403 }
      );
    }

    // Queue extraction
    const queue = getExtractionQueue();
    const job = await queue.add(
      'extract',
      {
        invoiceId,
        userId: invoice.userId,
        filePath: invoice.originalFilePath,
        fileName: invoice.originalFileName,
        fileType: invoice.fileType as 'pdf' | 'jpg' | 'png',
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

    // Update status
    await db.invoice.update({
      where: { id: invoiceId },
      data: { status: 'queued' },
    });

    // Log audit
    await db.auditLog.create({
      data: {
        userId: invoice.userId,
        action: 'extract',
        resource: 'invoice',
        resourceId: invoiceId,
        status: 'success',
        details: JSON.stringify({ jobId: job.id, requeue: true }),
      },
    });

    return NextResponse.json({
      invoiceId,
      jobId: job.id,
      status: 'queued',
    });
  } catch (error) {
    console.error('[Extract] Error:', error);

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Extraction request failed',
      },
      { status: 500 }
    );
  }
}
