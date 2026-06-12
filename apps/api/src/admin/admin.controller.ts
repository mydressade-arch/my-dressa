import {
  Controller, Get, Post, Patch, Delete, Param, Body, Query,
  UseGuards, ParseUUIDPipe, DefaultValuePipe, ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiBody } from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole, User } from '../users/user.entity';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('Admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('storage-status')
  @ApiOperation({ summary: 'R2 Storage Status prüfen' })
  storageStatus() {
    return this.adminService.getStorageStatus();
  }

  @Get('dashboard')
  @ApiOperation({ summary: 'Dashboard Statistiken' })
  dashboard() {
    return this.adminService.getDashboardStats();
  }

  @Get('users')
  @ApiOperation({ summary: 'Alle User' })
  getUsers(
    @Query('page',  new DefaultValuePipe(1),  ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    return this.adminService.getAllUsers(page, limit);
  }

  @Post('users/:id/toggle-active')
  @ApiOperation({ summary: 'User sperren / entsperren' })
  toggleUser(@Param('id', ParseUUIDPipe) id: string) {
    return this.adminService.toggleUserActive(id);
  }

  @Patch('users/:id/role')
  @ApiOperation({ summary: 'User-Rolle ändern' })
  @ApiBody({ schema: { example: { role: 'customer' } } })
  changeRole(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() admin: User,
    @Body('role') role: UserRole,
  ) {
    return this.adminService.changeUserRole(id, role, admin.id);
  }

  @Post('merchants/:id/verify')
  @ApiOperation({ summary: 'Händler verifizieren' })
  verifyMerchant(@Param('id', ParseUUIDPipe) id: string) {
    return this.adminService.verifyMerchant(id);
  }

  @Get('products')
  @ApiOperation({ summary: 'Alle Produkte' })
  getProducts(
    @Query('page',  new DefaultValuePipe(1),  ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    return this.adminService.getAllProducts(page, limit);
  }

  @Post('products/:id/suspend')
  @ApiOperation({ summary: 'Produkt sperren' })
  suspendProduct(@Param('id', ParseUUIDPipe) id: string) {
    return this.adminService.suspendProduct(id);
  }

  @Get('merchants/stripe-status')
  @ApiOperation({ summary: '[Admin] Stripe Status aller Händler' })
  merchantsStripeStatus() {
    return this.adminService.getMerchantsStripeStatus();
  }

  @Get('notifications')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: '[Admin] Benachrichtigungen Badge' })
  getNotifications() {
    return this.adminService.getNotifications();
  }

  @Get('charts/sales')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: '[Admin] Verkäufe vs Mieten Chart' })
  getSalesChart() {
    return this.adminService.getSalesChart();
  }

  @Get('merchants/:id/details')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: '[Admin] Händler Details + Produkte' })
  getMerchantDetails(@Param('id', ParseUUIDPipe) id: string) {
    return this.adminService.getMerchantDetails(id);
  }

  @Get('merchants')
  @ApiOperation({ summary: '[Admin] Alle Händler mit Shops' })
  getAllMerchants() {
    return this.adminService.getAllMerchants();
  }

  @Get('orders')
  @ApiOperation({ summary: 'Alle Bestellungen' })
  getAllOrders(
    @Query('page',  new DefaultValuePipe(1),  ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    return this.adminService.getAllOrders(page, limit);
  }

  @Patch('orders/:id/status')
  @ApiOperation({ summary: 'Bestellstatus ändern' })
  @ApiBody({ schema: { example: { status: 'shipped' } } })
  updateOrderStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('status') status: string,
  ) {
    return this.adminService.updateOrderStatus(id, status);
  }

  @Patch('orders/:id/tracking')
  @ApiOperation({ summary: 'DHL Sendungsnummer setzen → Status: shipped' })
  @ApiBody({ schema: { example: { trackingNumber: '123456789', trackingUrl: 'https://...' } } })
  setTracking(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('trackingNumber') trackingNumber: string,
    @Body('trackingUrl') trackingUrl?: string,
  ) {
    return this.adminService.setTrackingNumber(id, trackingNumber, trackingUrl);
  }
}
