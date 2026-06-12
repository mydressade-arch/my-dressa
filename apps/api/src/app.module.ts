import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';

import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ProductsModule } from './products/products.module';
import { RentalsModule } from './rentals/rentals.module';
import { PaymentsModule } from './payments/payments.module';
import { OrdersModule } from './orders/orders.module';
import { CommissionsModule } from './commissions/commissions.module';
import { NotificationsModule } from './notifications/notifications.module';
import { AdminModule } from './admin/admin.module';
import { SupportModule } from './support/support.module';
import { MerchantRequestsModule } from './merchant-requests/merchant-requests.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),

    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        url: config.get<string>('DATABASE_URL'),
        autoLoadEntities: true,
        // synchronize IMMER false — wir nutzen nur Migrations
        synchronize: false,
        logging: config.get('NODE_ENV') === 'development',
      }),
      inject: [ConfigService],
    }),

    ThrottlerModule.forRoot([
      { name: 'short',  ttl: 1000,    limit: 10   },
      { name: 'medium', ttl: 60000,   limit: 100  },
      { name: 'long',   ttl: 3600000, limit: 1000 },
    ]),

    ScheduleModule.forRoot(),

    AuthModule,
    UsersModule,
    ProductsModule,
    RentalsModule,
    PaymentsModule,
    OrdersModule,
    CommissionsModule,
    NotificationsModule,
    AdminModule,
    SupportModule,
    MerchantRequestsModule,
  ],
})
export class AppModule {}
