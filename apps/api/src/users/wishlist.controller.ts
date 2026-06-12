import {
  Controller, Get, Post, Delete, Param,
  UseGuards, ParseUUIDPipe, Body,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { WishlistService } from './wishlist.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from './user.entity';

@ApiTags('Wishlist')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('wishlist')
export class WishlistController {
  constructor(private readonly wishlistService: WishlistService) {}

  @Get()
  @ApiOperation({ summary: 'Meine Wishlist' })
  getWishlist(@CurrentUser() user: User) {
    return this.wishlistService.getWishlist(user.id);
  }

  @Post(':productId/toggle')
  @ApiOperation({ summary: 'Produkt zur Wishlist hinzufügen / entfernen' })
  toggle(
    @CurrentUser() user: User,
    @Param('productId', ParseUUIDPipe) productId: string,
  ) {
    return this.wishlistService.toggle(user.id, productId);
  }

  @Get(':productId/status')
  @ApiOperation({ summary: 'Prüfen ob Produkt in Wishlist' })
  isSaved(
    @CurrentUser() user: User,
    @Param('productId', ParseUUIDPipe) productId: string,
  ) {
    return this.wishlistService.isSaved(user.id, productId).then(saved => ({ saved }));
  }

  @Post('batch-status')
  @ApiOperation({ summary: 'Batch-Check mehrerer Produkte' })
  batchStatus(
    @CurrentUser() user: User,
    @Body('productIds') productIds: string[],
  ) {
    return this.wishlistService.getSavedIds(user.id, productIds);
  }

  @Delete(':productId')
  @ApiOperation({ summary: 'Aus Wishlist entfernen' })
  remove(
    @CurrentUser() user: User,
    @Param('productId', ParseUUIDPipe) productId: string,
  ) {
    return this.wishlistService.remove(user.id, productId);
  }
}
