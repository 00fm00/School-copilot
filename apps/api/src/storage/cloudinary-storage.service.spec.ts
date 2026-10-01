import { BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CloudinaryStorageService } from './cloudinary-storage.service';
import { v2 as cloudinary } from 'cloudinary';

jest.mock('cloudinary', () => ({
  v2: {
    config: jest.fn(),
    uploader: {
      upload_stream: jest.fn(),
      destroy: jest.fn().mockResolvedValue({ result: 'ok' }),
    },
  },
}));

describe('CloudinaryStorageService', () => {
  let service: CloudinaryStorageService;
  let mockConfigService: Partial<ConfigService>;

  const validPdfBuffer = Buffer.from('%PDF-1.4 Mock valid PDF binary content');
  const invalidBuffer = Buffer.from('NOT A PDF FILE');

  beforeEach(() => {
    jest.clearAllMocks();
    mockConfigService = {
      get: jest.fn((key: string, defaultVal?: unknown) => {
        if (key === 'CLOUDINARY_URL') return 'cloudinary://123456789:abcdefg@testcloud';
        if (key === 'CLOUDINARY_FOLDER') return 'school_erp_documents';
        if (key === 'MAX_UPLOAD_MB') return 20;
        return defaultVal;
      }),
    };

    service = new CloudinaryStorageService(mockConfigService as ConfigService);
  });

  it('should initialize and configure cloudinary with URL', () => {
    expect(cloudinary.config).toHaveBeenCalledWith({
      cloudinary_url: 'cloudinary://123456789:abcdefg@testcloud',
      secure: true,
    });
  });

  describe('isPdf', () => {
    it('should return true for valid PDF magic bytes (%PDF)', () => {
      expect(service.isPdf(validPdfBuffer)).toBe(true);
    });

    it('should return false for invalid buffer', () => {
      expect(service.isPdf(invalidBuffer)).toBe(false);
    });

    it('should return false for empty buffer', () => {
      expect(service.isPdf(Buffer.alloc(0))).toBe(false);
    });
  });

  describe('saveFile', () => {
    it('should throw BadRequestException for non-PDF file', async () => {
      const mockFile = {
        buffer: invalidBuffer,
        originalname: 'test.txt',
        mimetype: 'text/plain',
      } as Express.Multer.File;

      await expect(service.saveFile(mockFile)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if file exceeds maximum size', async () => {
      const largeBuffer = Buffer.alloc(25 * 1024 * 1024);
      largeBuffer[0] = 0x25;
      largeBuffer[1] = 0x50;
      largeBuffer[2] = 0x44;
      largeBuffer[3] = 0x46;

      const mockFile = {
        buffer: largeBuffer,
        originalname: 'large.pdf',
        mimetype: 'application/pdf',
      } as Express.Multer.File;

      await expect(service.saveFile(mockFile)).rejects.toThrow(BadRequestException);
    });

    it('should upload stream to Cloudinary and return secure_url', async () => {
      const mockFile = {
        buffer: validPdfBuffer,
        originalname: 'syllabus.pdf',
        mimetype: 'application/pdf',
      } as Express.Multer.File;

      (cloudinary.uploader.upload_stream as jest.Mock).mockImplementation((options, callback) => {
        const stream = {
          write: jest.fn(),
          end: jest.fn(() => {
            callback(null, {
              secure_url:
                'https://res.cloudinary.com/testcloud/raw/upload/v1/school_erp_documents/syllabus.pdf',
              bytes: 1234,
              public_id: 'school_erp_documents/syllabus.pdf',
            });
          }),
          on: jest.fn(),
          once: jest.fn(),
          emit: jest.fn(),
        };
        return stream;
      });

      const result = await service.saveFile(mockFile);

      expect(result.storagePath).toBe(
        'https://res.cloudinary.com/testcloud/raw/upload/v1/school_erp_documents/syllabus.pdf',
      );
      expect(result.mimeType).toBe('application/pdf');
      expect(result.originalName).toBe('syllabus.pdf');
    });
  });

  describe('deleteFile', () => {
    it('should call cloudinary destroy for cloud URL', async () => {
      const url =
        'https://res.cloudinary.com/testcloud/raw/upload/v1234/school_erp_documents/doc-123.pdf';

      await service.deleteFile(url);

      expect(cloudinary.uploader.destroy).toHaveBeenCalledWith('school_erp_documents/doc-123.pdf', {
        resource_type: 'raw',
      });
    });
  });
});
