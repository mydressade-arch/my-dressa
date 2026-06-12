import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { Order } from './order.entity';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { ProductVariant } from '../products/product-variant.entity';
import { User } from '../users/user.entity';
import { MerchantProfile } from '../users/merchant-profile.entity';
import { Rental } from '../rentals/rental.entity';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [TypeOrmModule.forFeature([Order, ProductVariant, User, Rental, MerchantProfile]), NotificationsModule, ConfigModule],
  controllers: [OrdersController],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}
