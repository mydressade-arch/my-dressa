import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { StripeWebhookController } from './stripe-webhook.controller';
import { BankAccountService } from './bank-account.service';
import { NotificationsModule } from '../notifications/notifications.module';
import { StorageService } from '../products/storage.service';
import { BankAccountController } from './bank-account.controller';
import { PayoutReceipt } from '../commissions/payout-receipt.entity';
import { Order } from '../orders/order.entity';
import { Rental } from '../rentals/rental.entity';
import { Deposit } from '../rentals/deposit.entity';
import { Commission } from '../commissions/commission.entity';
import { MerchantProfile } from '../users/merchant-profile.entity';
import { MerchantPayout } from '../commissions/merchant-payout.entity';

@Module({
  imports: [
    ConfigModule,
    NotificationsModule,
    TypeOrmModule.forFeature([
      Order, Rental, Deposit, Commission, MerchantProfile, MerchantPayout, PayoutReceipt,
    ]),
  ],
  controllers: [PaymentsController, StripeWebhookController, BankAccountController],
  providers: [PaymentsService, BankAccountService, StorageService],
  exports: [PaymentsService],
})
export class PaymentsModule {}
