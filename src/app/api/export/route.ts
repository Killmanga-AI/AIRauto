// ============================================================
// AIRAuto – Export Route
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { SAInvoice } from '@/types/invoice';
import { exportToSage } from '@/lib/export/sage';
import { exportToXero } from '@/lib/export/xero';
import { exportToQuickBooks } from '@/lib/export/quickbooks';
import { exportToCsv } from '@/lib/export/csv';

/**
 * POST /api/export
 * 
 * Export invoices to external accounting system.
 * Supports: Sage, Xero, QuickBooks, CSV.
 * 
 * Request Body:
 *   {
 *     invoiceIds: string[],
 *     provider: 'sage' | 'xero' | 'quickbooks' | 'csv',
 *     userId: string (optional, defaults to authenticated user)
 *   }
 * 
 * Response (async export):
 *   {
 *     jobId: string,
 *     provider: string,
 *     invoiceCount: number,
 *     status: "queued" | "completed"
 *   }
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();
    const { invoiceIds, provider, userId } = body;

    if (!invoiceIds || !Array.isArray(invoiceIds) || invoiceIds.length === 0) {
      return NextResponse.json(
        { error: 'invoiceIds must be a non-empty array' },
        { status: 400 }
      );
    }

    if (!provider) {
      return NextResponse.json(
        { error: 'provider is required' },
        { status: 400 }
      );
    }

    const validProviders = ['sage', 'xero', 'quickbooks', 'csv'];
    if (!validProviders.includes(provider)) {
      return NextResponse.json(
        { error: `Invalid provider. Supported: ${validProviders.join(', ')}` },
        { status: 400 }
      );
    }

    // Fetch invoices
    const invoices = await db.invoice.findMany({
      where: {
        id: { in: invoiceIds },
      },
      include: { lineItems: true },
    });

    if (invoices.length === 0) {
      return NextResponse.json(
        { error: 'No invoices found for the provided IDs' },
        { status: 404 }
      );
    }

    // Verify all invoices belong to same user and are validated
    const authUserId = userId || invoices[0].userId;
    if (!invoices.every((inv) => inv.userId === authUserId && inv.status === 'validated')) {
      return NextResponse.json(
        {
          error: 'All invoices must be validated and belong to the same user',
        },
        { status: 400 }
      );
    }

    // Handle CSV export synchronously (simple format)
    if (provider === 'csv') {
      try {
        const csvContent = await exportToCsv(invoices as unknown as SAInvoice[]);
        return new NextResponse(csvContent, {
          headers: {
            'Content-Type': 'text/csv',
            'Content-Disposition': 'attachment; filename="invoices.csv"',
          },
        });
      } catch (error) {
        console.error('[Export CSV] Error:', error);
        return NextResponse.json(
          { error: 'CSV export failed' },
          { status: 500 }
        );
      }
    }

    // Handle integration exports (stub implementations)
    let result:
      | { success: boolean; message: string }
      | undefined;
    switch (provider) {
      case 'sage':
        result = await exportToSage(invoices as unknown as SAInvoice[]);
        break;
      case 'xero':
        result = await exportToXero(invoices as unknown as SAInvoice[]);
        break;
      case 'quickbooks':
        result = await exportToQuickBooks(invoices as unknown as SAInvoice[]);
        break;
      default:
        return NextResponse.json(
          { error: `Unsupported provider: ${provider}` },
          { status: 400 }
        );
    }

    // Log audit
    await db.auditLog.create({
      data: {
        userId: authUserId,
        action: 'export',
        resource: 'invoice',
        resourceId: invoiceIds.join(','),
        status: result.success ? 'success' : 'failure',
        details: JSON.stringify({
          provider,
          count: invoiceIds.length,
          result: result.message,
        }),
      },
    });

    return NextResponse.json({
      provider,
      invoiceCount: invoiceIds.length,
      success: result.success,
      message: result.message,
    });
  } catch (error) {
    console.error('[Export] Error:', error);

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Export failed',
      },
      { status: 500 }
    );
  }
}
