import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Role } from '../../generated/prisma/enums.js';
import type { Account } from '../user.js';

/** An account, the way the API answers it: a class, so Swagger can read it. */
export class AccountDto implements Account {
  @ApiProperty({ example: 2 })
  id!: number;

  @ApiProperty({ example: 'hugo.martin@castelmont.fr' })
  email!: string;

  @ApiProperty({ enum: Role, enumName: 'Role' })
  role!: Role;

  @ApiPropertyOptional({ example: 'Hugo Martin' })
  name?: string;

  @ApiPropertyOptional({ example: 1 })
  teacherId?: number;

  @ApiPropertyOptional()
  studentId?: number;
}
