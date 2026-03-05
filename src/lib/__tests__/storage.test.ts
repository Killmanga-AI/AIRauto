// src/lib/__tests__/storage.test.ts
import { LocalFileStorage, generateStorageKey } from '@/lib/storage';
import { promises as fs } from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';

// Mock fs promises
jest.mock('fs', () => ({
  promises: {
    mkdir: jest.fn(),
    writeFile: jest.fn(),
    readFile: jest.fn(),
    access: jest.fn(),
    unlink: jest.fn(),
  },
}));

describe('Storage Layer', () => {
  let storage: LocalFileStorage;

  beforeEach(() => {
    jest.clearAllMocks();
    storage = new LocalFileStorage('./test-uploads');
  });

  describe('LocalFileStorage', () => {
    it('should initialize with default path', () => {
      const defaultStorage = new LocalFileStorage();
      expect(defaultStorage).toBeDefined();
    });

    it('should upload file successfully', async () => {
      const mockBuffer = Buffer.from('test content');
      const mockFs = fs as jest.Mocked<typeof fs>;

      mockFs.mkdir.mockResolvedValue(undefined);
      mockFs.writeFile.mockResolvedValue(undefined);

      const result = await storage.uploadFile('user-1/test.pdf', mockBuffer, 'application/pdf');

      expect(mockFs.mkdir).toHaveBeenCalled();
      expect(mockFs.writeFile).toHaveBeenCalled();
      expect(result).toContain('test.pdf');
    });

    it('should download file successfully', async () => {
      const mockBuffer = Buffer.from('file content');
      const mockFs = fs as jest.Mocked<typeof fs>;

      mockFs.readFile.mockResolvedValue(mockBuffer);

      const result = await storage.downloadFile('user-1/test.pdf');

      expect(mockFs.readFile).toHaveBeenCalled();
      expect(result).toEqual(mockBuffer);
    });

    it('should check if file exists', async () => {
      const mockFs = fs as jest.Mocked<typeof fs>;

      mockFs.access.mockResolvedValue(undefined);

      const exists = await storage.fileExists('user-1/test.pdf');

      expect(mockFs.access).toHaveBeenCalled();
      expect(exists).toBe(true);
    });

    it('should return false when file does not exist', async () => {
      const mockFs = fs as jest.Mocked<typeof fs>;

      mockFs.access.mockRejectedValue(new Error('ENOENT'));

      const exists = await storage.fileExists('user-1/nonexistent.pdf');

      expect(exists).toBe(false);
    });

    it('should delete file successfully', async () => {
      const mockFs = fs as jest.Mocked<typeof fs>;

      mockFs.unlink.mockResolvedValue(undefined);

      await storage.deleteFile('user-1/test.pdf');

      expect(mockFs.unlink).toHaveBeenCalled();
    });

    it('should handle delete on non-existent file gracefully', async () => {
      const mockFs = fs as jest.Mocked<typeof fs>;

      const enoentError = new Error('ENOENT') as NodeJS.ErrnoException;
      enoentError.code = 'ENOENT';
      mockFs.unlink.mockRejectedValue(enoentError);

      await expect(storage.deleteFile('user-1/nonexistent.pdf')).resolves.not.toThrow();
    });

    it('should generate valid file URL', () => {
      const url = storage.getFileUrl('user-1/test.pdf');

      expect(url).toContain('api/files');
      expect(url).toContain('user-1/test.pdf');
    });
  });

  describe('generateStorageKey', () => {
    it('should generate unique keys with different timestamps', async () => {
      const key1 = generateStorageKey('user-1', 'invoice.pdf');

      // Add small delay
      await new Promise((r) => setTimeout(r, 10));

      const key2 = generateStorageKey('user-1', 'invoice.pdf');

      expect(key1).not.toBe(key2);
      expect(key1).toContain('user-1/');
      expect(key1).toContain('.pdf');
      expect(key2).toContain('user-1/');
      expect(key2).toContain('.pdf');
    });

    it('should preserve file extension', () => {
      const extensions = ['.pdf', '.jpg', '.png', '.xlsx'];

      extensions.forEach((ext) => {
        const key = generateStorageKey('user-1', `document${ext}`);
        expect(key).toContain(ext);
      });
    });

    it('should include user ID in key', () => {
      const userId = 'user-test-123';
      const key = generateStorageKey(userId, 'invoice.pdf');

      expect(key).toContain(userId);
    });

    it('should generate 8-char random suffix', () => {
      const key = generateStorageKey('user-1', 'invoice.pdf');
      // Format: user-1/timestamp-random.ext
      const parts = key.split('/')[1].split('-');
      const random = parts[parts.length - 1].split('.')[0];

      expect(random.length).toBe(8);
    });
  });
});
