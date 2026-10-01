import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SchoolClass, SchoolClassSchema } from '../schemas/school-class.schema';
import { ClassesController } from './classes.controller';
import { ClassesService } from './classes.service';
import { RolesGuard } from '../common/guards/roles.guard';

@Module({
  imports: [MongooseModule.forFeature([{ name: SchoolClass.name, schema: SchoolClassSchema }])],
  controllers: [ClassesController],
  providers: [ClassesService, RolesGuard],
  exports: [ClassesService],
})
export class ClassesModule {}
