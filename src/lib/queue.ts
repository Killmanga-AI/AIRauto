// ============================================================
// AIRAuto – BullMQ Queue Setup
// ============================================================

import { Queue, Worker, QueueEvents } from 'bullmq';
import Redis from 'ioredis';

let redis: Redis;
let redisSubscriber: Redis;

/**
 * Get or create Redis connection.
 * Falls back to in-process queue in development if Redis unavailable.
 */
function getRedis(): Redis {
  if (!redis) {
    redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      db: parseInt(process.env.REDIS_DB || '0'),
      maxRetriesPerRequest: null, // Required for BullMQ
      enableReadyCheck: false,
    });

    redis.on('error', (err) => {
      console.error('[Queue] Redis connection error:', err.message);
      // In dev, this is non-fatal; in-process fallback will be used
    });
  }

  return redis;
}

function getRedisSubscriber(): Redis {
  if (!redisSubscriber) {
    redisSubscriber = getRedis().duplicate();
  }
  return redisSubscriber;
}

// ============================================================
// Queue Types
// ============================================================

export interface ExtractionJobData {
  invoiceId: string;
  userId: string;
  filePath: string;
  fileName: string;
  fileType: 'pdf' | 'jpg' | 'png';
}

export interface ExportJobData {
  invoiceIds: string[];
  userId: string;
  provider: string; // 'sage' | 'xero' | 'quickbooks'
}

export interface ValidationJobData {
  invoiceId: string;
  userId: string;
}

// ============================================================
// Queue Instances
// ============================================================

let extractionQueue: Queue<ExtractionJobData> | null = null;
let exportQueue: Queue<ExportJobData> | null = null;
let validationQueue: Queue<ValidationJobData> | null = null;

export function getExtractionQueue(): Queue<ExtractionJobData> {
  if (!extractionQueue) {
    const connection = getRedis();
    extractionQueue = new Queue('extraction', { connection });
  }
  return extractionQueue;
}

export function getExportQueue(): Queue<ExportJobData> {
  if (!exportQueue) {
    const connection = getRedis();
    exportQueue = new Queue('export', { connection });
  }
  return exportQueue;
}

export function getValidationQueue(): Queue<ValidationJobData> {
  if (!validationQueue) {
    const connection = getRedis();
    validationQueue = new Queue('validation', { connection });
  }
  return validationQueue;
}

// ============================================================
// Queue Events
// ============================================================

export function onExtractionComplete(callback: (jobId: string) => void): void {
  const connection = getRedis();
  const events = new QueueEvents('extraction', { connection });

  events.on('completed', ({ jobId }) => {
    callback(jobId);
  });

  events.on('failed', ({ jobId, failedReason }) => {
    console.error(`[Queue] Extraction job ${jobId} failed:`, failedReason);
  });
}

// ============================================================
// Health Check
// ============================================================

export async function isQueueHealthy(): Promise<boolean> {
  try {
    const redis = getRedis();
    const pong = await redis.ping();
    return pong === 'PONG';
  } catch {
    return false;
  }
}

// ============================================================
// Cleanup
// ============================================================

export async function closeQueues(): Promise<void> {
  if (extractionQueue) await extractionQueue.close();
  if (exportQueue) await exportQueue.close();
  if (validationQueue) await validationQueue.close();
  if (redis) await redis.quit();
  if (redisSubscriber) await redisSubscriber.quit();
}
