import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AppDocument, AppDocumentSchema } from '../schemas/document.schema';
import { DocumentChunk, DocumentChunkSchema } from '../schemas/document-chunk.schema';
import { StorageModule } from '../storage/storage.module';
import { DocumentsController } from './documents.controller';
import { DocumentsService } from './documents.service';
import { RolesGuard } from '../common/guards/roles.guard';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: AppDocument.name, schema: AppDocumentSchema },
      { name: DocumentChunk.name, schema: DocumentChunkSchema },
    ]),
    StorageModule,
  ],
  controllers: [DocumentsController],
  providers: [DocumentsService, RolesGuard],
  exports: [DocumentsService],
})
export class DocumentsModule {}
