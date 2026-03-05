import {
  ExtractedField,
  LineItem,
  SAInvoice,
  SA_VAT_RATE,
} from "@/types/invoice";
import { detectVatInclusiveFlag, computeVatFromTotals } from "./normalization";

export interface RuleExtractionResult {
  fields: Partial<SAInvoice>;
  confidences: Record<string, number>;
  lineItems: LineItem[];
  lineItemsConfidence: number;
}

const CONFIDENCE = {
  REGEX: 0.9,
  KEYWORD: 0.8,
  HEURISTIC: 0.6,
} as const;

const CRITICAL_FIELDS = [
  "vendorName",
  "invoiceNumber",
  "invoiceDate",
  "totalAmount",
] as const;

export function extractWithRules(ocrText: string): RuleExtractionResult {
  const text = ocrText;
  const lower = text.toLowerCase();

  const confidences: Record<string, number> = {};
  const result: Partial<SAInvoice> = {
    lineItems: [],
    invoiceType: "full",
    validationResults: [],
    isValid: false,
    id: "",
    userId: "",
    originalFileName: "",
    originalFilePath: "",
    fileType: "pdf",
    uploadedAt: "",
    status: "uploaded",
  };

  // Supplier VAT number near VAT keywords
  const vatMatch = findVatNumber(lower);
  if (vatMatch) {
    result.vendorVatNumber = field(vatMatch.value, CONFIDENCE.KEYWORD);
    confidences.vendorVatNumber = CONFIDENCE.KEYWORD;
  }

  // Invoice number via patterns
  const invoiceNo = findInvoiceNumber(lower);
  if (invoiceNo) {
    result.invoiceNumber = field(invoiceNo, CONFIDENCE.REGEX);
    confidences.invoiceNumber = CONFIDENCE.REGEX;
  }

  // Currency + totals
  const amounts = findCurrencyAmounts(lower);
  if (amounts.total != null) {
    result.totalAmount = numField(amounts.total, CONFIDENCE.REGEX);
    result.currency = field("ZAR", 1.0);
    confidences.totalAmount = CONFIDENCE.REGEX;
  }

  if (amounts.subtotal != null) {
    result.subtotal = numField(amounts.subtotal, CONFIDENCE.HEURISTIC);
    confidences.subtotal = CONFIDENCE.HEURISTIC;
  }

  // VAT calculation based on flags
  const vatMode = detectVatInclusiveFlag(lower);
  const vatCalc = computeVatFromTotals(
    amounts.subtotal ?? null,
    amounts.total ?? null,
    vatMode,
  );
  if (vatCalc.vatAmount != null) {
    result.vatAmount = numField(vatCalc.vatAmount, CONFIDENCE.HEURISTIC);
    confidences.vatAmount = CONFIDENCE.HEURISTIC;
  }

  // Invoice date
  const invoiceDate = findInvoiceDate(lower);
  if (invoiceDate) {
    result.invoiceDate = field(invoiceDate, CONFIDENCE.KEYWORD);
    confidences.invoiceDate = CONFIDENCE.KEYWORD;
  }

  // Supplier name (first prominent line above "vat registration" or "tax invoice")
  const supplierName = findSupplierName(lower);
  if (supplierName) {
    result.vendorName = field(supplierName, CONFIDENCE.KEYWORD);
    confidences.vendorName = CONFIDENCE.KEYWORD;
  }

  // Invoice label
  if (lower.includes("tax invoice") || lower.includes("vat invoice")) {
    result.invoiceLabel = field("Tax Invoice", CONFIDENCE.REGEX);
    confidences.invoiceLabel = CONFIDENCE.REGEX;
  }

  // Line items (best-effort)
  const lineItems = findLineItems(text);

  return {
    fields: result,
    confidences,
    lineItems,
    lineItemsConfidence: lineItems.length > 0 ? CONFIDENCE.HEURISTIC : 0,
  };
}

export function shouldUseAiFallback(result: RuleExtractionResult): boolean {
  return CRITICAL_FIELDS.some((key) => (result.confidences[key] ?? 0) < 0.7);
}

export function mergeRuleAndAiResults(
  ruleResult: RuleExtractionResult,
  aiInvoice: Partial<SAInvoice>,
): Partial<SAInvoice> {
  const merged: Partial<SAInvoice> = {
    ...aiInvoice,
  };

  // Rules win when confidence >= 0.6
  const applyField = <K extends keyof SAInvoice>(key: K) => {
    const conf = ruleResult.confidences[key as string] ?? 0;
    const ruleValue = ruleResult.fields[key];
    if (conf >= 0.6 && ruleValue !== undefined) {
      (merged as Record<string, unknown>)[key as string] = ruleValue as unknown;
    }
  };

  const keys: (keyof SAInvoice)[] = [
    "vendorName",
    "vendorVatNumber",
    "invoiceNumber",
    "invoiceDate",
    "subtotal",
    "vatAmount",
    "totalAmount",
    "currency",
    "invoiceLabel",
  ];

  keys.forEach(applyField);

  if (ruleResult.lineItems.length > 0 && ruleResult.lineItemsConfidence >= 0.6) {
    merged.lineItems = ruleResult.lineItems;
  }

  return merged;
}

function field(value: string, confidence: number): ExtractedField {
  return {
    value,
    confidence,
    level: confidence >= 0.8 ? "high" : confidence >= 0.5 ? "medium" : "low",
    source: "ocr",
  };
}

function numField(value: number, confidence: number): ExtractedField<number> {
  return {
    value,
    confidence,
    level: confidence >= 0.8 ? "high" : confidence >= 0.5 ? "medium" : "low",
    source: "ocr",
  };
}

function findVatNumber(text: string): { value: string } | null {
  const vatRegex = /\b(vat(?:\s*(reg(istration)?|no|number)?)?)[\s:]*([0-9]{10})\b/gi;
  let match: RegExpExecArray | null;
  while ((match = vatRegex.exec(text))) {
    const value = match[4];
    // crude filter to avoid phone numbers (look for "tel" etc.)
    const window = text.slice(Math.max(0, match.index - 40), match.index + 40);
    if (!/tel|cell|phone/.test(window)) {
      return { value };
    }
  }
  return null;
}

function findInvoiceNumber(text: string): string | null {
  const re =
    /(invoice\s*(no|number)?|inv\s*(no)?|doc(?:ument)?\s*(no|ref)?|reference)[\s:]*([a-z0-9\-\/]+)/gi;
  const match = re.exec(text);
  return match ? match[5] : null;
}

function findCurrencyAmounts(text: string): {
  subtotal: number | null;
  total: number | null;
} {
  const currencyRe = /(subtotal|total|vat)[\s:]*r?\s?(\d{1,3}(?:[ ,]\d{3})*(?:[.,]\d{2})?|\d+)/gi;
  let match: RegExpExecArray | null;
  let subtotal: number | null = null;
  let total: number | null = null;

  while ((match = currencyRe.exec(text))) {
    const label = match[1].toLowerCase();
    const amount = Number(
      match[2].replace(/[, ]/g, "").replace(",", "."),
    );
    if (!Number.isFinite(amount)) continue;
    if (label.startsWith("subtotal")) subtotal = amount;
    if (label.startsWith("total")) total = amount;
  }

  return { subtotal, total };
}

function findInvoiceDate(text: string): string | null {
  const dateRe = /\b(\d{4}-\d{2}-\d{2})\b/g;
  let match: RegExpExecArray | null;
  while ((match = dateRe.exec(text))) {
    const idx = match.index;
    const window = text.slice(Math.max(0, idx - 40), idx + 40);
    if (/invoice date|date issued|tax invoice date/.test(window)) {
      return match[1];
    }
  }
  // fallback: first ISO-like date
  match = dateRe.exec(text);
  return match ? match[1] : null;
}

function findSupplierName(text: string): string | null {
  const lines = text.split(/\n/);
  const idx = lines.findIndex((l) =>
    l.includes("vat registration") || l.includes("vat reg"),
  );
  if (idx > 0) {
    const candidate = lines[idx - 1].trim();
    if (candidate.length > 3) {
      return candidate;
    }
  }
  return null;
}

function findLineItems(text: string): LineItem[] {
  const lines = text.split(/\n/).map((l) => l.trim());
  const items: LineItem[] = [];
  const headerIndex = lines.findIndex(
    (l) =>
      /description/i.test(l) &&
      /qty|quantity/i.test(l) &&
      /unit price/i.test(l) &&
      /total/i.test(l),
  );
  if (headerIndex === -1) return items;

  for (let i = headerIndex + 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line || /^[-_=]+$/.test(line)) continue;
    const match =
      /(.*?)(\d+(?:\.\d+)?)\s+r?\s?(\d+(?:\.\d+)?)\s+r?\s?(\d+(?:\.\d+)?)/i.exec(
        line,
      );
    if (!match) continue;
    const description = match[1].trim();
    const quantity = Number(match[2]);
    const unitPrice = Number(match[3]);
    const lineTotal = Number(match[4]);
    if (!description || !Number.isFinite(quantity) || !Number.isFinite(unitPrice)) {
      continue;
    }
    const vatAmount = +(lineTotal - quantity * unitPrice).toFixed(2);
    items.push({
      id: `${i}`,
      description,
      quantity,
      unitPrice,
      vatAmount,
      lineTotal,
    });
  }

  return items;
}

