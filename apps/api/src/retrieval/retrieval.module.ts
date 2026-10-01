import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DocumentChunk, DocumentChunkSchema } from '../schemas/document-chunk.schema';
import { IngestionModule } from '../ingestion/ingestion.module';
import { RetrievalService } from './retrieval.service';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: DocumentChunk.name, schema: DocumentChunkSchema }]),
    IngestionModule,
  ],
  providers: [RetrievalService],
  exports: [RetrievalService],
})
export class RetrievalModule {}
