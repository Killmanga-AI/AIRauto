// ============================================================
// AIRAuto – CSV Export with SA Formatting
// ============================================================

import { SAInvoice } from '@/types/invoice';
import { formatZAR } from '@/lib/validation/vat';

export interface CsvExportOptions {
    dateFormat: 'DD/MM/YYYY' | 'YYYY-MM-DD';
    includeLineItems: boolean;
    separator: ',' | ';';
}

const DEFAULT_OPTIONS: CsvExportOptions = {
    dateFormat: 'DD/MM/YYYY',
    includeLineItems: true,
    separator: ',',
};

/**
 * Export invoices to CSV with SA-standard columns.
 * Formats: Date (DD/MM/YYYY), Vendor, VAT Number, Invoice Number,
 * Subtotal, VAT (15%), Total (ZAR)
 */
export function exportToCsv(
    invoices: SAInvoice[],
    options: Partial<CsvExportOptions> = {}
): string {
    const opts = { ...DEFAULT_OPTIONS, ...options };
    const sep = opts.separator;
    const lines: string[] = [];

    // Header
    const headers = [
        'Invoice Date',
        'Vendor Name',
        'Vendor VAT Number',
        'Customer Name',
        'Invoice Number',
        'Invoice Type',
        'Description',
        'Subtotal (ZAR)',
        'VAT Rate',
        'VAT Amount (ZAR)',
        'Total (ZAR)',
        'B-BBEE Level',
        'Status',
    ];

    if (opts.includeLineItems) {
        headers.push(
            'Line Item',
            'Item Description',
            'Quantity',
            'Unit Price (ZAR)',
            'Item VAT (ZAR)',
            'Item Total (ZAR)'
        );
    }

    lines.push(headers.join(sep));

    // Data rows
    for (const inv of invoices) {
        const baseRow = [
            escCsv(inv.invoiceDate?.value ?? ''),
            escCsv(inv.vendorName?.value ?? ''),
            escCsv(inv.vendorVatNumber?.value ?? ''),
            escCsv(inv.customerName?.value ?? ''),
            escCsv(inv.invoiceNumber?.value ?? ''),
            inv.invoiceType === 'full' ? 'Full Tax Invoice' :
                inv.invoiceType === 'abridged' ? 'Abridged Tax Invoice' : 'N/A',
            escCsv(inv.description?.value ?? ''),
            (inv.subtotal?.value ?? 0).toFixed(2),
            `${inv.vatRate?.value ?? 15}%`,
            (inv.vatAmount?.value ?? 0).toFixed(2),
            (inv.totalAmount?.value ?? 0).toFixed(2),
            escCsv(inv.bbbeeLevel?.value ?? ''),
            inv.status,
        ];

        if (opts.includeLineItems && inv.lineItems.length > 0) {
            inv.lineItems.forEach((li, idx) => {
                const row = [
                    ...baseRow,
                    String(idx + 1),
                    escCsv(li.description),
                    String(li.quantity),
                    li.unitPrice.toFixed(2),
                    li.vatAmount.toFixed(2),
                    li.lineTotal.toFixed(2),
                ];
                lines.push(row.join(sep));
            });
        } else {
            if (opts.includeLineItems) {
                lines.push([...baseRow, '', '', '', '', '', ''].join(sep));
            } else {
                lines.push(baseRow.join(sep));
            }
        }
    }

    return lines.join('\n');
}

// Backwards-compatible alias for older imports
export { exportToCsv as exportToCSV };

/** Escape CSV field */
function escCsv(value: string): string {
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
        return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
}
