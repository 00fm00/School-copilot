import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';
import { Readable } from 'stream';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { IStorageService, StoredFileMetadata } from './storage.interface';

@Injectable()
export class CloudinaryStorageService implements IStorageService {
  private readonly logger = new Logger(CloudinaryStorageService.name);
  private readonly maxUploadBytes: number;
  private readonly folder: string;
  private readonly isConfigured: boolean;

  constructor(private configService: ConfigService) {
    const maxMb = this.configService.get<number>('MAX_UPLOAD_MB', 20);
    this.maxUploadBytes = maxMb * 1024 * 1024;
    this.folder = this.configService.get<string>('CLOUDINARY_FOLDER', 'school_erp_documents');

    const cloudinaryUrl = this.configService.get<string>('CLOUDINARY_URL', '');
    const cloudName = this.configService.get<string>('CLOUDINARY_CLOUD_NAME', '');
    const apiKey = this.configService.get<string>('CLOUDINARY_API_KEY', '');
    const apiSecret = this.configService.get<string>('CLOUDINARY_API_SECRET', '');

    if (cloudinaryUrl && cloudinaryUrl.trim() !== '') {
      cloudinary.config({
        cloudinary_url: cloudinaryUrl,
        secure: true,
      });
      this.isConfigured = true;
      this.logger.log('CloudinaryStorageService configured via CLOUDINARY_URL');
    } else if (cloudName && cloudName.trim() !== '' && apiKey && apiKey.trim() !== '') {
      cloudinary.config({
        cloud_name: cloudName,
        api_key: apiKey,
        api_secret: apiSecret,
        secure: true,
      });
      this.isConfigured = true;
      this.logger.log(`CloudinaryStorageService configured for cloud "${cloudName}"`);
    } else {
      this.isConfigured = false;
      this.logger.warn(
        'Cloudinary credentials are not configured. Cloudinary uploads will fail unless credentials are provided.',
      );
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

    if (!this.isConfigured) {
      throw new BadRequestException(
        'Cloudinary credentials (CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET or CLOUDINARY_URL) are not configured in .env',
      );
    }

    const uniqueId = crypto.randomUUID();
    const sanitizedName = path.parse(file.originalname).name.replace(/[^a-zA-Z0-9_-]/g, '_');
    const publicId = `${uniqueId}_${sanitizedName}`;

    this.logger.log(
      `Uploading file "${file.originalname}" to Cloudinary folder "${this.folder}"...`,
    );

    const uploadResult = await new Promise<UploadApiResponse>((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder: this.folder,
          public_id: publicId,
          resource_type: 'raw',
        },
        (error, result) => {
          if (error || !result) {
            return reject(error || new Error('Cloudinary upload returned an empty response'));
          }
          resolve(result);
        },
      );

      Readable.from(file.buffer).pipe(stream);
    });

    this.logger.log(`File uploaded successfully to Cloudinary: ${uploadResult.secure_url}`);

    return {
      storagePath: uploadResult.secure_url,
      sizeBytes: uploadResult.bytes || file.buffer.length,
      originalName: file.originalname,
      mimeType: 'application/pdf',
    };
  }

  async deleteFile(storagePath: string): Promise<void> {
    try {
      if (storagePath.startsWith('http://') || storagePath.startsWith('https://')) {
        // Extract public_id from Cloudinary secure_url
        // URL format: .../raw/upload/v12345/school_erp_documents/xyz.pdf
        const match = storagePath.match(/\/upload\/(?:v\d+\/)?([^?#]+)/);
        if (match && match[1]) {
          const publicId = decodeURIComponent(match[1]);
          this.logger.log(`Deleting file from Cloudinary: ${publicId}`);
          await cloudinary.uploader.destroy(publicId, { resource_type: 'raw' });
        }
      } else if (fs.existsSync(storagePath)) {
        await fs.promises.unlink(storagePath);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`Failed to delete file from Cloudinary at ${storagePath}: ${message}`);
    }
  }

  async getFileBuffer(storagePath: string): Promise<Buffer> {
    if (storagePath.startsWith('http://') || storagePath.startsWith('https://')) {
      this.logger.log(`Fetching PDF buffer from cloud storage URL: ${storagePath}`);
      const res = await fetch(storagePath);
      if (!res.ok) {
        throw new BadRequestException(
          `Failed to fetch file from cloud storage (${res.status} ${res.statusText})`,
        );
      }
      const arrayBuffer = await res.arrayBuffer();
      return Buffer.from(arrayBuffer);
    }

    if (fs.existsSync(storagePath)) {
      return fs.promises.readFile(storagePath);
    }

    throw new BadRequestException(`File at ${storagePath} does not exist or cannot be accessed`);
  }
}
