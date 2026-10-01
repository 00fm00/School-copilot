import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { IStorageService, StoredFileMetadata } from './storage.interface';

@Injectable()
export class LocalStorageService implements IStorageService {
  private readonly logger = new Logger(LocalStorageService.name);
  private readonly uploadDir: string;
  private readonly maxUploadBytes: number;

  constructor(private configService: ConfigService) {
    this.uploadDir = path.resolve(
      this.configService.get<string>('UPLOAD_DIR', './storage/uploads'),
    );
    const maxMb = this.configService.get<number>('MAX_UPLOAD_MB', 20);
    this.maxUploadBytes = maxMb * 1024 * 1024;

    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  isPdf(buffer: Buffer): boolean {
    if (!buffer || buffer.length < 4) {
      return false;
    }
    // PDF Magic bytes: %PDF (0x25, 0x50, 0x44, 0x46)
    return buffer[0] === 0x25 && buffer[1] === 0x50 && buffer[2] === 0x44 && buffer[3] === 0x46;
  }

  async saveFile(file: Express.Multer.File): Promise<StoredFileMetadata> {
    if (!file || !file.buffer) {
      throw new BadRequestException('No file uploaded or file buffer is empty');
    }

    if (file.buffer.length > this.maxUploadBytes) {
      throw new BadRequestException(
        `File size exceeds maximum permitted limit (${this.maxUploadBytes / 1024 / 1024} MB)`,
      );
    }

    if (!this.isPdf(file.buffer)) {
      throw new BadRequestException(
        'Invalid file type. Only valid PDF files (starting with %PDF header) are accepted.',
      );
    }

    const uniqueId = crypto.randomUUID();
    const filename = `${uniqueId}.pdf`;
    const targetPath = path.join(this.uploadDir, filename);

    await fs.promises.writeFile(targetPath, file.buffer);

    return {
      storagePath: targetPath,
      sizeBytes: file.buffer.length,
      originalName: file.originalname,
      mimeType: 'application/pdf',
    };
  }

  async deleteFile(storagePath: string): Promise<void> {
    try {
      if (fs.existsSync(storagePath)) {
        await fs.promises.unlink(storagePath);
      }
    } catch (err) {
      this.logger.error(`Failed to delete stored file at ${storagePath}:`, err);
    }
  }

  async getFileBuffer(storagePath: string): Promise<Buffer> {
    if (!fs.existsSync(storagePath)) {
      throw new BadRequestException('Requested file does not exist on disk');
    }
    return fs.promises.readFile(storagePath);
  }
}
