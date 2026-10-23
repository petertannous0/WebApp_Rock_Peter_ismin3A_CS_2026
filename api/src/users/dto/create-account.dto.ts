import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsInt, IsString, Min, MinLength } from 'class-validator';
import { ACCOUNT_ROLES, type AccountRole } from '../user.js';

/** No email here: the account takes the email of the teacher or student it is for. */
export class CreateAccountDto {
  @ApiProperty({ enum: ACCOUNT_ROLES, example: 'ENSEIGNANT' })
  @IsIn(ACCOUNT_ROLES)
  role!: AccountRole;

  @ApiProperty({ description: 'Id of the teacher (ENSEIGNANT) or of the student (ELEVE)', example: 1 })
  @IsInt()
  @Min(1)
  personId!: number;

  @ApiProperty({ description: 'The first password, typed by the admin', minLength: 8, example: 'soutenance2027' })
  @IsString()
  @MinLength(8)
  password!: string;
}
