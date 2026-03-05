// ============================================================
// AIRAuto – Single Invoice Route
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

/**
 * GET /api/invoices/[id]
 * 
 * Fetch a single invoice with all extracted data.
 * 
 * Response:
 *   {
 *     id: string,
 *     status: ProcessingStatus,
 *     extracted fields...,
 *     lineItems: LineItem[],
 *     validationErrors?: ValidationResult[]
 *   }
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  try {
    const { id } = params;

    const invoice = await db.invoice.findUnique({
      where: { id },
      include: {
        lineItems: true,
      },
    });

    if (!invoice) {
      return NextResponse.json(
        { error: 'Invoice not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(invoice);
  } catch (error) {
    console.error('[Invoice Get] Error:', error);

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to fetch invoice',
      },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/invoices/[id]
 * 
 * Update invoice (manual corrections, field edits).
 * 
 * Request Body (partial):
 *   {
 *     vendorName?: string,
 *     invoiceNumber?: string,
 *     totalAmount?: number,
 *     ... (any extractable field)
 *   }
 * 
 * Response:
 *   { id, status, ...updatedFields }
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  try {
    const { id } = params;
    const body = await request.json() as Record<string, unknown>;

    // Security: Only allow updating specific fields
    const allowedFields = [
      'vendorName',
      'vendorAddress',
      'vendorVatNumber',
      'customerName',
      'customerAddress',
      'customerVatNumber',
      'invoiceNumber',
      'invoiceDate',
      'description',
      'subtotal',
      'vatAmount',
      'totalAmount',
      'invoiceType',
    ];

    const updateData: Record<string, unknown> = {};
    for (const field of allowedFields) {
      if (field in body) {
        // Convert currency fields (e.g., totalAmount) to cents
        if (['subtotal', 'vatAmount', 'totalAmount'].includes(field)) {
          const value = body[field] as number | null;
          updateData[field] = value != null ? Math.round(value * 100) : null;
        } else if (field === 'invoiceDate' && body[field]) {
          updateData[field] = new Date(body[field] as string);
        } else {
          updateData[field] = body[field];
        }
      }
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: 'No valid fields to update' },
        { status: 400 }
      );
    }

    // Mark as needing-review if manually edited
    updateData.status = 'needs_review';

    const updated = await db.invoice.update({
      where: { id },
      data: updateData,
      include: { lineItems: true },
    });

    // Log audit for manual edit
    const userId = updated.userId;
    await db.auditLog.create({
      data: {
        userId,
        action: 'manual_edit',
        resource: 'invoice',
        resourceId: id,
        status: 'success',
        details: JSON.stringify(updateData),
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('[Invoice Put] Error:', error);

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to update invoice',
      },
      { status: 500 }
    );
  }
}
