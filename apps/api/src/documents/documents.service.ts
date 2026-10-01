import { Injectable, NotFoundException, Inject, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { DocumentDto, DocumentStatus } from '@school-copilot/shared';
import { AppDocument, AppDocumentDocument } from '../schemas/document.schema';
import { DocumentChunk, DocumentChunkDocument } from '../schemas/document-chunk.schema';
import { IStorageService, STORAGE_SERVICE } from '../storage/storage.interface';
import { CreateDocumentDto } from './dto/create-document.dto';
import { UpdateDocumentDto } from './dto/update-document.dto';
import { IngestionService } from '../ingestion/ingestion.processor';

@Injectable()
export class DocumentsService {
  private readonly logger = new Logger(DocumentsService.name);

  constructor(
    @InjectModel(AppDocument.name) private docModel: Model<AppDocumentDocument>,
    @InjectModel(DocumentChunk.name) private chunkModel: Model<DocumentChunkDocument>,
    @Inject(STORAGE_SERVICE) private storageService: IStorageService,
    private ingestionService: IngestionService,
  ) {}

  private mapToDto(doc: AppDocumentDocument): DocumentDto {
    return {
      id: doc._id.toString(),
      title: doc.title,
      originalName: doc.originalName,
      mimeType: doc.mimeType,
      sizeBytes: doc.sizeBytes,
      status: doc.status,
      errorMessage: doc.errorMessage || undefined,
      pageCount: doc.pageCount || undefined,
      audienceRoles: doc.audienceRoles,
      classScope: doc.classScope,
      uploadedBy: doc.uploadedBy.toString(),
      version: doc.version,
      fileUrl:
        doc.fileUrl ||
        (doc.storagePath.startsWith('http')
          ? doc.storagePath
          : `/api/documents/${doc._id}/preview`),
      createdAt: (doc.createdAt || new Date()).toISOString(),
      updatedAt: (doc.updatedAt || new Date()).toISOString(),
    };
  }

  async create(
    file: Express.Multer.File,
    dto: CreateDocumentDto,
    userId: string,
  ): Promise<DocumentDto> {
    const stored = await this.storageService.saveFile(file);

    const doc = await this.docModel.create({
      title: dto.title,
      originalName: stored.originalName,
      storagePath: stored.storagePath,
      fileUrl: stored.storagePath.startsWith('http') ? stored.storagePath : null,
      mimeType: stored.mimeType,
      sizeBytes: stored.sizeBytes,
      status: DocumentStatus.QUEUED,
      audienceRoles: dto.audienceRoles,
      classScope: dto.classScope,
      uploadedBy: new Types.ObjectId(userId),
      version: 1,
    });

    this.logger.log(`Created document ${doc._id} (${doc.title}) in QUEUED status`);

    // Trigger asynchronous ingestion
    this.ingestionService
      .processDocument({ documentId: doc._id.toString(), version: 1 })
      .catch((err) => this.logger.error(`Error ingesting doc ${doc._id}: ${err.message}`));

    return this.mapToDto(doc);
  }

  async findAll(
    page: number = 1,
    limit: number = 20,
  ): Promise<{ items: DocumentDto[]; total: number; page: number; limit: number }> {
    const skip = (page - 1) * limit;
    const [docs, total] = await Promise.all([
      this.docModel.find().sort({ createdAt: -1 }).skip(skip).limit(limit).exec(),
      this.docModel.countDocuments().exec(),
    ]);

    return {
      items: docs.map((d) => this.mapToDto(d)),
      total,
      page,
      limit,
    };
  }

  async findById(id: string): Promise<DocumentDto> {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException(`Document ${id} not found`);
    }

    const doc = await this.docModel.findById(id).exec();
    if (!doc) {
      throw new NotFoundException(`Document ${id} not found`);
    }

    return this.mapToDto(doc);
  }

  async update(id: string, dto: UpdateDocumentDto): Promise<DocumentDto> {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException(`Document ${id} not found`);
    }

    const doc = await this.docModel.findById(id).exec();
    if (!doc) {
      throw new NotFoundException(`Document ${id} not found`);
    }

    if (dto.title) doc.title = dto.title;
    if (dto.audienceRoles) doc.audienceRoles = dto.audienceRoles;
    if (dto.classScope) doc.classScope = dto.classScope;

    await doc.save();

    // Update chunk metadata without re-embedding as per specification Section 6
    await this.chunkModel.updateMany(
      { documentId: doc._id },
      {
        $set: {
          documentTitle: doc.title,
          allowedRoles: doc.audienceRoles,
          classScope: doc.classScope,
        },
      },
    );

    this.logger.log(`Updated metadata for document ${doc._id}`);
    return this.mapToDto(doc);
  }

  async replaceFile(id: string, file: Express.Multer.File): Promise<DocumentDto> {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException(`Document ${id} not found`);
    }

    const doc = await this.docModel.findById(id).exec();
    if (!doc) {
      throw new NotFoundException(`Document ${id} not found`);
    }

    const oldStoragePath = doc.storagePath;
    const stored = await this.storageService.saveFile(file);

    // Delete old disk file and old chunks
    await this.storageService.deleteFile(oldStoragePath);
    await this.chunkModel.deleteMany({ documentId: doc._id });

    doc.storagePath = stored.storagePath;
    doc.fileUrl = stored.storagePath.startsWith('http') ? stored.storagePath : null;
    doc.originalName = stored.originalName;
    doc.sizeBytes = stored.sizeBytes;
    doc.mimeType = stored.mimeType;
    doc.status = DocumentStatus.QUEUED;
    doc.errorMessage = null;
    doc.pageCount = null;
    doc.version += 1;

    await doc.save();
    this.logger.log(`Replaced file for document ${doc._id}. Incremented version to ${doc.version}`);

    this.ingestionService
      .processDocument({ documentId: doc._id.toString(), version: doc.version })
      .catch((err) => this.logger.error(`Error ingesting doc ${doc._id}: ${err.message}`));

    return this.mapToDto(doc);
  }

  async getFile(id: string): Promise<{
    storagePath: string;
    fileUrl?: string | null;
    mimeType: string;
    originalName: string;
  }> {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException(`Document ${id} not found`);
    }

    const doc = await this.docModel.findById(id).exec();
    if (!doc) {
      throw new NotFoundException(`Document ${id} not found`);
    }

    const fileUrl = doc.fileUrl || (doc.storagePath.startsWith('http') ? doc.storagePath : null);

    return {
      storagePath: doc.storagePath,
      fileUrl,
      mimeType: doc.mimeType || 'application/pdf',
      originalName: doc.originalName,
    };
  }

  async getFileBuffer(
    id: string,
  ): Promise<{ buffer: Buffer; mimeType: string; originalName: string }> {
    const fileInfo = await this.getFile(id);
    const buffer = await this.storageService.getFileBuffer(fileInfo.storagePath);
    return {
      buffer,
      mimeType: fileInfo.mimeType,
      originalName: fileInfo.originalName,
    };
  }

  async reindex(id: string): Promise<DocumentDto> {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException(`Document ${id} not found`);
    }

    const doc = await this.docModel.findById(id).exec();
    if (!doc) {
      throw new NotFoundException(`Document ${id} not found`);
    }

    doc.status = DocumentStatus.QUEUED;
    doc.errorMessage = null;
    await doc.save();

    this.logger.log(`Marked document ${doc._id} for reindexing`);

    this.ingestionService
      .processDocument({ documentId: doc._id.toString(), version: doc.version })
      .catch((err) => this.logger.error(`Error reindexing doc ${doc._id}: ${err.message}`));

    return this.mapToDto(doc);
  }

  async delete(id: string): Promise<{ message: string }> {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException(`Document ${id} not found`);
    }

    const doc = await this.docModel.findById(id).exec();
    if (!doc) {
      throw new NotFoundException(`Document ${id} not found`);
    }

    await this.storageService.deleteFile(doc.storagePath);
    await this.chunkModel.deleteMany({ documentId: doc._id });
    await this.docModel.findByIdAndDelete(id).exec();

    this.logger.log(`Deleted document ${id}, chunks, and stored file`);
    return { message: 'Document and associated data deleted successfully' };
  }
}
