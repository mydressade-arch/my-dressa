import {
  Injectable, UnauthorizedException, ConflictException,
  BadRequestException, Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { TwoFaService } from './two-fa.service';
import { randomBytes } from 'crypto';

import { User, UserRole } from '../users/user.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { MerchantProfile } from '../users/merchant-profile.entity';
import { RegisterDto } from './dto/register.dto';
import { BecomeMerchantDto } from './dto/become-merchant.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(MerchantProfile)
    private readonly merchantRepo: Repository<MerchantProfile>,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    private readonly notifications: NotificationsService,
    private readonly twoFaService: TwoFaService,
  ) {}

  async register(dto: RegisterDto) {
    const exists = await this.userRepo.findOne({ where: { email: dto.email } });
    if (exists) throw new ConflictException('E-Mail ist bereits vergeben');

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const verificationToken = randomBytes(32).toString('hex');

    const user = this.userRepo.create({
      email: dto.email,
      passwordHash,
      firstName: dto.firstName,
      lastName: dto.lastName,
      phone: dto.phone,
      emailVerificationToken: verificationToken,
      role: UserRole.CUSTOMER,
      isVerified: this.config.get('NODE_ENV') === 'development',
    });
    await this.userRepo.save(user);

    this.logger.log(`Neuer User: ${user.email} | VerifyToken: ${verificationToken}`);

    // E-Mail Verifizierung senden
    await this.notifications.sendEmailVerification(user.email, user.firstName, verificationToken);

    return {
      message: 'Registrierung erfolgreich. Bitte bestätige deine E-Mail.',
      ...(this.config.get('NODE_ENV') === 'development' && { verificationToken }),
    };
  }

  async verifyEmail(token: string) {
    const user = await this.userRepo.findOne({
      where: { emailVerificationToken: token },
    });
    if (!user) throw new BadRequestException('Ungültiger Token');
    user.isVerified = true;
    user.emailVerificationToken = null;
    await this.userRepo.save(user);

    // Willkommens-E-Mail nach Verifizierung
    await this.notifications.sendWelcome(user.email, user.firstName);

    return { message: 'E-Mail verifiziert' };
  }

  async validateUser(email: string, password: string): Promise<User | null> {
    const user = await this.userRepo.findOne({ where: { email } });
    if (!user || !user.isActive) return null;
    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) return null;
    return user;
  }

  async login(user: User, twoFaCode?: string) {
    if (!user.isVerified) {
      throw new UnauthorizedException('Bitte zuerst E-Mail bestätigen');
    }
    // 2FA prüfen wenn aktiviert
    if (user.twoFaEnabled && user.twoFaSecret) {
      if (!twoFaCode) {
        // Signal an Frontend: 2FA Code benötigt
        return { requiresTwoFa: true, userId: user.id };
      }
      const { authenticator } = require('otplib');
      const isValid = authenticator.verify({ token: twoFaCode, secret: user.twoFaSecret });
      if (!isValid) throw new UnauthorizedException('Ungültiger 2FA Code');
    }
    const tokens = await this.generateTokens(user);
    const refreshHash = await bcrypt.hash(tokens.refreshToken, 10);
    await this.userRepo.update(user.id, { refreshTokenHash: refreshHash } as any);
    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        twoFaEnabled: user.twoFaEnabled || false,
      },
    };
  }

  async refreshTokens(userId: string, refreshToken: string) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user || !(user as any).refreshTokenHash) throw new UnauthorizedException();
    const isValid = await bcrypt.compare(refreshToken, (user as any).refreshTokenHash);
    if (!isValid) throw new UnauthorizedException('Ungültiger Refresh Token');
    const tokens = await this.generateTokens(user);
    const refreshHash = await bcrypt.hash(tokens.refreshToken, 10);
    await this.userRepo.update(user.id, { refreshTokenHash: refreshHash } as any);
    return tokens;
  }

  async logout(userId: string) {
    await this.userRepo.update(userId, { refreshTokenHash: null } as any);
    return { message: 'Abgemeldet' };
  }

  async forgotPassword(email: string) {
    const user = await this.userRepo.findOne({ where: { email } });
    if (user) {
      const token = randomBytes(32).toString('hex');
      const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 Stunde

      // Token in DB speichern
      await this.userRepo.update(user.id, {
        resetPasswordToken: token,
        resetPasswordExpires: expires,
      });

      // E-Mail senden
      const frontendUrl = this.config.get('FRONTEND_URL', 'http://localhost:3000');
      const resetUrl = `${frontendUrl}/auth/reset-password?token=${token}`;
      await this.notifications.sendPasswordReset(user.email, {
        firstName: user.firstName,
        resetUrl,
      });
      this.logger.log(`Password reset E-Mail gesendet an ${email}`);
    }
    return { message: 'Falls die E-Mail existiert, wurde ein Reset-Link gesendet' };
  }

  async resetPassword(token: string, newPassword: string) {
    const user = await this.userRepo.findOne({
      where: { resetPasswordToken: token },
    });

    if (!user || !(user as any).resetPasswordExpires || (user as any).resetPasswordExpires < new Date()) {
      throw new BadRequestException('Token ungültig oder abgelaufen');
    }

    const hashed = await bcrypt.hash(newPassword, 10);
    await this.userRepo.query(`UPDATE users SET password_hash = $1, reset_password_token = NULL, reset_password_expires = NULL WHERE id = $2`, [hashed, user.id]);

    return { message: 'Passwort erfolgreich geändert' };
  }

  async changePassword(userId: string, oldPassword: string, newPassword: string, twoFaCode?: string) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new BadRequestException('User nicht gefunden');

    // 1. Altes Passwort prüfen
    const valid = await bcrypt.compare(oldPassword, user.passwordHash);
    if (!valid) throw new BadRequestException('Aktuelles Passwort ist falsch');

    // 2. Falls 2FA aktiv → Code prüfen
    if (user.twoFaEnabled) {
      if (!twoFaCode) throw new BadRequestException('2FA-Code erforderlich');
      const codeValid = this.twoFaService.validateCode(user.twoFaSecret || '', twoFaCode);
      if (!codeValid) throw new UnauthorizedException('Ungültiger 2FA-Code');
    }

    // 3. Neues Passwort setzen
    if (!newPassword || newPassword.length < 8) {
      throw new BadRequestException('Neues Passwort muss mindestens 8 Zeichen haben');
    }
    const hashed = await bcrypt.hash(newPassword, 10);
    await this.userRepo.update(userId, { passwordHash: hashed });

    return { message: 'Passwort erfolgreich geändert' };
  }

  /**
   * DEPRECATED — direkte Rollenzuweisung entfernt.
   * Neuer Weg: POST /merchant-requests (mit Admin-Genehmigung).
   */
  async becomeMerchant(_userId: string, _dto: BecomeMerchantDto): Promise<never> {
    throw new ConflictException(
      'Bitte nutze den neuen Weg: Sende einen Merchant-Antrag unter Profil → Merchant Status. ' +
      'Ein Admin wird deinen Antrag prüfen und freischalten.',
    );
  }

  decodeToken(token: string): any {
    try {
      return this.jwtService.decode(token);
    } catch {
      return null;
    }
  }

  private async generateTokens(user: User) {
    const payload = { sub: user.id, email: user.email, role: user.role, twoFaEnabled: user.twoFaEnabled || false };
    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload),
      this.jwtService.signAsync(payload, {
        secret: this.config.get<string>('JWT_REFRESH_SECRET'),
        expiresIn: this.config.get<string>('JWT_REFRESH_EXPIRES_IN', '7d'),
      }),
    ]);
    return { accessToken, refreshToken };
  }
}
