import { SA_VAT_RATE } from "@/types/invoice";

export interface NormalizedText {
  raw: string;
  normalized: string;
}

/**
 * Normalize OCR text for rule-based extraction:
 * - lowercase
 * - collapse whitespace
 * - normalize common currency and date formats
 */
export function normalizeOcrText(text: string): NormalizedText {
  const raw = text ?? "";
  let normalized = raw.toLowerCase();

  // Collapse whitespace
  normalized = normalized.replace(/\s+/g, " ").trim();

  // Normalize currency formats for ZAR (R / ZAR)
  // Examples:
  //   "R 1 250" → "R1250.00"
  //   "R1,250"  → "R1250.00"
  //   "ZAR1250" → "R1250.00"
  normalized = normalized.replace(
    /\b(zar|r)\s?(\d{1,3}(?:[ ,]\d{3})*(?:[.,]\d{2})?|\d+)(?!\d)/gi,
    (_match, _cur, amount) => {
      const numeric = Number(
        String(amount).replace(/[, ]/g, "").replace(",", "."),
      );
      const value = Number.isFinite(numeric) ? numeric : 0;
      return `r${value.toFixed(2)}`;
    },
  );

  // Normalize dates: DD/MM/YYYY, DD-MM-YYYY → YYYY-MM-DD
  normalized = normalized.replace(
    /\b(\d{2})[\/-](\d{2})[\/-](\d{4})\b/g,
    (_m, d, m, y) => `${y}-${m}-${d}`,
  );

  return { raw, normalized };
}

export function detectVatInclusiveFlag(text: string): "inclusive" | "exclusive" | "unknown" {
  const lower = text.toLowerCase();
  if (lower.includes("vat inclusive") || lower.includes("incl. vat")) {
    return "inclusive";
  }
  if (lower.includes("vat exclusive") || lower.includes("excl. vat")) {
    return "exclusive";
  }
  return "unknown";
}

export function computeVatFromTotals(
  subtotal: number | null,
  total: number | null,
  mode: "inclusive" | "exclusive" | "unknown",
): { vatAmount: number | null; subtotal: number | null; total: number | null } {
  if (subtotal != null && total != null) {
    return { subtotal, total, vatAmount: +(total - subtotal).toFixed(2) };
  }

  if (total != null && mode === "inclusive") {
    const vatAmount = +(total * (SA_VAT_RATE / (1 + SA_VAT_RATE))).toFixed(2);
    const computedSubtotal = +(total - vatAmount).toFixed(2);
    return { subtotal: computedSubtotal, total, vatAmount };
  }

  if (subtotal != null && mode === "exclusive") {
    const vatAmount = +(subtotal * SA_VAT_RATE).toFixed(2);
    const computedTotal = +(subtotal + vatAmount).toFixed(2);
    return { subtotal, total: computedTotal, vatAmount };
  }

  return { subtotal, total, vatAmount: null };
}

