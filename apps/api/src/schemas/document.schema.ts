import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document as MongoDocument, Types } from 'mongoose';
import { Role, DocumentStatus } from '@school-copilot/shared';

export type AppDocumentDocument = AppDocument & MongoDocument;

@Schema({ timestamps: true, collection: 'documents' })
export class AppDocument {
  @Prop({ required: true, trim: true })
  title!: string;

  @Prop({ required: true })
  originalName!: string;

  @Prop({ required: true })
  storagePath!: string;

  @Prop({ type: String, default: null })
  fileUrl?: string | null;

  @Prop({ required: true, default: 'application/pdf' })
  mimeType!: string;

  @Prop({ required: true })
  sizeBytes!: number;

  @Prop({ required: true, enum: DocumentStatus, default: DocumentStatus.QUEUED })
  status!: DocumentStatus;

  @Prop({ type: String, default: null })
  errorMessage?: string | null;

  @Prop({ type: Number, default: null })
  pageCount?: number | null;

  @Prop({ type: [String], enum: Role, required: true })
  audienceRoles!: Role[];

  @Prop({ type: [String], required: true, default: ['ALL'] })
  classScope!: string[];

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  uploadedBy!: Types.ObjectId;

  @Prop({ required: true, default: 1 })
  version!: number;

  createdAt?: Date;
  updatedAt?: Date;
}

export const AppDocumentSchema = SchemaFactory.createForClass(AppDocument);
