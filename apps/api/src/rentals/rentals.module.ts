import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Rental } from './rental.entity';
import { Deposit } from './deposit.entity';
import { LegalConsent } from './legal-consent.entity';
import { RentalsService } from './rentals.service';
import { RentalsController } from './rentals.controller';
import { RentalScheduler } from './rental.scheduler';
import { Order } from '../orders/order.entity';
import { ProductVariant } from '../products/product-variant.entity';
import { User } from '../users/user.entity';
import { ConfigModule } from '@nestjs/config';
import { NotificationsModule } from '../notifications/notifications.module';
import { StorageService } from '../products/storage.service';
import { MerchantProfile } from '../users/merchant-profile.entity';
import { DamageReport } from './damage-report.entity';
import { DamageReportsService } from './damage-reports.service';
import { DamageReportsController } from './damage-reports.controller';
import { ProductsModule } from '../products/products.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Rental, Deposit, LegalConsent, Order, ProductVariant, User, DamageReport, MerchantProfile]),
    NotificationsModule,
    ProductsModule,
    ConfigModule,
  ],
  controllers: [RentalsController, DamageReportsController],
  providers: [RentalsService, RentalScheduler, DamageReportsService, StorageService],
  exports: [RentalsService],
})
export class RentalsModule {}
