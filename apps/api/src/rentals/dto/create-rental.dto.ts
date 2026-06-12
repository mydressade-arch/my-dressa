import { IsUUID, IsDateString, IsBoolean, IsString, ValidateNested, IsOptional } from 'class-validator';
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
}

export class CreateRentalDto {
  @ApiProperty({ example: 'uuid-of-product-variant' })
  @IsUUID()
  productVariantId: string;

  @ApiProperty({ example: '2025-09-01' })
  @IsDateString()
  startDate: string;

  @ApiProperty({ example: '2025-09-05' })
  @IsDateString()
  endDate: string;

  // shippingAddress optional — wird in Order gespeichert, nicht in Rental
  @IsOptional()
  shippingAddress?: Record<string, any>;

  @ApiProperty({ type: LegalConsentDto })
  @ValidateNested()
  @Type(() => LegalConsentDto)
  consent: LegalConsentDto;
}
