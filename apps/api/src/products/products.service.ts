import {
  Injectable, NotFoundException, ForbiddenException, BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product, ProductStatus } from './product.entity';
import { MerchantProfile } from '../users/merchant-profile.entity';
import { ProductVariant } from './product-variant.entity';
import { ProductImage } from './product-image.entity';
import { CreateProductDto } from './dto/create-product.dto';
import { QueryProductsDto, ProductSort } from './dto/query-products.dto';
import { StorageService } from './storage.service';

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,
    @InjectRepository(ProductVariant)
    private readonly variantRepo: Repository<ProductVariant>,
    @InjectRepository(MerchantProfile)
    private readonly merchantProfileRepo: Repository<MerchantProfile>,
    @InjectRepository(ProductImage)
    private readonly imageRepo: Repository<ProductImage>,
    private readonly storageService: StorageService,
  ) {}

  async create(userOrMerchantId: string, dto: CreateProductDto): Promise<Product> {
    // merchantId kann User.id oder MerchantProfile.id sein — beide auflösen
    let merchantId = userOrMerchantId;
    const byProfile = await this.merchantProfileRepo.findOne({ where: { id: userOrMerchantId } });
    if (!byProfile) {
      // Vielleicht ist es eine User.id — MerchantProfile suchen
      const byUser = await this.merchantProfileRepo.findOne({ where: { userId: userOrMerchantId } });
      if (byUser) {
        merchantId = byUser.id;
      } else {
        throw new Error('Kein MerchantProfile gefunden. Bitte erst Merchant-Antrag stellen.');
      }
    }
    if (!dto.isForSale && !dto.isForRent)
      throw new BadRequestException('Produkt muss zum Kauf oder zur Miete angeboten werden');
    if (dto.isForSale && !dto.salePrice) throw new BadRequestException('Verkaufspreis erforderlich');
    if (dto.isForRent && !dto.rentalPrice) throw new BadRequestException('Mietpreis erforderlich');

    const product = this.productRepo.create({
      merchantId, title: dto.title, description: dto.description,
      salePrice: dto.salePrice, rentalPrice: dto.rentalPrice,
      category: dto.category, isForSale: dto.isForSale ?? false,
      isForRent: dto.isForRent ?? false, status: ProductStatus.ACTIVE,
      shippingCost:   dto.shippingCost ?? 0,
      depositAmount:  dto.depositAmount ?? null,
    });
    await this.productRepo.save(product);
    const variantList = dto.variants?.length ? dto.variants : [{ size: 'ONE SIZE', color: '', stockQuantity: 1 }];
    for (const v of variantList) {
      const variant = this.variantRepo.create({ ...v, productId: product.id });
      await this.variantRepo.save(variant);
    }
    return this.findOne(product.id);
  }

  async findAll(query: QueryProductsDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    // Einheitlicher QueryBuilder-Pfad — vermeidet Split-Logik-Bugs
    const qb = this.productRepo.createQueryBuilder('p')
      .leftJoinAndSelect('p.variants', 'v')
      .leftJoinAndSelect('p.images', 'img')
      .leftJoinAndSelect('p.merchant', 'm')
      .where('p.status = :status', { status: ProductStatus.ACTIVE });

    if (query.search?.trim()) {
      qb.andWhere('(LOWER(p.title) LIKE LOWER(:s) OR LOWER(p.description) LIKE LOWER(:s))',
        { s: `%${query.search.trim()}%` });
    }
    if (query.category) qb.andWhere('p.category = :category', { category: query.category });
    // Type Filter:
    // forRent=true, forSale=false → nur Mietprodukte
    // forRent=false, forSale=true → nur Verkaufsprodukte (mit stock > 0)
    // forRent=true, forSale=true  → beide (kein Filter nötig)
    // beide false                 → alle anzeigen
    // Robust: akzeptiere true, 'true' (string) als true
    const wantRent = (query.forRent as any) === true || (query.forRent as any) === 'true';
    const wantSale = (query.forSale as any) === true || (query.forSale as any) === 'true';

    if (wantRent && !wantSale) {
      qb.andWhere('p.isForRent = true');
    } else if (wantSale && !wantRent) {
      qb.andWhere('p.isForSale = true');
      // Produkte mit stock=0 in allen Varianten ausblenden
      qb.andWhere(qb2 => {
        const sub = qb2.subQuery()
          .select('1')
          .from('product_variants', 'pv2')
          .where('pv2.product_id = p.id')
          .andWhere('pv2.stock_quantity > 0')
          .getQuery();
        return 'EXISTS ' + sub;
      });
    } else if (wantRent && wantSale) {
      // Beide aktiv → Produkte die entweder rent ODER sale haben
      qb.andWhere('(p.isForRent = true OR p.isForSale = true)');
    }
    if (query.size) {
      // EXISTS statt Join-Filter — sonst werden Multi-Size-Produkte auf 1 Variante reduziert
      qb.andWhere(qb2 => {
        const sub = qb2.subQuery()
          .select('1')
          .from('product_variants', 'pv_size')
          .where('pv_size.product_id = p.id')
          .andWhere('pv_size.size = :size', { size: query.size })
          .getQuery();
        return 'EXISTS ' + sub;
      });
    }
    if (query.minPrice !== undefined)
      qb.andWhere('(p.salePrice >= :min OR p.rentalPrice >= :min)', { min: query.minPrice });
    if (query.maxPrice !== undefined)
      qb.andWhere('(p.salePrice <= :max OR p.rentalPrice <= :max)', { max: query.maxPrice });

    qb.orderBy('p.createdAt', 'DESC').skip((page - 1) * limit).take(limit);

    const [items, total] = await qb.getManyAndCount();
    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOne(id: string): Promise<Product> {
    const product = await this.productRepo.findOne({
      where: { id }, relations: ['variants', 'images', 'merchant'],
    });
    if (!product) throw new NotFoundException('Produkt nicht gefunden');
    return product;
  }

  async findByVariantId(variantId: string): Promise<Product> {
    const variant = await this.variantRepo.findOne({
      where: { id: variantId },
      relations: ['product', 'product.images', 'product.variants', 'product.merchant'],
    });
    if (!variant) throw new NotFoundException('Variante nicht gefunden');
    return variant.product;
  }

  // ── Hilfsmethode: MerchantProfile ID aus User ID holen ─────────────────────
  private async getMerchantId(userId: string): Promise<string> {
    const merchant = await this.merchantProfileRepo.findOne({
      where: [{ id: userId }, { userId: userId }],
    });
    return merchant?.id ?? userId;
  }

  private async assertOwner(productId: string, userId: string): Promise<Product> {
    const product = await this.findOne(productId);
    const merchantId = await this.getMerchantId(userId);
    if (product.merchantId !== merchantId) {
      throw new ForbiddenException('Kein Zugriff auf dieses Produkt');
    }
    return product;
  }

  async update(id: string, userId: string, data: any): Promise<Product> {
    await this.assertOwner(id, userId);

    // Variants und Images aus data herausnehmen — diese separat behandeln
    const { variants, images, merchant, ...productData } = data;

    // Nur skalare Felder updaten
    await this.productRepo.update(id, productData);

    // Variants updaten falls mitgeschickt
    if (variants?.length) {
      // Alte Variants löschen und neue erstellen
      await this.variantRepo.delete({ productId: id });
      for (const v of variants) {
        const variant = this.variantRepo.create({ ...v, productId: id });
        await this.variantRepo.save(variant);
      }
    }

    return this.findOne(id);
  }

  async publish(id: string, userId: string): Promise<Product> {
    await this.assertOwner(id, userId);
    await this.productRepo.update(id, { status: ProductStatus.ACTIVE });
    return this.findOne(id);
  }

  async uploadImages(productId: string, userId: string, files: Express.Multer.File[]): Promise<ProductImage[]> {
    const merchantId = await this.getMerchantId(userId);
    const product = await this.findOne(productId);
    if (product.merchantId !== merchantId) throw new ForbiddenException('Kein Zugriff');
    const images: ProductImage[] = [];
    for (let i = 0; i < files.length; i++) {
      const url = await this.storageService.uploadProductImage(files[i], merchantId);
      const image = this.imageRepo.create({ productId, url, sortOrder: (product.images?.length||0)+i });
      images.push(await this.imageRepo.save(image));
    }
    return images;
  }

  async remove(id: string, userId: string): Promise<{ deleted: boolean; message: string }> {
    const merchantId = await this.getMerchantId(userId);
    const product = await this.findOne(id);
    if (product.merchantId !== merchantId) throw new ForbiddenException('Kein Zugriff auf dieses Produkt');

    // Prüfe ob Bestellungen existieren
    const orderCount = await this.productRepo.query(
      `SELECT COUNT(*) as count FROM orders o
       JOIN product_variants pv ON pv.id = o.product_variant_id
       WHERE pv.product_id = $1`,
      [id]
    );
    const hasOrders = Number(orderCount[0]?.count) > 0;

    if (hasOrders) {
      // Hat Bestellungen → nur deaktivieren
      await this.productRepo.update(id, { status: ProductStatus.INACTIVE });
      return { deleted: false, message: 'Produkt hat Bestellungen und wurde deaktiviert (nicht gelöscht)' };
    }

    // Keine Bestellungen → komplett löschen
    try {
      for (const img of product.images||[]) await this.storageService.deleteFile(img.url).catch(() => {});
      await this.productRepo.remove(product);
      return { deleted: true, message: 'Produkt gelöscht' };
    } catch (e: any) {
      // Falls doch FK-Constraint → deaktivieren
      await this.productRepo.update(id, { status: ProductStatus.INACTIVE });
      return { deleted: false, message: 'Produkt hat verknüpfte Daten und wurde deaktiviert' };
    }
  }

  async findByMerchant(userOrMerchantId: string) {
    // Beide IDs auflösen
    let merchantId = userOrMerchantId;
    const byUser = await this.merchantProfileRepo.findOne({ where: { userId: userOrMerchantId } });
    if (byUser) merchantId = byUser.id;

    return this.productRepo.find({
      where: { merchantId }, relations: ['variants', 'images'],
      order: { createdAt: 'DESC' },
    });
  }
}
