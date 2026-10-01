import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AppDocument, AppDocumentSchema } from '../schemas/document.schema';
import { DocumentChunk, DocumentChunkSchema } from '../schemas/document-chunk.schema';
import { StorageModule } from '../storage/storage.module';
import { PdfParserService } from './parser/pdf-parser.service';
import { SemanticChunkerService } from './chunker/semantic-chunker.service';
import { IngestionService } from './ingestion.processor';
import { IngestionWorker } from './ingestion.worker';
import { OpenAiEmbeddingProvider } from '../llm/openai-embedding.provider';
import { EMBEDDING_PROVIDER } from '../llm/embedding.interface';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: AppDocument.name, schema: AppDocumentSchema },
      { name: DocumentChunk.name, schema: DocumentChunkSchema },
    ]),
    StorageModule,
  ],
  providers: [
    PdfParserService,
    SemanticChunkerService,
    IngestionService,
    IngestionWorker,
    OpenAiEmbeddingProvider,
    {
      provide: EMBEDDING_PROVIDER,
      useClass: OpenAiEmbeddingProvider,
    },
  ],
  exports: [
    IngestionService,
    PdfParserService,
    SemanticChunkerService,
    EMBEDDING_PROVIDER,
    OpenAiEmbeddingProvider,
  ],
})
export class IngestionModule {}
