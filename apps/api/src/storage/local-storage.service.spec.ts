import { BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';
import { LocalStorageService } from './local-storage.service';

describe('LocalStorageService', () => {
  let service: LocalStorageService;
  const testUploadDir = path.resolve(__dirname, '../../test-uploads');

  const mockConfigService = {
    get: jest.fn((key: string, defaultValue?: any) => {
      if (key === 'UPLOAD_DIR') return testUploadDir;
      if (key === 'MAX_UPLOAD_MB') return 20;
      return defaultValue;
    }),
  } as unknown as ConfigService;

  beforeEach(() => {
    service = new LocalStorageService(mockConfigService);
  });

  afterAll(() => {
    if (fs.existsSync(testUploadDir)) {
      fs.rmSync(testUploadDir, { recursive: true, force: true });
    }
  });

  it('should accept and store a file with valid %PDF magic bytes', async () => {
    const validPdfBuffer = Buffer.from('%PDF-1.4 sample content');
    const mockFile: Express.Multer.File = {
      fieldname: 'file',
      originalname: 'test.pdf',
      encoding: '7bit',
      mimetype: 'application/pdf',
      buffer: validPdfBuffer,
      size: validPdfBuffer.length,
      stream: null as any,
      destination: '',
      filename: '',
      path: '',
    };

    const result = await service.saveFile(mockFile);
    expect(result.storagePath).toBeDefined();
    expect(fs.existsSync(result.storagePath)).toBe(true);
    expect(result.originalName).toBe('test.pdf');

    // Clean up
    await service.deleteFile(result.storagePath);
    expect(fs.existsSync(result.storagePath)).toBe(false);
  });

  it('should reject a file with invalid magic bytes (e.g. text/exe)', async () => {
    const fakeBuffer = Buffer.from('NOT A PDF FILE');
    const mockFile: Express.Multer.File = {
      fieldname: 'file',
      originalname: 'malicious.pdf',
      encoding: '7bit',
      mimetype: 'application/pdf',
      buffer: fakeBuffer,
      size: fakeBuffer.length,
      stream: null as any,
      destination: '',
      filename: '',
      path: '',
    };

    await expect(service.saveFile(mockFile)).rejects.toThrow(BadRequestException);
  });

  it('should reject a file exceeding max size limit', async () => {
    const hugeBuffer = Buffer.alloc(21 * 1024 * 1024);
    hugeBuffer[0] = 0x25;
    hugeBuffer[1] = 0x50;
    hugeBuffer[2] = 0x44;
    hugeBuffer[3] = 0x46; // %PDF

    const mockFile: Express.Multer.File = {
      fieldname: 'file',
      originalname: 'huge.pdf',
      encoding: '7bit',
      mimetype: 'application/pdf',
      buffer: hugeBuffer,
      size: hugeBuffer.length,
      stream: null as any,
      destination: '',
      filename: '',
      path: '',
    };

    await expect(service.saveFile(mockFile)).rejects.toThrow(BadRequestException);
  });
});
