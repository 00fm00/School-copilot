import { NotFoundException } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { Types } from 'mongoose';
import { Role, DocumentStatus } from '@school-copilot/shared';
import { DocumentsService } from './documents.service';
import { AppDocument } from '../schemas/document.schema';
import { DocumentChunk } from '../schemas/document-chunk.schema';
import { STORAGE_SERVICE } from '../storage/storage.interface';

describe('DocumentsService', () => {
  let service: DocumentsService;

  const mockDocId = new Types.ObjectId();
  const mockUserId = new Types.ObjectId();

  const mockDocument = {
    _id: mockDocId,
    title: 'Test Document',
    originalName: 'test.pdf',
    storagePath: '/storage/uploads/test.pdf',
    mimeType: 'application/pdf',
    sizeBytes: 1234,
    status: DocumentStatus.QUEUED,
    audienceRoles: [Role.TEACHER],
    classScope: ['ALL'],
    uploadedBy: mockUserId,
    version: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
    save: jest.fn().mockResolvedValue(true),
  };

  const mockDocModel = {
    create: jest.fn().mockResolvedValue(mockDocument),
    find: jest.fn().mockReturnValue({
      sort: jest.fn().mockReturnValue({
        skip: jest.fn().mockReturnValue({
          limit: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue([mockDocument]),
          }),
        }),
      }),
    }),
    countDocuments: jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue(1),
    }),
    findById: jest.fn(),
    findByIdAndDelete: jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue(mockDocument),
    }),
  };

  const mockChunkModel = {
    updateMany: jest.fn().mockResolvedValue({ modifiedCount: 5 }),
    deleteMany: jest.fn().mockResolvedValue({ deletedCount: 5 }),
  };

  const mockStorageService = {
    saveFile: jest.fn().mockResolvedValue({
      storagePath: '/storage/uploads/test.pdf',
      sizeBytes: 1234,
      originalName: 'test.pdf',
      mimeType: 'application/pdf',
    }),
    deleteFile: jest.fn().mockResolvedValue(undefined),
    getFileBuffer: jest.fn().mockResolvedValue(Buffer.from('pdf-content')),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DocumentsService,
        {
          provide: getModelToken(AppDocument.name),
          useValue: mockDocModel,
        },
        {
          provide: getModelToken(DocumentChunk.name),
          useValue: mockChunkModel,
        },
        {
          provide: STORAGE_SERVICE,
          useValue: mockStorageService,
        },
        {
          provide: require('../ingestion/ingestion.processor').IngestionService,
          useValue: {
            processDocument: jest.fn().mockResolvedValue(undefined),
          },
        },
      ],
    }).compile();

    service = module.get<DocumentsService>(DocumentsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should create document in QUEUED status', async () => {
    const mockFile: Express.Multer.File = {
      buffer: Buffer.from('%PDF-1.4'),
      originalname: 'test.pdf',
    } as any;

    const res = await service.create(
      mockFile,
      { title: 'Test Document', audienceRoles: [Role.TEACHER], classScope: ['ALL'] },
      mockUserId.toString(),
    );

    expect(res.status).toBe(DocumentStatus.QUEUED);
    expect(res.version).toBe(1);
    expect(mockStorageService.saveFile).toHaveBeenCalledWith(mockFile);
  });

  it('should update audience metadata and update chunk permissions without re-embedding', async () => {
    mockDocModel.findById.mockReturnValue({
      exec: jest.fn().mockResolvedValue({
        ...mockDocument,
        save: jest.fn().mockResolvedValue(true),
      }),
    });

    const res = await service.update(mockDocId.toString(), {
      title: 'New Title',
      audienceRoles: [Role.ADMIN, Role.PARENT],
      classScope: ['Class 8-A'],
    });

    expect(res).toBeDefined();
    expect(mockChunkModel.updateMany).toHaveBeenCalledWith(
      { documentId: mockDocId },
      {
        $set: {
          documentTitle: 'New Title',
          allowedRoles: [Role.ADMIN, Role.PARENT],
          classScope: ['Class 8-A'],
        },
      },
    );
  });

  it('should replace file, increment version, and purge old chunks', async () => {
    const docToReplace = {
      ...mockDocument,
      version: 1,
      save: jest.fn().mockResolvedValue(true),
    };
    mockDocModel.findById.mockReturnValue({
      exec: jest.fn().mockResolvedValue(docToReplace),
    });

    const mockFile = { buffer: Buffer.from('%PDF-1.4') } as any;
    const res = await service.replaceFile(mockDocId.toString(), mockFile);

    expect(res.version).toBe(2);
    expect(res.status).toBe(DocumentStatus.QUEUED);
    expect(mockChunkModel.deleteMany).toHaveBeenCalledWith({ documentId: mockDocId });
    expect(mockStorageService.deleteFile).toHaveBeenCalled();
  });

  it('should delete document, stored file, and associated chunks', async () => {
    mockDocModel.findById.mockReturnValue({
      exec: jest.fn().mockResolvedValue(mockDocument),
    });

    const res = await service.delete(mockDocId.toString());
    expect(res.message).toContain('deleted');
    expect(mockStorageService.deleteFile).toHaveBeenCalled();
    expect(mockChunkModel.deleteMany).toHaveBeenCalledWith({ documentId: mockDocId });
    expect(mockDocModel.findByIdAndDelete).toHaveBeenCalledWith(mockDocId.toString());
  });

  it('should get file metadata and stream buffer', async () => {
    mockDocModel.findById.mockReturnValue({
      exec: jest.fn().mockResolvedValue(mockDocument),
    });
    mockStorageService.getFileBuffer = jest.fn().mockResolvedValue(Buffer.from('pdf-content'));

    const fileMeta = await service.getFile(mockDocId.toString());
    expect(fileMeta.storagePath).toBe(mockDocument.storagePath);
    expect(fileMeta.originalName).toBe(mockDocument.originalName);

    const { buffer, mimeType } = await service.getFileBuffer(mockDocId.toString());
    expect(buffer.toString()).toBe('pdf-content');
    expect(mimeType).toBe('application/pdf');
  });

  it('should update fileUrl to Cloudinary HTTPS URL when replacing file with cloud storage', async () => {
    const docToReplace = {
      ...mockDocument,
      version: 1,
      save: jest.fn().mockResolvedValue(true),
    };
    mockDocModel.findById.mockReturnValue({
      exec: jest.fn().mockResolvedValue(docToReplace),
    });
    mockStorageService.saveFile.mockResolvedValueOnce({
      storagePath: 'https://res.cloudinary.com/school/raw/upload/v1/test.pdf',
      sizeBytes: 4567,
      originalName: 'new.pdf',
      mimeType: 'application/pdf',
    });

    const mockFile = { buffer: Buffer.from('%PDF-1.4'), originalname: 'new.pdf' } as any;
    const res = await service.replaceFile(mockDocId.toString(), mockFile);

    expect(res.version).toBe(2);
    expect(res.fileUrl).toBe('https://res.cloudinary.com/school/raw/upload/v1/test.pdf');
    expect(mockStorageService.deleteFile).toHaveBeenCalledWith(mockDocument.storagePath);
  });
});
