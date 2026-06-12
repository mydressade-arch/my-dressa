import { IsEmail, IsString, MinLength, MaxLength, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({ example: 'kunde@example.com' })
  @IsEmail({}, { message: 'Ungültige E-Mail-Adresse' })
  email: string;

  @ApiProperty({ example: 'Test1234!' })
  @IsString()
  @MinLength(8, { message: 'Passwort muss mindestens 8 Zeichen haben' })
  @MaxLength(64)
  password: string;

  @ApiProperty({ example: 'Maria' })
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  firstName: string;

  @ApiProperty({ example: 'Müller' })
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  lastName: string;

  @ApiProperty({ example: '+49 151 12345678', required: false })
  @IsOptional()
  @IsString()
  phone?: string;
}
