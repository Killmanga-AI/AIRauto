// ============================================================
// AIRAuto – Invoice Validation Route
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { validateSARSInvoice } from '@/lib/validation/sars';

/**
 * POST /api/invoices/[id]/validate
 * 
 * Re-validate an invoice against SARS rules.
 * Useful after manual edits or to check current validation status.
 * 
 * Response:
 *   {
 *     invoiceId: string,
 *     valid: boolean,
 *     validationResults: ValidationResult[],
 *     errors: ValidationResult[] (severity: 'error'),
 *     warnings: ValidationResult[] (severity: 'warning')
 *   }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  try {
    const { id } = params;

    // Fetch invoice with line items
    const invoice = await db.invoice.findUnique({
      where: { id },
      include: { lineItems: true },
    });

    if (!invoice) {
      return NextResponse.json(
        { error: 'Invoice not found' },
        { status: 404 }
      );
    }

    // Convert to SAInvoice format for validation
    const saInvoice = dbInvoiceToSAInvoice(invoice);

    // Run validation
    const validationResults = validateSARSInvoice(saInvoice);

    // Separate by severity
    const errors = validationResults.filter((r) => r.severity === 'error');
    const warnings = validationResults.filter((r) => r.severity === 'warning');

    const isValid = errors.length === 0;

    // Update invoice status if auto-approve on validation pass
    if (
      isValid &&
      invoice.status === 'needs_review' &&
      typeof (db.invoice as { update?: unknown }).update === 'function'
    ) {
      await db.invoice.update({
        where: { id },
        data: { status: 'validated' },
      });
    }

    // Log audit
    await db.auditLog.create({
      data: {
        userId: invoice.userId,
        action: 'validate',
        resource: 'invoice',
        resourceId: id,
        status: isValid ? 'success' : 'warning',
        details: JSON.stringify({
          errors: errors.length,
          warnings: warnings.length,
        }),
      },
    });

    return NextResponse.json({
      invoiceId: id,
      valid: isValid,
      validationResults,
      errors,
      warnings,
    });
  } catch (error) {
    console.error('[Validate] Error:', error);

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Validation failed',
      },
      { status: 500 }
    );
  }
}

/**
 * Helper: Convert database invoice to SAInvoice type for validation
 */
function dbInvoiceToSAInvoice(invoice: {
  id: string;
  userId: string;
  invoiceLabel: string | null;
  invoiceLabelConfidence: number;
  vendorName: string | null;
  vendorNameConfidence: number;
  vendorAddress: string | null;
  vendorVatNumber: string | null;
  customerName: string | null;
  customerAddress: string | null;
  customerVatNumber: string | null;
  invoiceNumber: string | null;
  invoiceDate: Date | null;
  subtotal: unknown;
  vatAmount: unknown;
  totalAmount: unknown;
  lineItems: Array<{
    id: string;
    description: string;
    quantity: number;
    unitPrice: unknown;
    vatAmount: unknown;
    lineTotal: unknown;
  }>;
  invoiceType: string;
}) {
  return {
    id: invoice.id,
    userId: invoice.userId,
    invoiceLabel: invoice.invoiceLabel ? { value: invoice.invoiceLabel, confidence: invoice.invoiceLabelConfidence } : undefined,
    vendorName: invoice.vendorName ? { value: invoice.vendorName, confidence: invoice.vendorNameConfidence } : undefined,
    vendorAddress: invoice.vendorAddress ? { value: invoice.vendorAddress } : undefined,
    vendorVatNumber: invoice.vendorVatNumber ? { value: invoice.vendorVatNumber } : undefined,
    customerName: invoice.customerName ? { value: invoice.customerName } : undefined,
    customerAddress: invoice.customerAddress ? { value: invoice.customerAddress } : undefined,
    customerVatNumber: invoice.customerVatNumber ? { value: invoice.customerVatNumber } : undefined,
    invoiceNumber: invoice.invoiceNumber ? { value: invoice.invoiceNumber } : undefined,
    invoiceDate: invoice.invoiceDate ? { value: invoice.invoiceDate.toISOString() } : undefined,
    subtotal: invoice.subtotal != null ? { value: Number(invoice.subtotal) / 100 } : undefined,
    vatAmount: invoice.vatAmount != null ? { value: Number(invoice.vatAmount) / 100 } : undefined,
    totalAmount: invoice.totalAmount != null ? { value: Number(invoice.totalAmount) / 100 } : undefined,
    lineItems: invoice.lineItems.map((li) => ({
      id: li.id,
      description: li.description,
      quantity: li.quantity,
      unitPrice: Number(li.unitPrice) / 100,
      vatAmount: Number(li.vatAmount) / 100,
      lineTotal: Number(li.lineTotal) / 100,
    })),
    invoiceType: invoice.invoiceType,
  };
}
