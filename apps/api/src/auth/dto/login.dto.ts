import { IsEmail, IsString, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @IsOptional()
  @IsString()
  twoFaCode?: string;
  @ApiProperty({ example: 'kunde@mydressa.de', description: 'E-Mail Adresse' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'Customer123!', description: 'Passwort' })
  @IsString()
  password: string;
}
