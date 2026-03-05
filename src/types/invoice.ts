// ============================================================
// AIRAuto – South Africa Invoice & Receipt Types
// ============================================================

/** SARS Invoice Classification */
export type InvoiceType = 'full' | 'abridged' | 'no_invoice_required';

/** Processing status through the async pipeline */
export type ProcessingStatus =
  | 'uploaded'
  | 'queued'
  | 'ocr_processing'
  | 'ai_extracting'
  | 'needs_review'
  | 'validated'
  | 'exported'
  | 'failed';

/** Confidence level for AI-extracted fields */
export type ConfidenceLevel = 'high' | 'medium' | 'low';

/** SA VAT rate */
export const SA_VAT_RATE = 0.15;

/** SARS Invoice thresholds (ZAR) */
export const SARS_THRESHOLDS = {
  FULL_INVOICE_MIN: 5000,       // > R5,000 requires full tax invoice
  ABRIDGED_INVOICE_MIN: 50,     // R50 – R5,000 allows abridged
  NO_INVOICE_MAX: 50,           // ≤ R50 no invoice required
} as const;

/** Individual extracted field with confidence */
export interface ExtractedField<T = string> {
  value: T;
  confidence: number;        // 0.0 – 1.0
  level: ConfidenceLevel;
  source: 'ocr' | 'ai' | 'user_corrected';
}

/** Line item on an invoice */
export interface LineItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;          // ZAR
  vatAmount: number;          // ZAR
  lineTotal: number;          // ZAR (inclusive)
}

/** SARS Validation result for a single field */
export interface ValidationResult {
  field: string;
  valid: boolean;
  message: string;
  severity: 'error' | 'warning' | 'info';
}

/** Complete SA invoice data model */
export interface SAInvoice {
  // Identity
  id: string;
  userId: string;

  // Raw data
  originalFileName: string;
  originalFilePath: string;
  fileType: 'pdf' | 'jpg' | 'png';
  uploadedAt: string;

  // Processing
  status: ProcessingStatus;
  processingStartedAt?: string;
  processingCompletedAt?: string;
  aiModel?: string;                // Which model was used (gpt-4o-mini vs gpt-4o)
  ocrRawText?: string;

  // Extracted fields (SA-specific)
  invoiceLabel?: ExtractedField;                   // "Tax Invoice" / "VAT Invoice"
  vendorName?: ExtractedField;
  vendorAddress?: ExtractedField;
  vendorVatNumber?: ExtractedField;                // SA VAT reg number
  customerName?: ExtractedField;
  customerAddress?: ExtractedField;
  customerVatNumber?: ExtractedField;
  invoiceNumber?: ExtractedField;                  // Sequential serial number
  invoiceDate?: ExtractedField;                    // DD/MM/YYYY
  description?: ExtractedField;
  
  // Financial (ZAR)
  subtotal?: ExtractedField<number>;
  vatRate?: ExtractedField<number>;                // Should be 15%
  vatAmount?: ExtractedField<number>;
  totalAmount?: ExtractedField<number>;
  currency?: ExtractedField;                       // Should be ZAR/R

  // Line items
  lineItems: LineItem[];

  // SA Classification
  invoiceType: InvoiceType;                        // Full / Abridged / No Invoice
  
  // Optional SA fields
  bbbeeLevel?: ExtractedField;                     // B-BBEE level if present
  purchaseOrderNumber?: ExtractedField;
  paymentTerms?: ExtractedField;

  // Validation
  validationResults: ValidationResult[];
  isValid: boolean;
  validatedAt?: string;
  validatedBy?: string;

  // Export
  exportedAt?: string;
  exportedTo?: string;                             // 'csv' | 'sage' | 'xero' | 'quickbooks'
}

/** Upload request */
export interface UploadRequest {
  files: File[];
}

/** API response wrapper */
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

/** Export options */
export interface ExportOptions {
  invoiceIds: string[];
  destination: 'csv' | 'sage' | 'xero' | 'quickbooks';
  dateFormat?: 'DD/MM/YYYY' | 'YYYY-MM-DD';
  includeLineItems?: boolean;
}

/** Dashboard statistics */
export interface DashboardStats {
  totalInvoices: number;
  processedToday: number;
  needsReview: number;
  totalVatCollected: number;     // ZAR
  accuracyRate: number;          // percentage
  avgProcessingTime: number;     // seconds
}
