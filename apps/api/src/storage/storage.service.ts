import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs/promises';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';

export interface StoredFile {
  path: string;
  fileName: string;
  mimeType: string;
  size: number;
}

@Injectable()
export class StorageService implements OnModuleInit {
  private storagePath: string;
  private storageType: string;

  constructor(private readonly configService: ConfigService) {
    this.storagePath =
      this.configService.get<string>('STORAGE_PATH') || './storage';
    this.storageType =
      this.configService.get<string>('STORAGE_TYPE') || 'local';
  }

  async onModuleInit() {
    if (this.storageType === 'local') {
      // Ensure storage directories exist
      const dirs = ['cvs', 'documents', 'photos', 'temp'];
      for (const dir of dirs) {
        await fs.mkdir(path.join(this.storagePath, dir), { recursive: true });
      }
    }
  }

  /**
   * Store a file
   */
  async store(
    buffer: Buffer,
    originalName: string,
    category: 'cvs' | 'documents' | 'photos' | 'temp',
    userId: string,
  ): Promise<StoredFile> {
    const ext = path.extname(originalName);
    const fileName = `${uuidv4()}${ext}`;
    const relativePath = path.join(category, userId, fileName);
    const absolutePath = path.join(this.storagePath, relativePath);

    // Ensure user directory exists
    await fs.mkdir(path.dirname(absolutePath), { recursive: true });

    // Write file
    await fs.writeFile(absolutePath, buffer);

    // Determine mime type
    const mimeType = this.getMimeType(ext);

    return {
      path: relativePath,
      fileName: originalName,
      mimeType,
      size: buffer.length,
    };
  }

  /**
   * Read a file
   */
  async read(relativePath: string): Promise<Buffer> {
    const absolutePath = path.join(this.storagePath, relativePath);
    return fs.readFile(absolutePath);
  }

  /**
   * Delete a file
   */
  async delete(relativePath: string): Promise<void> {
    const absolutePath = path.join(this.storagePath, relativePath);
    await fs.unlink(absolutePath).catch(() => {
      // Ignore if file doesn't exist
    });
  }

  /**
   * Check if file exists
   */
  async exists(relativePath: string): Promise<boolean> {
    const absolutePath = path.join(this.storagePath, relativePath);
    try {
      await fs.access(absolutePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get absolute path for a file (for serving)
   */
  getAbsolutePath(relativePath: string): string {
    return path.join(this.storagePath, relativePath);
  }

  private getMimeType(ext: string): string {
    const mimeTypes: Record<string, string> = {
      '.pdf': 'application/pdf',
      '.doc': 'application/msword',
      '.docx':
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
    };

    return mimeTypes[ext.toLowerCase()] || 'application/octet-stream';
  }
}
