import { normalizeOcrText, detectVatInclusiveFlag } from "@/lib/rules/normalization";

describe("rules/normalization", () => {
  it("lowercases and collapses whitespace", () => {
    const input = "TAX   INVOICE \n\n VAT   Number";
    const out = normalizeOcrText(input);
    expect(out.normalized).toBe("tax invoice vat number");
  });

  it("normalizes ZAR amounts into r1234.56 form", () => {
    const input = "Total: R 1 250\nSubtotal: ZAR1250\nOther: R1,250.00";
    const out = normalizeOcrText(input);
    expect(out.normalized).toContain("r1250.00");
  });

  it("normalizes dates into ISO YYYY-MM-DD", () => {
    const input = "Date: 05/03/2026\nIssued: 05-03-2026";
    const out = normalizeOcrText(input);
    expect(out.normalized).toContain("2026-03-05");
  });

  it("detects VAT inclusive/exclusive flags", () => {
    expect(detectVatInclusiveFlag("VAT inclusive")).toBe("inclusive");
    expect(detectVatInclusiveFlag("VAT Exclusive")).toBe("exclusive");
    expect(detectVatInclusiveFlag("standard vat")).toBe("unknown");
  });
});

