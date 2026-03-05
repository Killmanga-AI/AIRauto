// ============================================================
// AIRAuto – OpenAI GPT Extraction (Cheap-First Strategy)
// ============================================================

import OpenAI from 'openai';
import {
    SAInvoice,
    ExtractedField,
    ConfidenceLevel,
    LineItem,
} from '@/types/invoice';
import {
    SA_INVOICE_EXTRACTION_SYSTEM_PROMPT,
    buildExtractionUserPrompt,
    CONFIDENCE_THRESHOLD,
    AI_MODELS,
} from './prompts';
import { classifyInvoiceType } from '@/lib/validation/sars';
import { v4 as uuidv4 } from 'uuid';

/** Extraction result with metadata */
export interface ExtractionResult {
    invoice: Partial<SAInvoice>;
    modelUsed: string;
    escalated: boolean;
    totalTokens: number;
    processingTimeMs: number;
}

/**
 * Extract invoice data from OCR text using cheap-first AI strategy:
 * 1. Try GPT-4o-mini (fast, cheap)
 * 2. If avg confidence < threshold → escalate to GPT-4o
 */
export async function extractInvoiceData(
    ocrText: string,
    invoiceId: string
): Promise<ExtractionResult> {
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
        console.warn('[Extractor] No OPENAI_API_KEY set. Using demo extraction.');
        return getDemoExtraction(invoiceId);
    }

    const openai = new OpenAI({ apiKey });
    const start = Date.now();

    // Step 1: Try cheap model first
    let result = await callGPT(openai, ocrText, AI_MODELS.cheap);
    let escalated = false;

    // Step 2: Check confidence — escalate if needed
    if (result.avgConfidence < CONFIDENCE_THRESHOLD) {
        console.log(
            `[Extractor] Low confidence (${result.avgConfidence.toFixed(2)}) from ${AI_MODELS.cheap}. Escalating to ${AI_MODELS.powerful}.`
        );
        result = await callGPT(openai, ocrText, AI_MODELS.powerful);
        escalated = true;
    }

    const elapsed = Date.now() - start;
    const invoice = mapToSAInvoice(result.data, invoiceId);

    return {
        invoice,
        modelUsed: escalated ? AI_MODELS.powerful : AI_MODELS.cheap,
        escalated,
        totalTokens: result.tokens,
        processingTimeMs: elapsed,
    };
}

/** Call GPT model and parse response */
async function callGPT(
    openai: OpenAI,
    ocrText: string,
    model: string
): Promise<{ data: Record<string, unknown>; avgConfidence: number; tokens: number }> {
    try {
        const response = await openai.chat.completions.create({
            model,
            messages: [
                { role: 'system', content: SA_INVOICE_EXTRACTION_SYSTEM_PROMPT },
                { role: 'user', content: buildExtractionUserPrompt(ocrText) },
            ],
            temperature: 0.1,
            response_format: { type: 'json_object' },
        });

        const content = response.choices[0]?.message?.content ?? '{}';
        const data = JSON.parse(content);
        const tokens = response.usage?.total_tokens ?? 0;

        // Calculate average confidence
        const confidenceValues: number[] = [];
        for (const [key, val] of Object.entries(data)) {
            if (key !== 'line_items' && val && typeof val === 'object' && 'confidence' in (val as Record<string, unknown>)) {
                confidenceValues.push((val as { confidence: number }).confidence);
            }
        }
        const avgConfidence =
            confidenceValues.length > 0
                ? confidenceValues.reduce((a, b) => a + b, 0) / confidenceValues.length
                : 0;

        return { data, avgConfidence, tokens };
    } catch (error) {
        console.error(`[Extractor] GPT ${model} error:`, error);
        return { data: {}, avgConfidence: 0, tokens: 0 };
    }
}

/** Map raw GPT output to SAInvoice partial */
function mapToSAInvoice(
    data: Record<string, unknown>,
    invoiceId: string
): Partial<SAInvoice> {
    const field = (key: string): ExtractedField | undefined => {
        const raw = data[key] as { value: unknown; confidence: number } | undefined;
        if (!raw || raw.value === null || raw.value === undefined) return undefined;
        return {
            value: String(raw.value),
            confidence: raw.confidence ?? 0,
            level: getConfidenceLevel(raw.confidence ?? 0),
            source: 'ai',
        };
    };

    const numField = (key: string): ExtractedField<number> | undefined => {
        const raw = data[key] as { value: unknown; confidence: number } | undefined;
        if (!raw || raw.value === null || raw.value === undefined) return undefined;
        return {
            value: Number(raw.value) || 0,
            confidence: raw.confidence ?? 0,
            level: getConfidenceLevel(raw.confidence ?? 0),
            source: 'ai',
        };
    };

    const lineItems: LineItem[] = [];
    const rawItems = data.line_items as Array<Record<string, unknown>> | undefined;
    if (Array.isArray(rawItems)) {
        for (const item of rawItems) {
            lineItems.push({
                id: uuidv4(),
                description: String(item.description ?? ''),
                quantity: Number(item.quantity) || 0,
                unitPrice: Number(item.unit_price) || 0,
                vatAmount: Number(item.vat_amount) || 0,
                lineTotal: Number(item.line_total) || 0,
            });
        }
    }

    const totalAmount = numField('total_amount');
    const invoiceType = classifyInvoiceType(totalAmount?.value ?? 0);

    return {
        id: invoiceId,
        invoiceLabel: field('invoice_label'),
        vendorName: field('vendor_name'),
        vendorAddress: field('vendor_address'),
        vendorVatNumber: field('vendor_vat_number'),
        customerName: field('customer_name'),
        customerAddress: field('customer_address'),
        customerVatNumber: field('customer_vat_number'),
        invoiceNumber: field('invoice_number'),
        invoiceDate: field('invoice_date'),
        description: field('description'),
        subtotal: numField('subtotal'),
        vatRate: numField('vat_rate'),
        vatAmount: numField('vat_amount'),
        totalAmount,
        currency: { value: 'ZAR', confidence: 1.0, level: 'high', source: 'ai' },
        lineItems,
        invoiceType,
        bbbeeLevel: field('bbbee_level'),
        purchaseOrderNumber: field('purchase_order_number'),
        paymentTerms: field('payment_terms'),
        validationResults: [],
        isValid: false,
    };
}

function getConfidenceLevel(confidence: number): ConfidenceLevel {
    if (confidence >= 0.8) return 'high';
    if (confidence >= 0.5) return 'medium';
    return 'low';
}

/** Demo extraction for when no API key is set */
function getDemoExtraction(invoiceId: string): ExtractionResult {
    return {
        invoice: {
            id: invoiceId,
            invoiceLabel: { value: 'Tax Invoice', confidence: 0.98, level: 'high', source: 'ai' },
            vendorName: { value: 'ABC Supplies (Pty) Ltd', confidence: 0.95, level: 'high', source: 'ai' },
            vendorAddress: { value: '123 Main Street, Sandton, Johannesburg, 2196', confidence: 0.92, level: 'high', source: 'ai' },
            vendorVatNumber: { value: '4123456789', confidence: 0.97, level: 'high', source: 'ai' },
            customerName: { value: 'XYZ Trading CC', confidence: 0.94, level: 'high', source: 'ai' },
            customerAddress: { value: '456 Oak Avenue, Pretoria, 0001', confidence: 0.90, level: 'high', source: 'ai' },
            customerVatNumber: { value: '4987654321', confidence: 0.93, level: 'high', source: 'ai' },
            invoiceNumber: { value: 'INV-2026-0042', confidence: 0.99, level: 'high', source: 'ai' },
            invoiceDate: { value: '05/03/2026', confidence: 0.96, level: 'high', source: 'ai' },
            description: { value: 'Office supplies and stationery', confidence: 0.88, level: 'high', source: 'ai' },
            subtotal: { value: 3945.00, confidence: 0.97, level: 'high', source: 'ai' },
            vatRate: { value: 15, confidence: 1.0, level: 'high', source: 'ai' },
            vatAmount: { value: 591.75, confidence: 0.97, level: 'high', source: 'ai' },
            totalAmount: { value: 4536.75, confidence: 0.98, level: 'high', source: 'ai' },
            currency: { value: 'ZAR', confidence: 1.0, level: 'high', source: 'ai' },
            lineItems: [
                { id: 'li-1', description: 'A4 Copy Paper (Box)', quantity: 10, unitPrice: 85.00, vatAmount: 127.50, lineTotal: 977.50 },
                { id: 'li-2', description: 'Printer Ink Cartridges', quantity: 5, unitPrice: 345.00, vatAmount: 258.75, lineTotal: 1983.75 },
                { id: 'li-3', description: 'Lever Arch Files', quantity: 20, unitPrice: 42.50, vatAmount: 127.50, lineTotal: 977.50 },
                { id: 'li-4', description: 'Whiteboard Markers (Pack)', quantity: 8, unitPrice: 65.00, vatAmount: 78.00, lineTotal: 598.00 },
            ],
            invoiceType: 'abridged',
            bbbeeLevel: { value: '2', confidence: 0.85, level: 'high', source: 'ai' },
            paymentTerms: { value: '30 days from date of invoice', confidence: 0.90, level: 'high', source: 'ai' },
            validationResults: [],
            isValid: false,
        },
        modelUsed: 'demo',
        escalated: false,
        totalTokens: 0,
        processingTimeMs: 200,
    };
}
