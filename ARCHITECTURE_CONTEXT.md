## AIRAuto Extraction & Validation Context

You are a senior fintech backend engineer building a production-grade invoice automation platform for the South African SME market called **AIRAuto**.

### Extraction Pipeline (Authoritative Order)

The asynchronous BullMQ worker must implement this exact sequence:

1. **File Upload** – via Next.js API, with audit log entries.
2. **File Storage** – encrypted at rest (local dev abstraction, S3-ready).
3. **OCR Processing** – server-side `tesseract` via `node-tesseract-ocr`:
   - Languages: English + Afrikaans.
   - Config: `tessedit_pageseg_mode = 1`, `preserve_interword_spaces = 1`.
4. **Text Normalization** – lowercasing, whitespace collapsing, and normalization of:
   - ZAR currency (`R` / `ZAR`) into `R1234.56`.
   - Dates into ISO `YYYY-MM-DD`.
5. **Rule-Based Field Extraction (primary)** – deterministic regex + keyword rules for:
   - `supplierName`, `supplierVatNumber`, `invoiceNumber`, `invoiceDate`,
     `lineItems`, `subtotal`, `vatAmount`, `totalAmount`, `currency`, `invoiceLabel`.
   - SA VAT numbers: 10 digits, located near `VAT`, `VAT REG`, `VAT NUMBER`, `VAT NO`; avoid phone numbers.
   - Invoice numbers: patterns like `invoice no`, `inv #`, `doc ref`, `reference`.
   - Currency: `R` / `ZAR` amounts with thousands separators and cents.
   - Dates: `DD/MM/YYYY`, `DD-MM-YYYY`, `YYYY-MM-DD`, biased towards `invoice date` / `date issued`.
   - Line items: rows with description, quantity, unit price, total.
6. **Confidence Scoring** per field (0.0–1.0):
   - Regex match: `0.9`
   - Keyword proximity: `0.8`
   - Heuristic guess: `0.6`
7. **AI Extraction Fallback (only if needed)** – OpenAI, JSON-only, cheap-first:
   - Trigger only when any critical field (`supplierName`, `invoiceNumber`,
     `invoiceDate`, `totalAmount`) has confidence `< 0.7`.
   - First attempt: `gpt-4o-mini`.
   - If still low: retry with `gpt-4o`.
   - Always request strict JSON with:
     ```json
     {
       "supplierName": "",
       "supplierVatNumber": "",
       "invoiceNumber": "",
       "invoiceDate": "",
       "subtotal": 0,
       "vatAmount": 0,
       "totalAmount": 0,
       "currency": "ZAR",
       "lineItems": []
     }
     ```
   - Reject non-JSON or malformed responses.
8. **Field Merging** – rules always win unless their confidence `< 0.6`:
   - High-confidence rule fields are never overridden by AI.
   - AI may only overwrite low-confidence rule fields or fill gaps.
9. **SARS Validation** – use the SARS engine to enforce:
   - Required: "Tax Invoice" label, supplier name + VAT number, unique invoice number,
     invoice date, description, quantity/volume, value of supply, VAT charged.
   - Classification by total: full (> R5,000), abridged (R50–R5,000), no invoice required (< R50).
   - VAT math: rate `15%`, with tolerance `±0.02` and special handling for
     "VAT inclusive" vs "VAT exclusive".
   - Return:
     ```ts
     { status: "valid" | "needs_review"; errors: ValidationResult[]; warnings: ValidationResult[] }
     ```
10. **Persistence to Database (Prisma)** – store, at minimum:
    - `rawFilePath`, `ocrText`, `extractedFields` (JSON), `validationReport` (JSON),
      `confidenceScore`, `aiModelUsed`, `processingCostEstimate`.
11. **Export Readiness** – mark invoices as ready for downstream CSV/Sage/Xero/QuickBooks export.

### VAT & Currency Rules

- Standard SA VAT rate: `15%` (`SA_VAT_RATE`).
- If invoice states **VAT Inclusive**:
  - `vatAmount = total * 0.13043478` (15% of VAT-inclusive).
- If invoice states **VAT Exclusive**:
  - `vatAmount = subtotal * 0.15`.
- Always check that `subtotal + vatAmount ≈ totalAmount` with tolerance `±0.02`.

### Queue & Performance

- BullMQ + Redis, 5 concurrent workers, 3 retries with exponential backoff.
- Target: < 10 seconds per invoice under normal load.
- Support batch uploads of up to 100 invoices.

### Error Handling & Compliance

- Handle gracefully:
  - OCR failures, AI API failures, invalid JSON, missing required fields, worker crashes.
- If retries are exhausted, mark invoice as `needs_manual_review`.
- POPIA:
  - Encrypted file storage (AES-256 or equivalent in production).
  - Audit log entries for uploads, edits, exports, deletions.
  - Retain invoice data for at least 5 years.

### Coding Principles

- Strong preference for **deterministic, rule-based extraction**.
- AI is a **fallback only** and must never override high-confidence rule results.
- All extraction/normalisation/validation logic lives in unit-testable modules under:
  - `lib/ocr`, `lib/rules`, `lib/ai`, `lib/validation`, `lib/export`, `lib/workers`.
- Next.js 14 App Router + TypeScript + Prisma + BullMQ + Redis + `node-tesseract-ocr`.

