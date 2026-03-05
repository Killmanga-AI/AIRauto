// ============================================================
// AIRAuto – Invoices List Route
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

/**
 * GET /api/invoices
 * 
 * List invoices for a user with pagination and filtering.
 * 
 * Query Parameters:
 *   - userId: string (required)
 *   - page: number (default: 1)
 *   - limit: number (default: 20, max: 100)
 *   - status: ProcessingStatus (optional filter)
 *   - sort: 'newest' | 'oldest' (default: 'newest')
 * 
 * Response:
 *   {
 *     invoices: Invoice[],
 *     total: number,
 *     page: number,
 *     pageSize: number,
 *     pages: number
 *   }
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId');
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(100, parseInt(searchParams.get('limit') || '20'));
    const status = searchParams.get('status');
    const sort = searchParams.get('sort') || 'newest';

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      );
    }

    // Build where clause
    const where: { userId: string; status?: string } = { userId };
    if (status) {
      where.status = status;
    }

    // Get total count
    const total = await db.invoice.count({ where });

    // Fetch invoices
    const invoices = await db.invoice.findMany({
      where,
      orderBy: {
        createdAt: sort === 'oldest' ? 'asc' : 'desc',
      },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        lineItems: true,
      },
    });

    const pages = Math.ceil(total / limit);

    return NextResponse.json({
      invoices,
      total,
      page,
      pageSize: limit,
      pages,
    });
  } catch (error) {
    console.error('[Invoices List] Error:', error);

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to fetch invoices',
      },
      { status: 500 }
    );
  }
}
