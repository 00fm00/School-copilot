import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type SchoolClassDocument = SchoolClass & Document;

@Schema({ timestamps: true, collection: 'classes' })
export class SchoolClass {
  @Prop({ required: true, unique: true, trim: true })
  name!: string;

  createdAt?: Date;
  updatedAt?: Date;
}

export const SchoolClassSchema = SchemaFactory.createForClass(SchoolClass);
