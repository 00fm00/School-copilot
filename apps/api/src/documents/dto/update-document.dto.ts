import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength, IsArray, IsEnum, ArrayMinSize } from 'class-validator';
import { Role } from '@school-copilot/shared';

export class UpdateDocumentDto {
  @ApiPropertyOptional({ example: 'Updated Leave Policy' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;

  @ApiPropertyOptional({ enum: Role, isArray: true })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @IsEnum(Role, { each: true })
  audienceRoles?: Role[];

  @ApiPropertyOptional({ example: ['ALL'], isArray: true })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  classScope?: string[];
}
