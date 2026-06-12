import {
  Controller, Get, Post, Patch, Param, Body,
  UseGuards, ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { OrdersService } from './orders.service';
import { OrderStatus } from './order.entity';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User, UserRole } from '../users/user.entity';

@ApiTags('Orders')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  @ApiOperation({ summary: 'Kauf-Bestellung erstellen' })
  create(@CurrentUser() user: User, @Body() body: any) {
    return this.ordersService.createPurchaseOrder(user.id, body);
  }

  @Get('my-orders')
  @ApiOperation({ summary: 'Eigene Bestellungen' })
  myOrders(@CurrentUser() user: User) {
    return this.ordersService.findByUser(user.id);
  }

  @Get('merchant-orders')
  @UseGuards(RolesGuard)
  @Roles(UserRole.MERCHANT, UserRole.ADMIN)
  @ApiOperation({ summary: 'Händler Bestellungen' })
  merchantOrders(@CurrentUser() user: User) {
    const mid = (user as any).merchantProfile?.id ?? user.id;
    return this.ordersService.findByMerchant(mid);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: User) {
    return this.ordersService.findOne(id, user.id);
  }

  @Post(':id/cancel')
  cancel(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: User) {
    return this.ordersService.cancel(id, user.id);
  }

  @Patch(':id/status')
  @UseGuards(RolesGuard)
  @Roles(UserRole.MERCHANT, UserRole.ADMIN)
  updateStatus(@Param('id', ParseUUIDPipe) id: string, @Body('status') status: OrderStatus) {
    return this.ordersService.updateStatus(id, status);
  }

  // ── Händler: Versand mit DHL Nummer ────────────────────────────────────────
  @Patch(':id/ship')
  @UseGuards(RolesGuard)
  @Roles(UserRole.MERCHANT, UserRole.ADMIN)
  @ApiOperation({ summary: 'Händler: Versand bestätigen + DHL Nummer' })
  ship(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
    @Body('trackingNumber') trackingNumber: string,
    @Body('trackingUrl') trackingUrl?: string,
  ) {
    return this.ordersService.shipOrder(id, user.id, trackingNumber, trackingUrl);
  }

  // ── Kunde: Rückgabe beantragen ─────────────────────────────────────────────
  @Post(':id/request-return')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Kunde: Kaufrückgabe beantragen' })
  requestReturn(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
    @Body('reason') reason: string,
  ) {
    return this.ordersService.requestReturn(id, user.id, reason || 'Keine Angabe');
  }

  // ── Händler: Rückgabe bestätigen + Refund ────────────────────────────────
  @Patch(':id/approve-return')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.MERCHANT, UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Händler/Admin: Rückgabe bestätigen → Stripe Refund' })
  approveReturn(@Param('id', ParseUUIDPipe) id: string) {
    return this.ordersService.approveReturn(id);
  }

  // ── Admin/Händler: delivered setzen ─────────────────────────────────────────
  @Patch(':id/confirm-delivery')
  @UseGuards(RolesGuard)
  @Roles(UserRole.MERCHANT, UserRole.ADMIN)
  @ApiOperation({ summary: 'Admin/Händler: Order als delivered markieren' })
  confirmDelivery(
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.ordersService.confirmDelivery(id);
  }
}
