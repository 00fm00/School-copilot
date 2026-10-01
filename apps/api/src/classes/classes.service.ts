import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { SchoolClassDto } from '@school-copilot/shared';
import { SchoolClass, SchoolClassDocument } from '../schemas/school-class.schema';

@Injectable()
export class ClassesService {
  constructor(@InjectModel(SchoolClass.name) private classModel: Model<SchoolClassDocument>) {}

  async findAll(): Promise<SchoolClassDto[]> {
    const classes = await this.classModel.find().sort({ name: 1 }).exec();
    return classes.map((c) => ({
      id: c._id.toString(),
      name: c.name,
    }));
  }
}
