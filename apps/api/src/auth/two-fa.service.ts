import { Injectable, UnauthorizedException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../users/user.entity';

@Injectable()
export class TwoFaService {
  private readonly logger = new Logger(TwoFaService.name);
  private authenticator: any;
  private toDataURL: any;
  private packagesLoaded = false;

  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {
    this.loadPackages();
  }

  private loadPackages() {
    try {
      this.authenticator = require('otplib').authenticator;
      // Toleranz auf 2 Fenster erweitern (60 Sekunden Puffer)
      this.authenticator.options = { window: 2 };
      this.toDataURL = require('qrcode').toDataURL;
      this.packagesLoaded = true;
      this.logger.log('✅ otplib + qrcode geladen');
    } catch (e) {
      this.logger.error('❌ otplib/qrcode fehlt — npm install otplib qrcode ausführen!');
    }
  }

  private checkPackages() {
    if (!this.packagesLoaded) {
      throw new BadRequestException('2FA Pakete fehlen — npm install otplib qrcode ausführen');
    }
  }

  // ── QR Code generieren ────────────────────────────────────────────────────
  async generateSecret(userId: string): Promise<{ qrCode: string; secret: string }> {
    this.checkPackages();
    if (!userId) throw new UnauthorizedException('Nicht eingeloggt');

    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new UnauthorizedException('Benutzer nicht gefunden');

    const secret = this.authenticator.generateSecret(20);
    const otpAuthUrl = this.authenticator.keyuri(user.email, 'My Dressa', secret);
    const qrCode = await this.toDataURL(otpAuthUrl);

    await this.userRepo.update(userId, { twoFaSecret: secret, twoFaEnabled: false });
    this.logger.log(`2FA Secret generiert für User ${userId}`);

    return { qrCode, secret };
  }

  // ── 2FA aktivieren ────────────────────────────────────────────────────────
  async enable(userId: string, code: string): Promise<{ message: string }> {
    this.checkPackages();

    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new UnauthorizedException('Benutzer nicht gefunden');
    if (!user.twoFaSecret) throw new BadRequestException('Bitte zuerst QR Code generieren');

    const cleanCode = code?.replace(/\s/g, '');
    const isValid = this.authenticator.verify({ token: cleanCode, secret: user.twoFaSecret });

    if (!isValid) {
      this.logger.warn(`2FA Enable fehlgeschlagen für ${userId} — Code: ${cleanCode}`);
      throw new UnauthorizedException('Ungültiger Code — bitte prüfe die Uhrzeit deines Handys');
    }

    await this.userRepo.update(userId, { twoFaEnabled: true });
    this.logger.log(`2FA aktiviert für User ${userId}`);
    return { message: '2FA erfolgreich aktiviert' };
  }

  // ── 2FA deaktivieren ──────────────────────────────────────────────────────
  async disable(userId: string, code: string): Promise<{ message: string }> {
    this.checkPackages();

    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new UnauthorizedException('Benutzer nicht gefunden');
    if (!user.twoFaSecret || !user.twoFaEnabled) {
      throw new BadRequestException('2FA ist nicht aktiv');
    }

    const cleanCode = code?.replace(/\s/g, '');
    const isValid = this.authenticator.verify({ token: cleanCode, secret: user.twoFaSecret });

    if (!isValid) throw new UnauthorizedException('Ungültiger Code');

    await this.userRepo.update(userId, { twoFaEnabled: false, twoFaSecret: null });
    return { message: '2FA deaktiviert' };
  }

  // ── Login validieren ──────────────────────────────────────────────────────
  validateCode(secret: string, code: string): boolean {
    if (!this.packagesLoaded) return false;
    const cleanCode = code?.replace(/\s/g, '');
    return this.authenticator.verify({ token: cleanCode, secret });
  }
}
