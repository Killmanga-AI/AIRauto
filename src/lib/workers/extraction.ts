// ============================================================
// AIRAuto – Async Extraction Worker
// ============================================================

import { Worker, Job } from 'bullmq';
import Redis from 'ioredis';
import { db } from '@/lib/db';
import { getStorage } from '@/lib/storage';
import { runOcr } from '@/lib/ocr';
import { extractInvoiceData } from '@/lib/ai/extractor';
import { validateSARSInvoice } from '@/lib/validation/sars';
import { ProcessingStatus } from '@/types/invoice';
import type { ExtractionJobData } from '@/lib/queue';
import { normalizeOcrText } from '@/lib/rules/normalization';
import {
  extractWithRules,
  shouldUseAiFallback,
  mergeRuleAndAiResults,
} from '@/lib/rules/extraction';

/**
 * BullMQ Worker: OCR → AI Extract → Validate → Store
 * 
 * Processing pipeline:
 * 1. Download file from storage
 * 2. Run OCR (Tesseract)
 * 3. Extract with AI (OpenAI - cheap-first strategy)
 * 4. Validate against SARS rules
 * 5. Store extracted data in database
 * 6. Update invoice status and results
 */

export async function startExtractionWorker(): Promise<Worker> {
  const redis = new Redis({
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD,
    db: parseInt(process.env.REDIS_DB || '0'),
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
  });

  const worker = new Worker<ExtractionJobData>(
    'extraction',
    async (job: Job<ExtractionJobData>) => {
      const { invoiceId, userId, filePath, fileName, fileType } = job.data;

      try {
        // Mark as processing
        await updateInvoiceStatus(invoiceId, 'ocr_processing', null);
        job.progress(10);

        // Step 1: Download file from storage
        const storage = getStorage();
        const fileBuffer = await storage.downloadFile(filePath);
        job.progress(20);

        // Step 2: OCR
        console.log(`[Worker] Running OCR on ${fileName}...`);
        const ocrResult = await runOcr(filePath);
        job.progress(35);

        // Step 3: Text Normalization
        const normalized = normalizeOcrText(ocrResult.text);
        job.progress(40);

        await db.invoice.update({
          where: { id: invoiceId },
          data: {
            status: 'ai_extracting',
            ocrRawText: normalized.raw,
            processingStartedAt: new Date(),
          },
        });

        // Step 4: Rule-Based Extraction
        console.log('[Worker] Extracting with rule engine...');
        const ruleResult = extractWithRules(normalized.normalized);

        // Decide if AI fallback is required
        let mergedInvoice = ruleResult.fields;
        let aiMeta: { modelUsed: string; escalated: boolean; totalTokens: number } | null = null;

        if (shouldUseAiFallback(ruleResult)) {
          console.log('[Worker] Low confidence on critical fields. Escalating to AI.');
          const aiExtraction = await extractInvoiceData(normalized.normalized, invoiceId);
          mergedInvoice = mergeRuleAndAiResults(ruleResult, aiExtraction.invoice);
          aiMeta = {
            modelUsed: aiExtraction.modelUsed,
            escalated: aiExtraction.escalated,
            totalTokens: aiExtraction.totalTokens,
          };
        }

        job.progress(70);

        // Step 4: Validate
        console.log(`[Worker] Validating against SARS rules...`);
        const validationResults = validateSARSInvoice(
          mergedInvoice as unknown as Parameters<typeof validateSARSInvoice>[0],
        );

        // Check if validation has critical errors
        const hasCriticalErrors = validationResults.some(
          (r) => r.severity === 'error' && !r.valid
        );

        const nextStatus: ProcessingStatus = hasCriticalErrors
          ? 'needs_review'
          : 'validated';

        // Step 5: Store results
        const data: Record<string, unknown> = {
          status: nextStatus,
          processingCompletedAt: new Date(),
          aiModel: aiMeta?.modelUsed ?? null,
          // Map extracted fields to invoice record
          invoiceLabel: mergedInvoice.invoiceLabel?.value,
          invoiceLabelConfidence: mergedInvoice.invoiceLabel?.confidence ?? 0,
          vendorName: mergedInvoice.vendorName?.value,
          vendorNameConfidence: mergedInvoice.vendorName?.confidence ?? 0,
          vendorAddress: mergedInvoice.vendorAddress?.value,
          vendorVatNumber: mergedInvoice.vendorVatNumber?.value,
          customerName: mergedInvoice.customerName?.value,
          customerAddress: mergedInvoice.customerAddress?.value,
          customerVatNumber: mergedInvoice.customerVatNumber?.value,
          invoiceNumber: mergedInvoice.invoiceNumber?.value,
          invoiceDate: mergedInvoice.invoiceDate
            ? new Date(mergedInvoice.invoiceDate.value)
            : null,
          description: mergedInvoice.description?.value,
          subtotal: mergedInvoice.subtotal?.value
            ? Math.round((mergedInvoice.subtotal.value as number) * 100)
            : null,
          vatRate: mergedInvoice.vatRate?.value ?? 0.15,
          vatAmount: mergedInvoice.vatAmount?.value
            ? Math.round((mergedInvoice.vatAmount.value as number) * 100)
            : null,
          totalAmount: mergedInvoice.totalAmount?.value
            ? Math.round((mergedInvoice.totalAmount.value as number) * 100)
            : null,
          currency: mergedInvoice.currency?.value ?? 'ZAR',
          invoiceType: mergedInvoice.invoiceType ?? 'full',
        };

        const updatedInvoice = await db.invoice.update({
          where: { id: invoiceId },
          data,
        });

        // Step 6: Store line items if available
        if (mergedInvoice.lineItems && mergedInvoice.lineItems.length > 0) {
          await db.lineItem.deleteMany({ where: { invoiceId } }); // Clear existing

          await db.lineItem.createMany({
            data: mergedInvoice.lineItems.map((li) => ({
              invoiceId,
              description: li.description,
              quantity: li.quantity,
              unitPrice: Math.round(li.unitPrice * 100),
              vatAmount: Math.round(li.vatAmount * 100),
              lineTotal: Math.round(li.lineTotal * 100),
            })),
          });
        }

        // Log audit
        await logAudit(userId, 'ai_extract', 'invoice', invoiceId, 'success', {
          ocrConfidence: ocrResult.confidence,
          modelUsed: extractionResult.modelUsed,
          escalated: extractionResult.escalated,
          validationErrors: validationResults.filter((r) => !r.valid).length,
        });

        job.progress(100);
        console.log(`[Worker] ✓ Extraction complete for ${invoiceId}`);

        return {
          invoiceId,
          status: nextStatus,
          validationErrors: validationResults.filter((r) => !r.valid).length,
        };
      } catch (error) {
        console.error(`[Worker] ✗ Extraction failed for ${invoiceId}:`, error);

        await db.invoice.update({
          where: { id: invoiceId },
          data: {
            status: 'failed',
            errorMessage: error instanceof Error ? error.message : 'Unknown error',
            processingCompletedAt: new Date(),
          },
        });

        await logAudit(userId, 'ai_extract', 'invoice', invoiceId, 'failure', {
          error: error instanceof Error ? error.message : String(error),
        });

        throw error;
      }
    },
    {
      connection: redis,
      concurrency: 5, // Process 5 jobs concurrently
      settings: {
        maxStalledCount: 2,
        stalledInterval: 30000,
        lockDuration: 30000,
        retryProcessDelay: 5000,
      },
    }
  );

  worker.on('error', (error) => {
    console.error('[Worker] Queue error:', error);
  });

  worker.on('failed', (job, error) => {
    console.error(`[Worker] Job ${job?.id} failed:`, error);
  });

  return worker;
}

/**
 * Update invoice processing status
 */
async function updateInvoiceStatus(
  invoiceId: string,
  status: ProcessingStatus,
  errorMessage: string | null
) {
  const data: Record<string, unknown> = { status };
  if (errorMessage) data.errorMessage = errorMessage;
  if (status === 'ocr_processing' || status === 'ai_extracting') {
    data.processingStartedAt = new Date();
  }

  await db.invoice.update({ where: { id: invoiceId }, data });
}

/**
 * Log audit trail
 */
async function logAudit(
  userId: string,
  action: string,
  resource: string,
  resourceId: string,
  status: 'success' | 'failure' | 'warning',
  details: Record<string, unknown>
) {
  try {
    await db.auditLog.create({
      data: {
        userId,
        action,
        resource,
        resourceId,
        status,
        details: JSON.stringify(details),
      },
    });
  } catch (error) {
    console.error('[Worker] Failed to log audit:', error);
  }
}
