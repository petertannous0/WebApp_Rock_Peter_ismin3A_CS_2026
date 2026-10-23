import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  Matches,
  ValidateNested,
} from 'class-validator';
import { DAY_PATTERN } from '../../common/days.js';

export class RoomInputDto {
  @ApiProperty({ example: 'Salle A' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({ example: 'https://visio.castelmont.fr/salle-a' })
  @IsUrl({ require_tld: false })
  videoLink!: string;

  @ApiProperty({ example: false })
  @IsBoolean()
  closedThursdayAfternoon!: boolean;
}

export class CreateSessionDto {
  @ApiProperty({ example: 'Soutenances 3A, juin 2027' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({ description: 'The Monday, YYYY-MM-DD', example: '2027-06-21' })
  @Matches(DAY_PATTERN, { message: 'startDate must be a day, YYYY-MM-DD' })
  startDate!: string;

  @ApiProperty({ type: [RoomInputDto] })
  @ValidateNested({ each: true })
  @Type(() => RoomInputDto)
  @ArrayMinSize(1)
  @ArrayMaxSize(10)
  rooms!: RoomInputDto[];
}

export class UpdateSessionDto {
  @ApiPropertyOptional({ example: 'Soutenances 3A, juin 2027' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @ApiPropertyOptional({ description: 'The Monday, YYYY-MM-DD. Refused once a defense is placed.', example: '2027-06-21' })
  @IsOptional()
  @Matches(DAY_PATTERN, { message: 'startDate must be a day, YYYY-MM-DD' })
  startDate?: string;
}

export class UpdateRoomDto {
  @ApiPropertyOptional({ example: 'Salle A' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @ApiPropertyOptional({ example: 'https://visio.castelmont.fr/salle-a' })
  @IsOptional()
  @IsUrl({ require_tld: false })
  videoLink?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  closedThursdayAfternoon?: boolean;
}
