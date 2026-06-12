import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Wishlist } from './wishlist.entity';
import { Product } from '../products/product.entity';

@Injectable()
export class WishlistService {
  constructor(
    @InjectRepository(Wishlist)
    private readonly wishlistRepo: Repository<Wishlist>,
    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,
  ) {}

  // Alle Wishlist-Produkte des Users
  async getWishlist(userId: string) {
    const items = await this.wishlistRepo.find({
      where: { userId },
      relations: ['product', 'product.images', 'product.variants', 'product.merchant'],
      order: { createdAt: 'DESC' },
    });
    return items.map(item => ({
      wishlistId: item.id,
      ...this.formatProduct(item.product),
    }));
  }

  // Toggle: add wenn nicht drin, remove wenn schon drin
  async toggle(userId: string, productId: string) {
    const existing = await this.wishlistRepo.findOne({
      where: { userId, productId },
    });

    if (existing) {
      await this.wishlistRepo.delete(existing.id);
      return { saved: false, message: 'Aus Wishlist entfernt' };
    }

    const product = await this.productRepo.findOne({ where: { id: productId } });
    if (!product) throw new NotFoundException('Produkt nicht gefunden');

    await this.wishlistRepo.save(
      this.wishlistRepo.create({ userId, productId })
    );
    return { saved: true, message: 'Zur Wishlist hinzugefügt' };
  }

  // Prüfen ob ein Produkt in der Wishlist ist
  async isSaved(userId: string, productId: string): Promise<boolean> {
    const item = await this.wishlistRepo.findOne({ where: { userId, productId } });
    return !!item;
  }

  // Batch-Check für mehrere Produkte (für Produktlisten)
  async getSavedIds(userId: string, productIds: string[]): Promise<string[]> {
    if (!productIds.length) return [];
    const items = await this.wishlistRepo.find({
      where: { userId, productId: In(productIds) },
      select: ['productId'],
    });
    return items.map(i => i.productId);
  }

  // Aus Wishlist entfernen
  async remove(userId: string, productId: string) {
    await this.wishlistRepo.delete({ userId, productId });
    return { saved: false, message: 'Entfernt' };
  }

  private formatProduct(p: Product) {
    return {
      id: p.id,
      title: p.title,
      merchantName: (p as any).merchant?.shopName || 'My Dressa',
      rentalPrice: p.rentalPrice,
      salePrice: p.salePrice,
      isForRent: p.isForRent,
      isForSale: p.isForSale,
      imageUrl: (p as any).images?.[0]?.url || null,
      shippingCost: (p as any).shippingCost || 0,
    };
  }
}
