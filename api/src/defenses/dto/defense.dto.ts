import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsOptional, Min } from 'class-validator';

export class CheckDefenseDto {
  @ApiProperty({ example: 20 })
  @IsInt()
  @Min(1)
  studentId!: number;

  @ApiProperty({ example: 3 })
  @IsInt()
  @Min(1)
  secondTeacherId!: number;

  @ApiProperty({ example: 2 })
  @IsInt()
  @Min(1)
  slotId!: number;

  @ApiProperty({ example: 1 })
  @IsInt()
  @Min(1)
  roomId!: number;

  @ApiPropertyOptional({ description: 'When checking a move: the defense being moved', example: 12 })
  @IsOptional()
  @IsInt()
  @Min(1)
  defenseId?: number;
}

export class CreateDefenseDto {
  @ApiProperty({ example: 20 })
  @IsInt()
  @Min(1)
  studentId!: number;

  @ApiProperty({ example: 3 })
  @IsInt()
  @Min(1)
  secondTeacherId!: number;

  @ApiProperty({ example: 2 })
  @IsInt()
  @Min(1)
  slotId!: number;

  @ApiProperty({ example: 1 })
  @IsInt()
  @Min(1)
  roomId!: number;

  @ApiPropertyOptional({ description: '"Save anyway": accepts the warnings, never a blocking violation', default: false })
  @IsOptional()
  @IsBoolean()
  force?: boolean;
}

export class MoveDefenseDto {
  @ApiPropertyOptional({ example: 3 })
  @IsOptional()
  @IsInt()
  @Min(1)
  secondTeacherId?: number;

  @ApiPropertyOptional({ example: 2 })
  @IsOptional()
  @IsInt()
  @Min(1)
  slotId?: number;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  roomId?: number;

  @ApiPropertyOptional({ description: '"Save anyway": accepts the warnings, never a blocking violation', default: false })
  @IsOptional()
  @IsBoolean()
  force?: boolean;
}
