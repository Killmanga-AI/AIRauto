import {
  extractWithRules,
  mergeRuleAndAiResults,
  shouldUseAiFallback,
} from "@/lib/rules/extraction";

describe("rules/extraction", () => {
  it("extracts VAT number near VAT keywords", () => {
    const text = "tax invoice vat registration: 4123456789";
    const r = extractWithRules(text);
    expect(r.fields.vendorVatNumber?.value).toBe("4123456789");
    expect(r.confidences.vendorVatNumber).toBeGreaterThanOrEqual(0.8);
  });

  it("extracts invoice number using reference patterns", () => {
    const text = "invoice no: inv-2026-0042 total: r4536.75";
    const r = extractWithRules(text);
    expect(r.fields.invoiceNumber?.value).toBe("inv-2026-0042");
  });

  it("triggers AI fallback when critical fields are low confidence", () => {
    const text = "total: r4536.75"; // missing invoice number/date/vendor
    const r = extractWithRules(text);
    expect(shouldUseAiFallback(r)).toBe(true);
  });

  it("merge: rules override AI when rule confidence >= 0.6", () => {
    const r = extractWithRules(
      "vat registration: 4123456789 invoice no: inv-1 total: r100.00",
    );

    const aiInvoice = {
      vendorVatNumber: { value: "4999999999", confidence: 0.9, level: "high", source: "ai" as const },
      invoiceNumber: { value: "ai-override", confidence: 0.9, level: "high", source: "ai" as const },
    };

    const merged = mergeRuleAndAiResults(r, aiInvoice);
    expect(merged.vendorVatNumber?.value).toBe("4123456789");
    expect(merged.invoiceNumber?.value).toBe("inv-1");
  });
});

