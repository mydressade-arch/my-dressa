import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum ReturnCondition {
  GOOD = 'good',
  DAMAGED = 'damaged',
  LOST = 'lost',
}

export class ReturnRentalDto {
  @ApiProperty({ enum: ReturnCondition })
  @IsEnum(ReturnCondition)
  condition: ReturnCondition;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  damageNotes?: string;
}
