import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SupportController } from './support.controller';
import { SupportService } from './support.service';
import { Order } from '../orders/order.entity';
import { User } from '../users/user.entity';
import { DamageReport } from '../rentals/damage-report.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Order, User, DamageReport])],
  controllers: [SupportController],
  providers: [SupportService],
})
export class SupportModule {}
