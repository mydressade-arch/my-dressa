import {
  Controller, Get, Put, Post, Body, UseGuards, BadRequestException,
  UseInterceptors, UploadedFile, Param,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { SettingsService } from './settings.service';
import { SETTING_KEYS } from './app-setting.entity';
import { StorageService } from '../products/storage.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/user.entity';

@ApiTags('settings')
@Controller('settings')
export class SettingsController {
  constructor(
    private readonly settingsService: SettingsService,
    private readonly storageService: StorageService,
  ) {}

  /** Öffentlich: erlaubte Mietdauern (App/Web brauchen das für Dropdowns). */
  @Get('rental-durations')
  @ApiOperation({ summary: 'Erlaubte Mietdauern in Tagen' })
  async getRentalDurations() {
    const durations = await this.settingsService.getRentalDurations();
    return { durations };
  }

  /** Admin: alle Settings ansehen. */
  @Get('admin/all')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: '[Admin] Alle Einstellungen' })
  async getAll() {
    return this.settingsService.getAll();
  }

  /** Admin: Mietdauern ändern, z.B. { durations: [7, 10, 14] } */
  @Put('admin/rental-durations')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: '[Admin] Mietdauern festlegen' })
  async setRentalDurations(@Body() body: { durations: number[] }) {
    const clean = (body.durations ?? [])
      .map((n) => Number(n))
      .filter((n) => Number.isFinite(n) && n > 0 && n <= 365);
    const value = (clean.length > 0 ? clean : [7, 10]).join(',');
    await this.settingsService.set(
      SETTING_KEYS.RENTAL_DURATIONS,
      value,
      'Erlaubte Mietdauern in Tagen (kommagetrennt)',
    );
    return { durations: value.split(',').map(Number) };
  }

  /** Öffentlich: verfügbare Farben (für Händler-Dropdown). */
  @Get('product-colors')
  @ApiOperation({ summary: 'Verfügbare Produktfarben' })
  async getProductColors() {
    const colors = await this.settingsService.getProductColors();
    return { colors };
  }

  /** Öffentlich: verfügbare Größen (für Händler-Dropdown). */
  @Get('product-sizes')
  @ApiOperation({ summary: 'Verfügbare Produktgrößen' })
  async getProductSizes() {
    const sizes = await this.settingsService.getProductSizes();
    return { sizes };
  }

  /** Admin: Farben festlegen, z.B. { colors: ["Schwarz","Rot"] } */
  @Put('admin/product-colors')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: '[Admin] Produktfarben festlegen' })
  async setProductColors(@Body() body: { colors: string[] }) {
    const clean = (body.colors ?? [])
      .map((c) => String(c).trim())
      .filter((c) => c.length > 0 && c.length <= 40);
    if (clean.length === 0) {
      throw new BadRequestException('Mindestens eine Farbe erforderlich');
    }
    await this.settingsService.set(
      SETTING_KEYS.PRODUCT_COLORS,
      clean.join(','),
      'Verfügbare Produktfarben',
    );
    return { colors: clean };
  }

  /** Admin: Größen festlegen, z.B. { sizes: ["S","M","L"] } */
  @Put('admin/product-sizes')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: '[Admin] Produktgrößen festlegen' })
  async setProductSizes(@Body() body: { sizes: string[] }) {
    const clean = (body.sizes ?? [])
      .map((s) => String(s).trim())
      .filter((s) => s.length > 0 && s.length <= 20);
    if (clean.length === 0) {
      throw new BadRequestException('Mindestens eine Größe erforderlich');
    }
    await this.settingsService.set(
      SETTING_KEYS.PRODUCT_SIZES,
      clean.join(','),
      'Verfügbare Produktgrößen',
    );
    return { sizes: clean };
  }
  // ── Startseiten-Bilder (Admin ändert sie selbst) ───────────────────────────

  /** Öffentlich: aktuelle Startseiten-Bilder (die Website lädt sie hiervon). */
  @Get('home-images')
  @ApiOperation({ summary: 'Startseiten-Bilder' })
  async getHomeImages() {
    const images = await this.settingsService.getHomeImages();
    return { images };
  }

  /** Gültige Bild-Bezeichner → passender Setting-Key. */
  private homeImageKey(name: string): string | null {
    const map: Record<string, string> = {
      hero:    SETTING_KEYS.HOME_HERO_IMG,
      dress:   SETTING_KEYS.HOME_DRESS_IMG,
      suit:    SETTING_KEYS.HOME_SUIT_IMG,
      access:  SETTING_KEYS.HOME_ACCESS_IMG,
      vintage: SETTING_KEYS.HOME_VINTAGE_IMG,
    };
    return map[name] ?? null;
  }

  /** Admin: Bild per URL setzen. Body: { url } */
  @Put('admin/home-images/:name')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: '[Admin] Startseiten-Bild per URL setzen' })
  async setHomeImage(@Param('name') name: string, @Body() body: { url: string }) {
    const key = this.homeImageKey(name);
    if (!key) throw new BadRequestException('Unbekanntes Bild');
    const url = (body.url ?? '').trim();
    if (!/^https?:\/\//i.test(url)) {
      throw new BadRequestException('Bitte eine gültige URL angeben (http/https)');
    }
    await this.settingsService.set(key, url, `Startseiten-Bild: ${name}`);
    return { name, url };
  }

  /** Admin: Bild hochladen (zu Cloudflare R2). Feld: "image" */
  @Post('admin/home-images/:name/upload')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @UseInterceptors(FileInterceptor('image'))
  @ApiOperation({ summary: '[Admin] Startseiten-Bild hochladen' })
  async uploadHomeImage(
    @Param('name') name: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    const key = this.homeImageKey(name);
    if (!key) throw new BadRequestException('Unbekanntes Bild');
    if (!file) throw new BadRequestException('Keine Datei erhalten');
    if (!file.mimetype?.startsWith('image/')) {
      throw new BadRequestException('Nur Bilddateien erlaubt');
    }
    const url = await this.storageService.uploadSiteImage(file, 'home');
    await this.settingsService.set(key, url, `Startseiten-Bild: ${name}`);
    return { name, url };
  }
}
