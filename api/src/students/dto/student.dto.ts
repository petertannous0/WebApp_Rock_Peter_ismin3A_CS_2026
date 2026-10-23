import { ApiProperty, ApiPropertyOptional, IntersectionType } from '@nestjs/swagger';
import { IsInt, IsOptional, Min } from 'class-validator';
import { PersonDto, PersonPatchDto } from '../../common/person.dto.js';

class StudentRefsDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  @Min(1)
  companyId!: number;

  @ApiProperty({ description: 'A tutor of that company', example: 1 })
  @IsInt()
  @Min(1)
  companyTutorId!: number;

  @ApiProperty({ description: 'The teacher who follows the student', example: 1 })
  @IsInt()
  @Min(1)
  academicTutorId!: number;
}

class StudentRefsPatchDto {
  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  companyId?: number;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  companyTutorId?: number;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  academicTutorId?: number;
}

export class CreateStudentDto extends IntersectionType(PersonDto, StudentRefsDto) {}

export class UpdateStudentDto extends IntersectionType(PersonPatchDto, StudentRefsPatchDto) {}
