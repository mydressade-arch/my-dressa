import {
  IsString, IsOptional, IsNumber, IsBoolean, IsArray,
  MinLength, MaxLength, Min, ValidateNested, ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class ProductVariantDto {
  @ApiProperty({ example: 'M' })
  @IsString()
  size: string;

  @ApiProperty({ example: 'Schwarz' })
  @IsString()
  color: string;

  @ApiProperty({ example: 1 })
  @IsNumber()
  @Min(0)
  stockQuantity: number;
}

export class CreateProductDto {
  @ApiProperty({ example: 'Elegantes Abendkleid' })
  @IsString()
  @MinLength(3)
  @MaxLength(120)
  title: string;

  @ApiProperty({ example: 'Ein wunderschönes schwarzes Abendkleid...' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ApiProperty({ example: 89.99, required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  salePrice?: number;

  @ApiProperty({ example: 29.99, required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  rentalPrice?: number;

  @ApiProperty({ example: 'Abendmode' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiProperty({ example: true })
  @IsOptional()
  @IsBoolean()
  isForSale?: boolean;

  @ApiProperty({ example: true })
  @IsOptional()
  @IsBoolean()
  isForRent?: boolean;

  @ApiProperty({ example: 15.00, description: 'Versandkosten in €', required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  shippingCost?: number;

  @ApiProperty({ example: 50, description: 'Kaution in €', required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  depositAmount?: number;

  @ApiProperty({ type: [ProductVariantDto], required: false })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductVariantDto)
  variants?: ProductVariantDto[];
}
