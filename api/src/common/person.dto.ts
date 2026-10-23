import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator';

/** The fields every person has: teachers, students, company tutors. */
export class PersonDto {
  @ApiProperty({ example: 'Léa' })
  @IsString()
  @IsNotEmpty()
  firstName!: string;

  @ApiProperty({ example: 'Martin' })
  @IsString()
  @IsNotEmpty()
  lastName!: string;

  @ApiProperty({ example: 'lea.martin@castelmont.fr' })
  @IsEmail()
  email!: string;
}

/** The same fields, each optional: a partial update. */
export class PersonPatchDto {
  @ApiPropertyOptional({ example: 'Léa' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  firstName?: string;

  @ApiPropertyOptional({ example: 'Martin' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  lastName?: string;

  @ApiPropertyOptional({ example: 'lea.martin@castelmont.fr' })
  @IsOptional()
  @IsEmail()
  email?: string;
}
