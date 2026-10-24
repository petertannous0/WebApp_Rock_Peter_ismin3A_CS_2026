import { ApiProperty } from '@nestjs/swagger';
import { Role } from '../../generated/prisma/enums.js';
import type { JwtPayload } from '../auth.guard.js';

export class JwtPayloadDto implements JwtPayload {
  @ApiProperty({ description: 'User id', example: 1 })
  sub!: number;

  @ApiProperty({ example: 'admin@castelmont.fr' })
  email!: string;

  @ApiProperty({ enum: Role, enumName: 'Role', example: Role.ADMIN })
  role!: Role;
}
