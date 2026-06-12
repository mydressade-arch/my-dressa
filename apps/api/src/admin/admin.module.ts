import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../users/user.entity';
import { Product } from '../products/product.entity';
import { Order } from '../orders/order.entity';
import { MerchantProfile } from '../users/merchant-profile.entity';
import { Commission } from '../commissions/commission.entity';
import { Rental } from '../rentals/rental.entity';
import { StorageService } from '../products/storage.service';
import { ProductsModule } from '../products/products.module';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';

@Module({
  imports: [TypeOrmModule.forFeature([User, Product, Order, MerchantProfile, Commission, Rental]), ProductsModule],
  controllers: [AdminController],
  providers: [AdminService, StorageService],
})
export class AdminModule {}
