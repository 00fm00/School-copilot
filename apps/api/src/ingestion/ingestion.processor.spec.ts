import { getModelToken } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { Types } from 'mongoose';
import { Role, DocumentStatus } from '@school-copilot/shared';
import { IngestionService } from './ingestion.processor';
import { AppDocument } from '../schemas/document.schema';
import { DocumentChunk } from '../schemas/document-chunk.schema';
import { STORAGE_SERVICE } from '../storage/storage.interface';
import { EMBEDDING_PROVIDER } from '../llm/embedding.interface';
import { PdfParserService } from './parser/pdf-parser.service';
import { SemanticChunkerService } from './chunker/semantic-chunker.service';

describe('IngestionService', () => {
  let service: IngestionService;

  const mockDocId = new Types.ObjectId();
  const mockDocument = {
    _id: mockDocId,
    title: 'Staff Handbook',
    storagePath: '/storage/test.pdf',
    version: 2,
    audienceRoles: [Role.TEACHER],
    classScope: ['ALL'],
    status: DocumentStatus.QUEUED,
    errorMessage: null,
    pageCount: null,
    save: jest.fn().mockResolvedValue(true),
  };

  const mockDocModel = {
    findById: jest.fn(),
  };

  const mockChunkModel = {
    deleteMany: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue({}) }),
    insertMany: jest.fn().mockResolvedValue([]),
  };

  const mockStorageService = {
    getFileBuffer: jest.fn().mockResolvedValue(Buffer.from('%PDF-1.4 test')),
  };

  const mockEmbeddingProvider = {
    embedChunks: jest.fn().mockResolvedValue([[0.1, 0.2, 0.3]]),
    embedQuery: jest.fn().mockResolvedValue([0.1, 0.2, 0.3]),
  };

  const mockPdfParser = {
    parsePdfBuffer: jest.fn().mockResolvedValue({
      pages: [{ pageNumber: 1, text: 'Valid extracted text from PDF with enough length.' }],
      pageCount: 1,
      totalCharacters: 50,
    }),
  };

  const mockChunker = {
    chunkPages: jest.fn().mockReturnValue([
      {
        page: 1,
        chunkIndex: 0,
        text: 'Valid extracted text from PDF with enough length.',
        embeddedText:
          'Document: Staff Handbook\n\nValid extracted text from PDF with enough length.',
      },
    ]),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IngestionService,
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
          provide: EMBEDDING_PROVIDER,
          useValue: mockEmbeddingProvider,
        },
        {
          provide: PdfParserService,
          useValue: mockPdfParser,
        },
        {
          provide: SemanticChunkerService,
          useValue: mockChunker,
        },
      ],
    }).compile();

    service = module.get<IngestionService>(IngestionService);
  });

  it('should skip job if version is older than current document version', async () => {
    mockDocModel.findById.mockReturnValue({
      exec: jest.fn().mockResolvedValue({ ...mockDocument, version: 3 }),
    });

    await service.processDocument({ documentId: mockDocId.toString(), version: 2 });
    expect(mockStorageService.getFileBuffer).not.toHaveBeenCalled();
  });

  it('should mark document FAILED if extracted text is too short or empty', async () => {
    const docInstance = { ...mockDocument, save: jest.fn().mockResolvedValue(true) };
    mockDocModel.findById.mockReturnValue({
      exec: jest.fn().mockResolvedValue(docInstance),
    });
    mockPdfParser.parsePdfBuffer.mockResolvedValueOnce({
      pages: [{ pageNumber: 1, text: '   ' }],
      pageCount: 1,
      totalCharacters: 3,
    });

    await service.processDocument({ documentId: mockDocId.toString(), version: 2 });

    expect(docInstance.status).toBe(DocumentStatus.FAILED);
    expect(docInstance.errorMessage).toContain('Scanned PDFs are not supported yet');
  });

  it('should ingest document, purge old chunks, insert new chunks, and set READY with pageCount', async () => {
    const docInstance = { ...mockDocument, save: jest.fn().mockResolvedValue(true) };
    mockDocModel.findById.mockReturnValue({
      exec: jest.fn().mockResolvedValue(docInstance),
    });

    await service.processDocument({ documentId: mockDocId.toString(), version: 2 });

    expect(mockChunkModel.deleteMany).toHaveBeenCalledWith({ documentId: mockDocId });
    expect(mockEmbeddingProvider.embedChunks).toHaveBeenCalled();
    expect(mockChunkModel.insertMany).toHaveBeenCalledWith([
      expect.objectContaining({
        documentId: mockDocId,
        page: 1,
        allowedRoles: [Role.TEACHER],
        classScope: ['ALL'],
      }),
    ]);
    expect(docInstance.status).toBe(DocumentStatus.READY);
    expect(docInstance.pageCount).toBe(1);
  });
});
