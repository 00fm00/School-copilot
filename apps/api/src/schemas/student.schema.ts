import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type StudentDocument = Student & Document;

@Schema({ timestamps: true, collection: 'students' })
export class Student {
  @Prop({ required: true, trim: true })
  name!: string;

  @Prop({ type: Types.ObjectId, ref: 'SchoolClass', required: true, index: true })
  classId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  parentUserId!: Types.ObjectId;

  createdAt?: Date;
  updatedAt?: Date;
}

export const StudentSchema = SchemaFactory.createForClass(Student);
