import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AuthController } from './auth.controller';
import { NotificationsModule } from '../notifications/notifications.module';
import { AuthService } from './auth.service';
import { TwoFaService } from './two-fa.service';
import { TwoFaController } from './two-fa.controller';
import { JwtStrategy } from './strategies/jwt.strategy';
import { LocalStrategy } from './strategies/local.strategy';
import { User } from '../users/user.entity';
import { MerchantProfile } from '../users/merchant-profile.entity';
import { LegalConsent } from '../rentals/legal-consent.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, MerchantProfile, LegalConsent]),
    NotificationsModule,
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: config.get<string>('JWT_EXPIRES_IN', '15m') },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [AuthController, TwoFaController],
  providers: [AuthService, TwoFaService, JwtStrategy, LocalStrategy],
  exports: [AuthService],
})
export class AuthModule {}
