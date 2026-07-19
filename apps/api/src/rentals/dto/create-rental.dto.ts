import { IsUUID, IsDateString, IsBoolean, IsString, ValidateNested, IsOptional, IsDefined } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class LegalConsentDto {
  @ApiProperty({ example: '1.0' })
  @IsString()
  agbVersion: string;

  @ApiProperty({ example: '1.0' })
  @IsString()
  rentalTermsVersion: string;

  @ApiProperty({ example: true })
  @IsBoolean()
  liabilityAccepted: boolean;

  @ApiProperty({ example: true, description: 'Zustimmung zur Kaution (separat)' })
  @IsBoolean()
  depositAccepted: boolean;

  @ApiProperty({ example: '1.0', required: false })
  @IsOptional()
  @IsString()
  depositTermsVersion?: string;
}

export class CreateRentalDto {
  @ApiProperty({ example: 'uuid-of-product-variant' })
  @IsUUID()
  productVariantId: string;

  @ApiProperty({ example: '2025-09-01' })
  @IsDateString()
  startDate: string;

  // endDate wird serverseitig berechnet (startDate + feste Mietdauer).
  // Optional, falls ein Client es noch mitschickt (wird ignoriert).
  @ApiProperty({ example: '2025-09-11', required: false })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  // shippingAddress optional — wird in Order gespeichert, nicht in Rental
  @IsOptional()
  shippingAddress?: Record<string, any>;

  @ApiProperty({ type: LegalConsentDto })
  @IsDefined()
  @ValidateNested()
  @Type(() => LegalConsentDto)
  consent: LegalConsentDto;
}
