import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';
import { MerchantProfile } from './merchant-profile.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(MerchantProfile)
    private readonly merchantRepo: Repository<MerchantProfile>,
  ) {}

  async findById(id: string): Promise<User> {
    const user = await this.userRepo.findOne({ where: { id } });
    if (!user) throw new NotFoundException('User nicht gefunden');
    return user;
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.userRepo.findOne({ where: { email } });
  }

  async getMerchantProfile(userId: string): Promise<MerchantProfile> {
    const profile = await this.merchantRepo.findOne({
      where: { userId },
      relations: ['products'],
    });
    if (!profile) throw new NotFoundException('Händlerprofil nicht gefunden');
    return profile;
  }

  async updateProfile(userId: string, data: Partial<User>) {
    await this.userRepo.update(userId, data);
    return this.findById(userId);
  }

  // ─────────────────────────────────────────────────────────────
  //  Admin/Support: Verifizierung manuell handhaben
  //  (Nützlich, wenn E-Mails nicht ankommen.)
  // ─────────────────────────────────────────────────────────────

  /** Nutzer per E-Mail suchen — mit Verifizierungsstatus + Token/Link. */
  async findForSupport(email: string) {
    const user = await this.userRepo.findOne({
      where: { email: email.trim().toLowerCase() },
    });
    if (!user) throw new NotFoundException('Kein Nutzer mit dieser E-Mail gefunden');
    return {
      id: user.id,
      email: user.email,
      firstName: (user as any).firstName,
      isVerified: (user as any).isVerified,
      verificationToken: (user as any).emailVerificationToken || null,
    };
  }

  /** Neuen Verifizierungs-Token erzeugen und den Link zurückgeben. */
  async regenerateVerificationToken(email: string) {
    const user = await this.userRepo.findOne({
      where: { email: email.trim().toLowerCase() },
    });
    if (!user) throw new NotFoundException('Kein Nutzer mit dieser E-Mail gefunden');
    if ((user as any).isVerified) {
      return { alreadyVerified: true, message: 'Nutzer ist bereits verifiziert' };
    }
    const { randomBytes } = await import('crypto');
    const token = randomBytes(32).toString('hex');
    await this.userRepo.update(user.id, { emailVerificationToken: token } as any);
    return {
      alreadyVerified: false,
      email: user.email,
      verificationToken: token,
      // Fertiger Link, den Support dem Kunden geben kann:
      verificationPath: `/auth/verify-email?token=${token}`,
    };
  }

  /** Nutzer direkt manuell verifizieren (wenn E-Mail gar nicht geht). */
  async manuallyVerify(email: string) {
    const user = await this.userRepo.findOne({
      where: { email: email.trim().toLowerCase() },
    });
    if (!user) throw new NotFoundException('Kein Nutzer mit dieser E-Mail gefunden');
    await this.userRepo.update(user.id, {
      isVerified: true,
      emailVerificationToken: null,
    } as any);
    return { success: true, message: `${user.email} wurde manuell verifiziert` };
  }
}
