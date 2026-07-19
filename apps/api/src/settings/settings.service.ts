import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AppSetting, SETTING_KEYS } from './app-setting.entity';

@Injectable()
export class SettingsService {
  private readonly logger = new Logger(SettingsService.name);

  constructor(
    @InjectRepository(AppSetting)
    private readonly settingRepo: Repository<AppSetting>,
  ) {}

  /** Rohen Wert lesen. Gibt fallback zurück, wenn nicht gesetzt. */
  async get(key: string, fallback: string): Promise<string> {
    try {
      const s = await this.settingRepo.findOne({ where: { key } });
      return s?.value ?? fallback;
    } catch (e) {
      this.logger.error(`Setting ${key} konnte nicht gelesen werden: ${e}`);
      return fallback;
    }
  }

  /** Wert setzen (legt an oder aktualisiert). */
  async set(key: string, value: string, description?: string) {
    const existing = await this.settingRepo.findOne({ where: { key } });
    if (existing) {
      await this.settingRepo.update(existing.id, { value, description });
    } else {
      await this.settingRepo.save(
        this.settingRepo.create({ key, value, description: description ?? null }),
      );
    }
    this.logger.log(`Setting ${key} = ${value}`);
    return { key, value };
  }

  /** Alle Settings (für Admin-Panel). */
  async getAll(): Promise<AppSetting[]> {
    return this.settingRepo.find({ order: { key: 'ASC' } });
  }

  /**
   * Erlaubte Mietdauern in Tagen. Default: [7, 10]
   * Vom Admin änderbar über das Setting "rental_durations".
   */
  async getRentalDurations(): Promise<number[]> {
    const raw = await this.get(SETTING_KEYS.RENTAL_DURATIONS, '7,10');
    const parsed = raw
      .split(',')
      .map((s) => parseInt(s.trim(), 10))
      .filter((n) => Number.isFinite(n) && n > 0 && n <= 365);
    return parsed.length > 0 ? parsed : [7, 10];
  }

  /** Prüft, ob eine Mietdauer erlaubt ist. */
  async isValidRentalDuration(days: number): Promise<boolean> {
    const allowed = await this.getRentalDurations();
    return allowed.includes(days);
  }

  /** Hilfsfunktion: kommagetrennte Liste lesen. */
  private async getList(key: string, fallback: string[]): Promise<string[]> {
    const raw = await this.get(key, fallback.join(','));
    const parsed = raw
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
    return parsed.length > 0 ? parsed : fallback;
  }

  /** Verfügbare Farben (vom Admin gepflegt). */
  async getProductColors(): Promise<string[]> {
    return this.getList(SETTING_KEYS.PRODUCT_COLORS, [
      'Schwarz', 'Weiß', 'Beige', 'Creme', 'Grau', 'Navy', 'Blau',
      'Rot', 'Bordeaux', 'Rosa', 'Grün', 'Gold', 'Silber', 'Bunt',
    ]);
  }

  /** Verfügbare Größen (vom Admin gepflegt). */
  async getProductSizes(): Promise<string[]> {
    return this.getList(SETTING_KEYS.PRODUCT_SIZES, [
      'XS', 'S', 'M', 'L', 'XL', 'XXL',
      '34', '36', '38', '40', '42', '44', '46',
      'ONE SIZE',
    ]);
  }

  /**
   * Startseiten-Bilder. Der Admin kann jedes einzeln über das Panel ändern
   * (URL eintragen oder Bild hochladen). Fallback = die ursprünglichen Motive.
   */
  async getHomeImages(): Promise<Record<string, string>> {
    const defaults: Record<string, string> = {
      hero:    'https://images.unsplash.com/photo-1469334031218-e382a71b716b?w=1600&q=80',
      dress:   'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=900&q=80',
      suit:    'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=600&q=80',
      access:  'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=600&q=80',
      vintage: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=900&q=80',
    };
    const keys: Record<string, string> = {
      hero:    SETTING_KEYS.HOME_HERO_IMG,
      dress:   SETTING_KEYS.HOME_DRESS_IMG,
      suit:    SETTING_KEYS.HOME_SUIT_IMG,
      access:  SETTING_KEYS.HOME_ACCESS_IMG,
      vintage: SETTING_KEYS.HOME_VINTAGE_IMG,
    };
    const result: Record<string, string> = {};
    for (const name of Object.keys(defaults)) {
      result[name] = await this.get(keys[name], defaults[name]);
    }
    return result;
  }
}
