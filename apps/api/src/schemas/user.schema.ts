import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { Role } from '@school-copilot/shared';

export type UserDocument = User & Document;

@Schema({ timestamps: true, collection: 'users' })
export class User {
  @Prop({ required: true, unique: true, lowercase: true, trim: true })
  email!: string;

  @Prop({ required: true, trim: true })
  name!: string;

  @Prop({ required: true })
  passwordHash!: string;

  @Prop({ required: true, enum: Role, default: Role.PARENT })
  role!: Role;

  @Prop({ type: [{ type: Types.ObjectId, ref: 'SchoolClass' }], default: [] })
  classIds!: Types.ObjectId[];

  @Prop({ default: true })
  isActive!: boolean;

  createdAt?: Date;
  updatedAt?: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);
