import {
  Controller,
  Get,
  Post,
  Patch,
  Put,
  Delete,
  Param,
  Body,
  Query,
  UseInterceptors,
  UploadedFile,
  UseGuards,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { Role } from '@school-copilot/shared';
import { DocumentsService } from './documents.service';
import { CreateDocumentDto } from './dto/create-document.dto';
import { UpdateDocumentDto } from './dto/update-document.dto';
import { PaginationDto } from './dto/pagination.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Documents')
@ApiBearerAuth()
@UseGuards(RolesGuard)
@Roles(Role.ADMIN)
@Controller('documents')
export class DocumentsController {
  constructor(private documentsService: DocumentsService) {}

  @Post()
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: 'Upload a PDF document and enqueue for ingestion (Admin only)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
        title: { type: 'string' },
        audienceRoles: { type: 'array', items: { type: 'string' } },
        classScope: { type: 'array', items: { type: 'string' } },
      },
      required: ['file', 'title', 'audienceRoles', 'classScope'],
    },
  })
  @ApiResponse({ status: 202, description: 'Document uploaded and queued' })
  @UseInterceptors(FileInterceptor('file'))
  async upload(
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: CreateDocumentDto,
    @CurrentUser('id') userId: string,
  ) {
    if (!file) {
      throw new BadRequestException('A PDF file is required');
    }
    return this.documentsService.create(file, dto, userId);
  }

  @Get()
  @ApiOperation({ summary: 'List all documents with pagination and status (Admin only)' })
  @ApiResponse({ status: 200, description: 'List of documents' })
  async list(@Query() pagination: PaginationDto) {
    return this.documentsService.findAll(pagination.page, pagination.limit);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get details of a single document (Admin only)' })
  @ApiResponse({ status: 200, description: 'Document details' })
  async getById(@Param('id') id: string) {
    return this.documentsService.findById(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update document title and audience metadata (Admin only)' })
  @ApiResponse({ status: 200, description: 'Document metadata updated' })
  async update(@Param('id') id: string, @Body() dto: UpdateDocumentDto) {
    return this.documentsService.update(id, dto);
  }

  @Put(':id/file')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: 'Replace PDF file, purge old chunks, and re-enqueue (Admin only)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
      },
      required: ['file'],
    },
  })
  @ApiResponse({ status: 202, description: 'File replaced and queued' })
  @UseInterceptors(FileInterceptor('file'))
  async replaceFile(@Param('id') id: string, @UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('A replacement PDF file is required');
    }
    return this.documentsService.replaceFile(id, file);
  }

  @Post(':id/reindex')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Re-trigger ingestion for a document (Admin only)' })
  @ApiResponse({ status: 200, description: 'Document marked for re-indexing' })
  async reindex(@Param('id') id: string) {
    return this.documentsService.reindex(id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete document, stored file, and all chunks (Admin only)' })
  @ApiResponse({ status: 200, description: 'Document deleted successfully' })
  async delete(@Param('id') id: string) {
    return this.documentsService.delete(id);
  }
}
