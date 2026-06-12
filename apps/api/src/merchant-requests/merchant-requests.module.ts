import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MerchantRequest } from './merchant-request.entity';
import { MerchantRequestsService } from './merchant-requests.service';
import { MerchantRequestsController } from './merchant-requests.controller';
import { User } from '../users/user.entity';
import { MerchantProfile } from '../users/merchant-profile.entity';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [TypeOrmModule.forFeature([MerchantRequest, User, MerchantProfile]), NotificationsModule],
  controllers: [MerchantRequestsController],
  providers: [MerchantRequestsService],
  exports: [MerchantRequestsService],
})
export class MerchantRequestsModule {}
