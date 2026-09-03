import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'admin@festival.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'festival2026', minLength: 6 })
  @IsString()
  @MinLength(6)
  password: string;
}
