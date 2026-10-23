import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'admin@castelmont.fr' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'soutenance2027' })
  @IsString()
  @IsNotEmpty()
  password!: string;
}
