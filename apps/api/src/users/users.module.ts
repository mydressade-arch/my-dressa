import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './user.entity';
import { MerchantProfile } from './merchant-profile.entity';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { WishlistService } from './wishlist.service';
import { WishlistController } from './wishlist.controller';
import { Wishlist } from './wishlist.entity';
import { Product } from '../products/product.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User, MerchantProfile, Wishlist, Product])],
  controllers: [UsersController, WishlistController],
  providers: [UsersService, WishlistService],
  exports: [UsersService],
})
export class UsersModule {}
