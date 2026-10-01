import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document as MongoDocument, Types } from 'mongoose';
import { Role } from '@school-copilot/shared';

export type DocumentChunkDocument = DocumentChunk & MongoDocument;

@Schema({ timestamps: true, collection: 'document_chunks' })
export class DocumentChunk {
  @Prop({ type: Types.ObjectId, ref: 'AppDocument', required: true, index: true })
  documentId!: Types.ObjectId;

  @Prop({ required: true })
  documentTitle!: string;

  @Prop({ required: true })
  page!: number;

  @Prop({ required: true })
  chunkIndex!: number;

  @Prop({ required: true })
  text!: string;

  @Prop({ type: [Number], required: true })
  embedding!: number[];

  @Prop({ type: [String], enum: Role, required: true, index: true })
  allowedRoles!: Role[];

  @Prop({ type: [String], required: true, index: true })
  classScope!: string[];

  createdAt?: Date;
  updatedAt?: Date;
}

export const DocumentChunkSchema = SchemaFactory.createForClass(DocumentChunk);
