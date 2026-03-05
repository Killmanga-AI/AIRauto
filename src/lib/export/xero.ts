// ============================================================
// AIRAuto – Xero Integration Stub
// ============================================================

import { SAInvoice } from '@/types/invoice';

/**
 * Xero API integration stub.
 * Popular among tech-savvy SA SMEs.
 * 
 * Real integration requires:
 * - Xero Developer App (https://developer.xero.com)
 * - OAuth 2.0 + PKCE flow
 * - Xero Accounting API v2
 * 
 * Note: Xero handles SA VAT and bank feeds but
 * may need manual export for SARS-specific reporting.
 */

export interface XeroExportResult {
    success: boolean;
    xeroInvoiceId?: string;
    message: string;
}

export async function exportToXero(invoices: SAInvoice[]): Promise<XeroExportResult> {
    console.log(`[Xero Stub] Would export ${invoices.length} invoices to Xero`);

    return {
        success: false,
        message: 'Xero integration not yet configured. Please add Xero API credentials in Settings → Integrations.',
    };
}

export function mapToXeroFormat(invoice: SAInvoice): Record<string, unknown> {
    return {
        Type: 'ACCPAY',
        Contact: { Name: invoice.vendorName?.value },
        InvoiceNumber: invoice.invoiceNumber?.value,
        Date: invoice.invoiceDate?.value,
        CurrencyCode: 'ZAR',
        LineAmountTypes: 'Exclusive',
        LineItems: invoice.lineItems.map((li) => ({
            Description: li.description,
            Quantity: li.quantity,
            UnitAmount: li.unitPrice,
            TaxAmount: li.vatAmount,
            LineAmount: li.lineTotal,
            TaxType: 'OUTPUT',
        })),
    };
}
