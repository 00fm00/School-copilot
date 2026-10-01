import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { Role } from '@school-copilot/shared';
import { ClassesService } from './classes.service';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';

@ApiTags('Classes')
@ApiBearerAuth()
@UseGuards(RolesGuard)
@Controller('classes')
export class ClassesController {
  constructor(private classesService: ClassesService) {}

  @Roles(Role.ADMIN)
  @Get()
  @ApiOperation({ summary: 'List all school classes for audience selection' })
  @ApiResponse({ status: 200, description: 'List of classes' })
  async getClasses() {
    return this.classesService.findAll();
  }
}
