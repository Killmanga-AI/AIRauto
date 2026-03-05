// ============================================================
// AIRAuto – QuickBooks Integration Stub
// ============================================================

import { SAInvoice } from '@/types/invoice';

/**
 * QuickBooks Online API integration stub.
 * QuickBooks is widely used among SA SMEs for accounting.
 * 
 * Real integration requires:
 * - Intuit Developer Account (https://developer.intuit.com)
 * - OAuth 2.0 credentials
 * - QuickBooks Online REST API (v2)
 * 
 * SA Tax Notes:
 * - QuickBooks supports ZAR (South African Rand)
 * - Can track VAT for SARS compliance
 * - Integrates with bank feeds for reconciliation
 */

export interface QuickBooksExportResult {
  success: boolean;
  quickBooksInvoiceId?: string;
  message: string;
}

export async function exportToQuickBooks(
  invoices: SAInvoice[]
): Promise<QuickBooksExportResult> {
  // TODO: Implement real QuickBooks API integration
  console.log(`[QuickBooks Stub] Would export ${invoices.length} invoices to QuickBooks Online`);

  return {
    success: false,
    message: 'QuickBooks integration not yet configured. Please add QuickBooks API credentials in Settings → Integrations.',
  };
}

export function mapToQuickBooksFormat(invoice: SAInvoice): Record<string, unknown> {
  return {
    DocNumber: invoice.invoiceNumber?.value,
    TxnDate: invoice.invoiceDate?.value,
    CustomerRef: {
      name: invoice.vendorName?.value,
    },
    BillAddr: {
      Line1: invoice.vendorAddress?.value,
      CountrySubDivisionCode: 'ZA',
    },
    TxnTaxDetail: {
      TxnTaxDetailEx: [],
      TotalTax: invoice.vatAmount?.value,
    },
    Line: invoice.lineItems.map((li) => ({
      DetailType: 'DescriptionLineDetail',
      Description: li.description,
      Amount: li.lineTotal,
    })),
    CurrencyRef: {
      value: 'ZAR',
    },
    // SA VAT tracking
    CustomField: [
      {
        Name: 'VAT_Number',
        StringValue: invoice.vendorVatNumber?.value,
      },
      {
        Name: 'Invoice_Type_SARS',
        StringValue: invoice.invoiceType,
      },
    ],
  };
}

/**
 * Placeholder for webhook handling if QuickBooks sends
 * change notifications back to AIRAuto.
 */
export async function handleQuickBooksWebhook(payload: Record<string, unknown>): Promise<void> {
  console.log('[QuickBooks] Webhook received:', payload);
  // TODO: Process webhook events (invoice synced, customer updated, etc.)
}
