import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsIn, Matches, ValidateNested } from 'class-validator';
import { DAY_PATTERN } from '../../common/days.js';
import type { HalfDay } from '../../session/slots.js';

export class HalfDayDto {
  @ApiProperty({ example: '2027-06-24' })
  @Matches(DAY_PATTERN, { message: 'day must be a day, YYYY-MM-DD' })
  day!: string;

  @ApiProperty({ enum: ['MORNING', 'AFTERNOON'] })
  @IsIn(['MORNING', 'AFTERNOON'])
  halfDay!: HalfDay;
}

/** The whole list replaces the previous one. Empty: available all week. */
export class SaveUnavailabilityDto {
  @ApiProperty({ type: [HalfDayDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => HalfDayDto)
  @ArrayMaxSize(10)
  halfDays!: HalfDayDto[];
}
