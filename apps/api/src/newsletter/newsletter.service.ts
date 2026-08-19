import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NewsletterSubscriber } from './newsletter.entity';

@Injectable()
export class NewsletterService {
  private readonly logger = new Logger(NewsletterService.name);

  constructor(
    @InjectRepository(NewsletterSubscriber)
    private readonly repo: Repository<NewsletterSubscriber>,
  ) {}

  /**
   * Trägt eine E-Mail in die Newsletter-Liste ein.
   * Doppelte Anmeldungen werden still ignoriert (kein Fehler für den Nutzer).
   */
  async subscribe(email: string, source = 'homepage') {
    const normalized = email.trim().toLowerCase();

    // Schon vorhanden? Dann einfach Erfolg zurückgeben (idempotent).
    const existing = await this.repo.findOne({ where: { email: normalized } });
    if (existing) {
      return { success: true, alreadySubscribed: true };
    }

    const sub = this.repo.create({ email: normalized, source });
    await this.repo.save(sub);
    this.logger.log(`Newsletter-Anmeldung: ${normalized}`);
    return { success: true, alreadySubscribed: false };
  }

  /** Alle Anmeldungen (für Admin-Export). */
  async findAll() {
    return this.repo.find({ order: { createdAt: 'DESC' } });
  }

  async count() {
    return this.repo.count();
  }
}
