import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class RefreshDto {
  @ApiPropertyOptional({ description: 'Optional refresh token in request body' })
  @IsOptional()
  @IsString()
  refreshToken?: string;
}
