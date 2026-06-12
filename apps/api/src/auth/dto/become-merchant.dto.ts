import { IsString, MinLength, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class BecomeMerchantDto {
  @ApiProperty({ example: 'Marias Vintage Mode' })
  @IsString()
  @MinLength(3)
  @MaxLength(100)
  shopName: string;
}
