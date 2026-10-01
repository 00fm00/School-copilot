import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength, IsArray, IsEnum, ArrayMinSize } from 'class-validator';
import { Transform } from 'class-transformer';
import { Role } from '@school-copilot/shared';

export class CreateDocumentDto {
  @ApiProperty({ example: 'Leave Policy 2026' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title!: string;

  @ApiProperty({ enum: Role, isArray: true, example: [Role.TEACHER, Role.PARENT] })
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed) ? parsed : [value];
      } catch {
        return value.split(',').map((s: string) => s.trim());
      }
    }
    return value;
  })
  @IsArray()
  @ArrayMinSize(1, { message: 'At least one audience role must be selected' })
  @IsEnum(Role, { each: true, message: 'Each audience role must be ADMIN, TEACHER, or PARENT' })
  audienceRoles!: Role[];

  @ApiProperty({ example: ['ALL'], isArray: true })
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed) ? parsed : [value];
      } catch {
        return value.split(',').map((s: string) => s.trim());
      }
    }
    return value;
  })
  @IsArray()
  @ArrayMinSize(1, { message: 'At least one class scope must be selected' })
  classScope!: string[];
}
