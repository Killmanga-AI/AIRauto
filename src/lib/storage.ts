// ============================================================
// AIRAuto – File Storage Abstraction
// ============================================================

import { promises as fs } from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';

/**
 * Storage interface supporting local filesystem with S3-ready methods.
 * For production, implement S3 backend with same interface.
 */
export interface StorageProvider {
  // Upload/store files
  uploadFile(key: string, buffer: Buffer, mimeType: string): Promise<string>;
  
  // Retrieve files
  downloadFile(key: string): Promise<Buffer>;
  getFileUrl(key: string): string;

  // File metadata
  fileExists(key: string): Promise<boolean>;
  deleteFile(key: string): Promise<void>;
}

// ============================================================
// Local Filesystem Storage (Development)
// ============================================================

export class LocalFileStorage implements StorageProvider {
  private basePath: string;

  constructor(basePath: string = './data/uploads') {
    this.basePath = basePath;
  }

  async uploadFile(key: string, buffer: Buffer, _mimeType: string): Promise<string> {
    await fs.mkdir(path.dirname(path.join(this.basePath, key)), { recursive: true });
    await fs.writeFile(path.join(this.basePath, key), buffer);
    return `file:///${path.join(this.basePath, key)}`;
  }

  async downloadFile(key: string): Promise<Buffer> {
    return fs.readFile(path.join(this.basePath, key));
  }

  getFileUrl(key: string): string {
    // In production S3, this would be a signed URL
    return `/api/files/${key}`;
  }

  async fileExists(key: string): Promise<boolean> {
    try {
      await fs.access(path.join(this.basePath, key));
      return true;
    } catch {
      return false;
    }
  }

  async deleteFile(key: string): Promise<void> {
    try {
      await fs.unlink(path.join(this.basePath, key));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    }
  }
}

// ============================================================
// Storage Factory
// ============================================================

let storageInstance: StorageProvider | null = null;

export function getStorage(): StorageProvider {
  if (!storageInstance) {
    const provider = process.env.STORAGE_PROVIDER || 'local';

    if (provider === 'local') {
      storageInstance = new LocalFileStorage(process.env.STORAGE_PATH);
    } else if (provider === 's3') {
      // TODO: Implement S3Storage class when needed
      // import { S3Storage } from './s3-storage';
      // storageInstance = new S3Storage({
      //   bucket: process.env.AWS_S3_BUCKET!,
      //   region: process.env.AWS_REGION!,
      // });
      throw new Error('S3 storage not yet implemented');
    } else {
      throw new Error(`Unknown storage provider: ${provider}`);
    }
  }

  return storageInstance;
}

/**
 * Generate a unique storage key for uploaded files.
 */
export function generateStorageKey(userId: string, originalFileName: string): string {
  const ext = path.extname(originalFileName);
  const base = path.basename(originalFileName, ext);
  const timestamp = Date.now();
  const random = randomUUID().slice(0, 8);

  return `${userId}/${timestamp}-${random}${ext}`;
}
