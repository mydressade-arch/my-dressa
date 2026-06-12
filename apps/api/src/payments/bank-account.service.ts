import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { MerchantProfile } from '../users/merchant-profile.entity';

@Injectable()
export class BankAccountService {
  private readonly logger = new Logger(BankAccountService.name);
  private readonly encKey: Buffer;

  constructor(
    @InjectRepository(MerchantProfile)
    private readonly merchantRepo: Repository<MerchantProfile>,
    private readonly config: ConfigService,
  ) {
    // 32-Byte Key aus JWT_SECRET ableiten
    const secret = config.get<string>('JWT_SECRET', 'fallback-secret-key-min-32-chars!!');
    this.encKey = crypto.scryptSync(secret, 'bank-account-salt', 32);
  }

  // ── AES-256-GCM Verschlüsselung ───────────────────────────────────────────
  private encrypt(text: string): string {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-gcm', this.encKey, iv);
    const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
    const authTag = cipher.getAuthTag();
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`;
  }

  private decrypt(encrypted: string): string {
    const [ivHex, authTagHex, encHex] = encrypted.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const enc = Buffer.from(encHex, 'hex');
    const decipher = crypto.createDecipheriv('aes-256-gcm', this.encKey, iv);
    decipher.setAuthTag(authTag);
    return decipher.update(enc) + decipher.final('utf8');
  }

  // ── IBAN Maske (DE89 **** **** **** **** 00) ──────────────────────────────
  private maskIban(iban: string): string {
    const clean = iban.replace(/\s/g, '').toUpperCase();
    if (clean.length < 8) return '****';
    return `${clean.slice(0,4)} **** **** **** ${clean.slice(-4)}`;
  }

  // ── IBAN validieren (Basis-Check) ─────────────────────────────────────────
  private validateIban(iban: string): boolean {
    const clean = iban.replace(/\s/g, '').toUpperCase();
    return /^[A-Z]{2}[0-9]{2}[A-Z0-9]{4,}$/.test(clean) && clean.length >= 15;
  }

  // ── Bankdaten speichern ───────────────────────────────────────────────────
  async saveBankAccount(merchantId: string, dto: {
    accountName: string;
    iban: string;
    bic?: string;
    bankName?: string;
  }): Promise<{ message: string; ibanMasked: string }> {
    const merchant = await this.merchantRepo.findOne({ where: { userId: merchantId } })
      || await this.merchantRepo.findOne({ where: { id: merchantId } });

    if (!merchant) throw new NotFoundException('Händlerprofil nicht gefunden');

    const cleanIban = dto.iban.replace(/\s/g, '').toUpperCase();
    if (!this.validateIban(cleanIban)) {
      throw new BadRequestException('Ungültige IBAN');
    }

    await this.merchantRepo.update(merchant.id, {
      bankAccountName:  dto.accountName.trim(),
      bankIbanEncrypted: this.encrypt(cleanIban),
      bankBic:          dto.bic?.toUpperCase().trim() || null,
      bankName:         dto.bankName?.trim() || null,
    });

    this.logger.log(`Bankdaten gespeichert für Händler ${merchant.id}`);
    return { message: 'Bankdaten gespeichert', ibanMasked: this.maskIban(cleanIban) };
  }

  // ── Bankdaten abrufen (maskiert für Händler) ──────────────────────────────
  async getBankAccount(merchantId: string): Promise<{
    hasBank: boolean;
    accountName?: string;
    ibanMasked?: string;
    bic?: string;
    bankName?: string;
  }> {
    const merchant = await this.merchantRepo.findOne({ where: { userId: merchantId } })
      || await this.merchantRepo.findOne({ where: { id: merchantId } });

    if (!merchant?.bankIbanEncrypted) return { hasBank: false };

    return {
      hasBank: true,
      accountName: merchant.bankAccountName || undefined,
      ibanMasked: this.maskIban(this.decrypt(merchant.bankIbanEncrypted)),
      bic: merchant.bankBic || undefined,
      bankName: merchant.bankName || undefined,
    };
  }

  // ── Bankdaten für Admin (vollständig entschlüsselt) ───────────────────────
  async getBankAccountForAdmin(merchantId: string): Promise<{
    hasBank: boolean;
    accountName?: string;
    iban?: string;
    ibanMasked?: string;
    bic?: string;
    bankName?: string;
  }> {
    const merchant = await this.merchantRepo.findOne({ where: { id: merchantId } });
    if (!merchant?.bankIbanEncrypted) return { hasBank: false };

    const iban = this.decrypt(merchant.bankIbanEncrypted);
    return {
      hasBank: true,
      accountName: merchant.bankAccountName || undefined,
      iban,
      ibanMasked: this.maskIban(iban),
      bic: merchant.bankBic || undefined,
      bankName: merchant.bankName || undefined,
    };
  }
}
