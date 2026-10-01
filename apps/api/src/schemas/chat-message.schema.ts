import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { MessageRole } from '@school-copilot/shared';

export type ChatMessageDocument = ChatMessage & Document;

@Schema({ _id: false })
export class Citation {
  @Prop({ required: true })
  documentId!: string;

  @Prop({ required: true })
  title!: string;

  @Prop({ required: true })
  page!: number;

  @Prop({ required: true })
  chunkId!: string;
}

export const CitationSchema = SchemaFactory.createForClass(Citation);

@Schema({ timestamps: { createdAt: true, updatedAt: false }, collection: 'chat_messages' })
export class ChatMessage {
  @Prop({ type: Types.ObjectId, ref: 'ChatSession', required: true, index: true })
  sessionId!: Types.ObjectId;

  @Prop({ required: true, enum: ['user', 'assistant'] })
  role!: MessageRole;

  @Prop({ required: true })
  content!: string;

  @Prop({ type: [CitationSchema], default: [] })
  citations!: Citation[];

  @Prop({ required: true, default: false })
  refused!: boolean;

  createdAt?: Date;
}

export const ChatMessageSchema = SchemaFactory.createForClass(ChatMessage);
ChatMessageSchema.index({ sessionId: 1, createdAt: 1 });
