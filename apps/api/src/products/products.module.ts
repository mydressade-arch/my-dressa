import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MulterModule } from '@nestjs/platform-express';
import { Product } from './product.entity';
import { Category } from './category.entity';
import { MerchantProfile } from '../users/merchant-profile.entity';
import { CategoriesService } from './categories.service';
import { CategoriesController } from './categories.controller';
import { ProductVariant } from './product-variant.entity';
import { ProductImage } from './product-image.entity';
import { ProductsService } from './products.service';
import { ProductsController } from './products.controller';
import { StorageService } from './storage.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Product, ProductVariant, ProductImage, MerchantProfile, Category]),
    MulterModule.register({ limits: { fileSize: 5 * 1024 * 1024 } }), // 5MB max
  ],
  controllers: [ProductsController, CategoriesController],
  providers: [ProductsService, CategoriesService, StorageService],
  exports: [ProductsService, CategoriesService],
})
export class ProductsModule {}
