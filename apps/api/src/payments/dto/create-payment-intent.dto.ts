import { IsUUID, IsEnum, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { OrderType } from '../../orders/order.entity';

export class CreatePaymentIntentDto {
  @ApiProperty()
  @IsUUID()
  orderId: string;
}

export class ConfirmPaymentDto {
  @ApiProperty()
  @IsUUID()
  orderId: string;

  @ApiProperty()
  stripePaymentIntentId: string;
}
