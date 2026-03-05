// ============================================================
// AIRAuto – SA-Specific AI Extraction Prompts
// ============================================================

/**
 * System prompt: instructs the AI to extract SA invoice fields.
 * This is the core of the cheap-first strategy.
 */
export const SA_INVOICE_EXTRACTION_SYSTEM_PROMPT = `You are an expert South African invoice and receipt data extraction system. 
You extract structured data from OCR text of South African tax invoices and receipts.

## South African Context
- Currency: South African Rand (ZAR), symbol: R
- VAT Rate: 15% (standard rate)
- Date Format: Commonly DD/MM/YYYY in South Africa
- VAT Registration Numbers: 10 digits starting with "4"
- SARS requires: "Tax Invoice"/"VAT Invoice" label, supplier VAT number, sequential invoice number, date, description, qty, VAT breakdown

## Required Fields to Extract
1. invoice_label: The document header (e.g., "Tax Invoice", "VAT Invoice", "Invoice")
2. vendor_name: Supplier/vendor business name
3. vendor_address: Supplier physical address
4. vendor_vat_number: Supplier VAT registration number (10 digits, starts with 4)
5. customer_name: Customer/recipient name
6. customer_address: Customer address
7. customer_vat_number: Customer VAT number (if present)
8. invoice_number: Unique sequential invoice/receipt number
9. invoice_date: Date of issue (convert to DD/MM/YYYY format)
10. description: General description of goods/services
11. subtotal: Amount before VAT (in ZAR)
12. vat_rate: VAT percentage (should be 15%)
13. vat_amount: VAT amount (in ZAR)
14. total_amount: Total including VAT (in ZAR)
15. line_items: Array of {description, quantity, unit_price, vat_amount, line_total}
16. bbbee_level: B-BBEE level if mentioned
17. purchase_order_number: PO number if present
18. payment_terms: Payment terms if stated

## Rules
- All monetary values must be numbers (not strings), in ZAR
- Remove currency symbols (R, ZAR) from amounts
- Convert dates to DD/MM/YYYY format
- For each field, provide a confidence score (0.0 to 1.0)
- If a field is not found, set value to null with confidence 0
- Handle VAT-inclusive and VAT-exclusive amounts correctly`;

/**
 * User prompt template: wraps OCR text for extraction.
 */
export function buildExtractionUserPrompt(ocrText: string): string {
    return `Extract all invoice/receipt data from the following South African document text. Return valid JSON only, no markdown.

OCR Text:
---
${ocrText}
---

Return a JSON object with this exact structure:
{
  "invoice_label": {"value": "...", "confidence": 0.0},
  "vendor_name": {"value": "...", "confidence": 0.0},
  "vendor_address": {"value": "...", "confidence": 0.0},
  "vendor_vat_number": {"value": "...", "confidence": 0.0},
  "customer_name": {"value": "...", "confidence": 0.0},
  "customer_address": {"value": "...", "confidence": 0.0},
  "customer_vat_number": {"value": "...", "confidence": 0.0},
  "invoice_number": {"value": "...", "confidence": 0.0},
  "invoice_date": {"value": "DD/MM/YYYY", "confidence": 0.0},
  "description": {"value": "...", "confidence": 0.0},
  "subtotal": {"value": 0.00, "confidence": 0.0},
  "vat_rate": {"value": 15, "confidence": 0.0},
  "vat_amount": {"value": 0.00, "confidence": 0.0},
  "total_amount": {"value": 0.00, "confidence": 0.0},
  "line_items": [
    {"description": "...", "quantity": 1, "unit_price": 0.00, "vat_amount": 0.00, "line_total": 0.00}
  ],
  "bbbee_level": {"value": null, "confidence": 0},
  "purchase_order_number": {"value": null, "confidence": 0},
  "payment_terms": {"value": null, "confidence": 0}
}`;
}

/** Minimum average confidence to avoid escalation to GPT-4o */
export const CONFIDENCE_THRESHOLD = 0.7;

/** Models in cheap-first order */
export const AI_MODELS = {
    cheap: 'gpt-4o-mini' as const,
    powerful: 'gpt-4o' as const,
};
