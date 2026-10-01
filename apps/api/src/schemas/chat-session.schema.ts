import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ChatSessionDocument = ChatSession & Document;

@Schema({ timestamps: true, collection: 'chat_sessions' })
export class ChatSession {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId!: Types.ObjectId;

  @Prop({ required: true, default: 'New Conversation' })
  title!: string;

  createdAt?: Date;
  updatedAt?: Date;
}

export const ChatSessionSchema = SchemaFactory.createForClass(ChatSession);
