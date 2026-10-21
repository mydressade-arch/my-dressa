import { IsEmail, IsOptional, IsString } from 'class-validator';

export class SubscribeDto {
  @IsEmail({}, { message: 'Bitte eine gültige E-Mail-Adresse angeben' })
  email: string;

  @IsOptional()
  @IsString()
  source?: string;
}
