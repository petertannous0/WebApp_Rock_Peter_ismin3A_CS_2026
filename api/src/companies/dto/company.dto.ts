import { ApiProperty, ApiPropertyOptional, IntersectionType } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';
import { PersonDto, PersonPatchDto } from '../../common/person.dto.js';

export class CompanyDto {
  @ApiProperty({ example: 'Provence Microsystèmes' })
  @IsString()
  @IsNotEmpty()
  name!: string;
}

class CompanyRefDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  @Min(1)
  companyId!: number;
}

class CompanyRefPatchDto {
  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  companyId?: number;
}

export class CreateCompanyTutorDto extends IntersectionType(PersonDto, CompanyRefDto) {}

export class UpdateCompanyTutorDto extends IntersectionType(PersonPatchDto, CompanyRefPatchDto) {}
