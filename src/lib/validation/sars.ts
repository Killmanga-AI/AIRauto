// ============================================================
// AIRAuto – SARS Tax Invoice Validation Engine
// ============================================================

import {
    SAInvoice,
    InvoiceType,
    ValidationResult,
    SARS_THRESHOLDS,
} from '@/types/invoice';
import { validateVatAmount } from './vat';

/**
 * Classify invoice type based on total amount (ZAR)
 * per SARS requirements:
 *   - Full Tax Invoice: > R5,000
 *   - Abridged Tax Invoice: R50 – R5,000
 *   - No Invoice Required: ≤ R50
 */
export function classifyInvoiceType(totalAmount: number): InvoiceType {
    if (totalAmount > SARS_THRESHOLDS.FULL_INVOICE_MIN) return 'full';
    if (totalAmount > SARS_THRESHOLDS.ABRIDGED_INVOICE_MIN) return 'abridged';
    return 'no_invoice_required';
}

/**
 * Validate a South African tax invoice against SARS requirements.
 * Returns an array of validation results with errors, warnings, and info.
 */
export function validateSARSInvoice(invoice: SAInvoice): ValidationResult[] {
    const results: ValidationResult[] = [];
    const invoiceType = classifyInvoiceType(
        invoice.totalAmount?.value ?? 0
    );

    // ── 1. Invoice Label ──────────────────────────────────
    const label = invoice.invoiceLabel?.value?.toLowerCase() ?? '';
    const validLabels = ['tax invoice', 'vat invoice', 'invoice'];
    if (!validLabels.some((l) => label.includes(l))) {
        results.push({
            field: 'invoiceLabel',
            valid: false,
            message: 'Invoice must display "Tax Invoice", "VAT Invoice", or "Invoice"',
            severity: 'error',
        });
    } else {
        results.push({
            field: 'invoiceLabel',
            valid: true,
            message: `Invoice label "${invoice.invoiceLabel?.value}" detected`,
            severity: 'info',
        });
    }

    // ── 2. Supplier VAT Number ────────────────────────────
    if (!invoice.vendorVatNumber?.value) {
        results.push({
            field: 'vendorVatNumber',
            valid: false,
            message: 'Supplier VAT registration number is required',
            severity: 'error',
        });
    } else if (!isValidSAVatNumber(invoice.vendorVatNumber.value)) {
        results.push({
            field: 'vendorVatNumber',
            valid: false,
            message: `VAT number "${invoice.vendorVatNumber.value}" does not match SA format (10 digits starting with 4)`,
            severity: 'error',
        });
    } else {
        results.push({
            field: 'vendorVatNumber',
            valid: true,
            message: `Valid SA VAT number: ${invoice.vendorVatNumber.value}`,
            severity: 'info',
        });
    }

    // ── 3. Supplier Name & Address ────────────────────────
    if (!invoice.vendorName?.value) {
        results.push({
            field: 'vendorName',
            valid: false,
            message: 'Supplier name is required',
            severity: 'warning',
        });
    }
    if (!invoice.vendorAddress?.value) {
        results.push({
            field: 'vendorAddress',
            valid: false,
            message: 'Supplier address is required',
            severity: 'warning',
        });
    }

    // ── 4. Customer Details (Full Invoice Only) ───────────
    if (invoiceType === 'full') {
        if (!invoice.customerName?.value) {
            results.push({
                field: 'customerName',
                valid: false,
                message: 'Customer name required for Full Tax Invoice (> R5,000)',
                severity: 'warning',
            });
        }
        if (!invoice.customerVatNumber?.value) {
            results.push({
                field: 'customerVatNumber',
                valid: false,
                message: 'Customer VAT number required for Full Tax Invoice (> R5,000)',
                severity: 'warning',
            });
        }
    }

    // ── 5. Invoice Number (Sequential) ────────────────────
    if (!invoice.invoiceNumber?.value) {
        results.push({
            field: 'invoiceNumber',
            valid: false,
            message: 'Unique sequential invoice number is required',
            severity: 'warning',
        });
    }

    // ── 6. Invoice Date ───────────────────────────────────
    if (!invoice.invoiceDate?.value) {
        results.push({
            field: 'invoiceDate',
            valid: false,
            message: 'Invoice date is required',
            severity: 'warning',
        });
    }

    // ── 7. Description of Goods/Services ──────────────────
    if (!invoice.description?.value && invoice.lineItems.length === 0) {
        results.push({
            field: 'description',
            valid: false,
            message: 'Description of goods or services is required',
            severity: 'warning',
        });
    }

    // ── 8. Quantities ─────────────────────────────────────
    if (invoice.lineItems.length > 0) {
        const missingQty = invoice.lineItems.some((li) => !li.quantity);
        if (missingQty) {
            results.push({
                field: 'lineItems.quantity',
                valid: false,
                message: 'Quantity is required for each line item',
                severity: 'warning',
            });
        }
    }

    // ── 9. VAT Breakdown ─────────────────────────────────
    const hasSubtotal = invoice.subtotal?.value !== undefined;
    const hasVat = invoice.vatAmount?.value !== undefined;
    const hasTotal = invoice.totalAmount?.value !== undefined;
    const hasRate = invoice.vatRate?.value !== undefined;

    if (hasSubtotal && hasVat && hasTotal && hasRate) {
        const vatCheck = validateVatAmount({
            subtotal: invoice.subtotal!.value!,
            vat: invoice.vatAmount!.value!,
            total: invoice.totalAmount!.value!,
            vatRate: invoice.vatRate!.value!,
        });
        results.push({
            field: 'vatAmount',
            valid: vatCheck.valid,
            message: vatCheck.error ?? 'VAT calculation verified',
            severity: vatCheck.valid ? 'info' : 'warning',
        });
    } else if (!hasSubtotal && hasVat && hasTotal && hasRate) {
        // When only total and VAT are available, perform a simpler sanity check:
        // treat VAT as a percentage of the total.
        const total = invoice.totalAmount!.value!;
        const vat = invoice.vatAmount!.value!;
        const rate = invoice.vatRate!.value!;
        const expectedVatFromTotal = Math.round(total * rate * 100) / 100;
        const withinTolerance = Math.abs(vat - expectedVatFromTotal) <= 1.0;

        results.push({
            field: 'vatAmount',
            valid: withinTolerance,
            message: withinTolerance
                ? null
                : `VAT mismatch against total: expected ~R${expectedVatFromTotal.toFixed(
                      2,
                  )} but received R${vat.toFixed(2)}`,
            severity: withinTolerance ? 'info' : 'warning',
        });
    }

    // ── 10. Invoice Type Classification ───────────────────
    results.push({
        field: 'invoiceType',
        valid: true,
        message: `Classified as ${invoiceType === 'full' ? 'Full Tax Invoice (> R5,000)' : invoiceType === 'abridged' ? 'Abridged Tax Invoice (R50 – R5,000)' : 'No Invoice Required (≤ R50)'}`,
        severity: 'info',
    });

    return results;
}

/**
 * SA VAT registration numbers:
 * - 10 digits
 * - Start with "4" prefix
 */
function isValidSAVatNumber(vatNumber: string): boolean {
    const cleaned = vatNumber.replace(/[\s-]/g, '');
    return /^4\d{9}$/.test(cleaned);
}

/** Get overall validation status */
export function getValidationSummary(results: ValidationResult[]): {
    totalChecks: number;
    errors: number;
    warnings: number;
    passed: boolean;
} {
    const errors = results.filter((r) => !r.valid && r.severity === 'error').length;
    const warnings = results.filter((r) => !r.valid && r.severity === 'warning').length;
    return {
        totalChecks: results.length,
        errors,
        warnings,
        passed: errors === 0,
    };
}
