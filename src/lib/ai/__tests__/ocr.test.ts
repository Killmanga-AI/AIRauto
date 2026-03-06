import { runOcr } from "@/lib/ai/ocr";

jest.mock("node-tesseract-ocr", () => ({
  recognize: jest.fn(),
}));

import tesseract from "node-tesseract-ocr";

describe("ai/ocr", () => {
  it("returns OCR text from node-tesseract-ocr with config", async () => {
    (tesseract as any).recognize.mockResolvedValueOnce("TAX INVOICE\nTOTAL R100.00");

    const res = await runOcr("file.png");
    expect(res.text).toContain("TAX INVOICE");
    expect(res.language).toBe("eng");
    expect(res.confidence).toBeGreaterThan(0);
  });

  it("falls back to demo result on OCR failure", async () => {
    jest.spyOn(console, "error").mockImplementation(() => {});
    (tesseract as any).recognize.mockRejectedValueOnce(new Error("no tesseract"));
    const res = await runOcr("file.png");
    expect(res.text.toLowerCase()).toContain("tax invoice");
  });
});

