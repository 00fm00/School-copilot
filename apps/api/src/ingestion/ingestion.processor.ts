import { Injectable, Logger, Inject } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { DocumentStatus } from '@school-copilot/shared';
import { AppDocument, AppDocumentDocument } from '../schemas/document.schema';
import { DocumentChunk, DocumentChunkDocument } from '../schemas/document-chunk.schema';
import { IStorageService, STORAGE_SERVICE } from '../storage/storage.interface';
import { PdfParserService } from './parser/pdf-parser.service';
import { SemanticChunkerService } from './chunker/semantic-chunker.service';
import { EMBEDDING_PROVIDER, IEmbeddingProvider } from '../llm/embedding.interface';

export interface IngestionJobData {
  documentId: string;
  version: number;
}

@Injectable()
export class IngestionService {
  private readonly logger = new Logger(IngestionService.name);

  constructor(
    @InjectModel(AppDocument.name) private docModel: Model<AppDocumentDocument>,
    @InjectModel(DocumentChunk.name) private chunkModel: Model<DocumentChunkDocument>,
    @Inject(STORAGE_SERVICE) private storageService: IStorageService,
    @Inject(EMBEDDING_PROVIDER) private embeddingProvider: IEmbeddingProvider,
    private pdfParserService: PdfParserService,
    private chunkerService: SemanticChunkerService,
  ) {}

  async processDocument(data: IngestionJobData): Promise<void> {
    const { documentId, version } = data;
    this.logger.log(`Starting ingestion for document ${documentId}, version ${version}`);

    if (!Types.ObjectId.isValid(documentId)) {
      this.logger.error(`Invalid documentId: ${documentId}`);
      return;
    }

    const doc = await this.docModel.findById(documentId).exec();
    if (!doc) {
      this.logger.error(`Document not found: ${documentId}`);
      return;
    }

    // Step 7: Ignore jobs whose version is older than current document version
    if (version < doc.version) {
      this.logger.warn(
        `Ignoring stale ingestion job: job version ${version} < document version ${doc.version}`,
      );
      return;
    }

    try {
      // Step 2: Set PROCESSING
      doc.status = DocumentStatus.PROCESSING;
      doc.errorMessage = null;
      await doc.save();

      // Read file buffer from storage
      const fileBuffer = await this.storageService.getFileBuffer(doc.storagePath);

      // Extract text per page
      const parsed = await this.pdfParserService.parsePdfBuffer(fileBuffer);

      // If total extracted text is nearly empty, mark FAILED as per specification
      if (parsed.totalCharacters < 20 || parsed.pages.every((p) => p.text.trim().length === 0)) {
        doc.status = DocumentStatus.FAILED;
        doc.errorMessage = 'No extractable text. Scanned PDFs are not supported yet.';
        await doc.save();
        this.logger.warn(`Document ${documentId} failed: No extractable text`);
        return;
      }

      // Step 3: Chunk each page
      const chunks = this.chunkerService.chunkPages(doc.title, parsed.pages);

      if (chunks.length === 0) {
        doc.status = DocumentStatus.FAILED;
        doc.errorMessage = 'No extractable text. Scanned PDFs are not supported yet.';
        await doc.save();
        return;
      }

      this.logger.log(
        `Generated ${chunks.length} chunks across ${parsed.pageCount} page(s) for document ${doc.title}`,
      );

      // Step 4: Embed chunks in batches with retry and exponential backoff
      const textsToEmbed = chunks.map((c) => c.embeddedText);
      const embeddings = await this.embeddingProvider.embedChunks(textsToEmbed);

      // Step 7: Idempotency - delete existing chunks before inserting
      await this.chunkModel.deleteMany({ documentId: doc._id }).exec();

      // Step 5: Insert chunks with denormalized allowedRoles and classScope
      const chunkDocs = chunks.map((c, index) => ({
        documentId: doc._id,
        documentTitle: doc.title,
        page: c.page,
        chunkIndex: c.chunkIndex,
        text: c.text,
        embedding: embeddings[index],
        allowedRoles: doc.audienceRoles,
        classScope: doc.classScope,
      }));

      await this.chunkModel.insertMany(chunkDocs);

      // Step 6: Set READY and pageCount
      doc.status = DocumentStatus.READY;
      doc.pageCount = parsed.pageCount;
      doc.errorMessage = null;
      await doc.save();

      this.logger.log(
        `Successfully ingested document ${doc._id} (${doc.title}) with ${chunkDocs.length} chunks`,
      );
    } catch (err: any) {
      this.logger.error(`Error ingesting document ${documentId}: ${err.message}`, err.stack);
      doc.status = DocumentStatus.FAILED;
      doc.errorMessage =
        err.message || 'An error occurred during document processing. Please try reindexing.';
      await doc.save();
    }
  }
}
