import {
  Controller, Get, Post, Patch, Body, Param, Query, BadRequestException,
  UseGuards, Ip, ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { RentalsService } from './rentals.service';
import { CreateRentalDto } from './dto/create-rental.dto';
import { ReturnRentalDto } from './dto/return-rental.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User, UserRole } from '../users/user.entity';

@ApiTags('Rentals')
@Controller('rentals')
export class RentalsController {
  constructor(private readonly rentalsService: RentalsService) {}

  // ─── PUBLIC ──────────────────────────────────────────────────

  @Get('availability')
  @ApiOperation({ summary: 'Verfügbarkeit prüfen (öffentlich)' })
  checkAvailability(
    @Query('productVariantId') productVariantId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.rentalsService.checkAvailability(productVariantId, startDate, endDate);
  }

  // ─── CUSTOMER ROUTES ─────────────────────────────────────────

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Miete erstellen (Kunde)' })
  create(
    @CurrentUser() user: User,
    @Body() dto: CreateRentalDto,
    @Ip() ip: string,
  ) {
    return this.rentalsService.create(user.id, dto, ip);
  }

  @Get('my-rentals')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Eigene Mieten (Kunde)' })
  myRentals(@CurrentUser() user: User) {
    return this.rentalsService.findByUser(user.id);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Miete Details' })
  findOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: User) {
    return this.rentalsService.findOne(id, user.id);
  }

  // ─── MERCHANT ROUTES ─────────────────────────────────────────

  @Patch(':id/set-return-tracking')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Kunde: Rücksende-Tracking eingeben' })
  async setReturnTracking(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
    @Body('trackingNumber') trackingNumber: string,
  ) {
    if (!trackingNumber?.trim()) throw new BadRequestException('Tracking-Nummer fehlt');
    await this.rentalsService.setReturnTracking(id, user.id, trackingNumber.trim());
    return { message: `Rücksende-Tracking gesetzt: ${trackingNumber}` };
  }

  @Patch(':id/return')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.MERCHANT, UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Rückgabe bestätigen (Händler)' })
  processReturn(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
    @Body() dto: ReturnRentalDto,
  ) {
    return this.rentalsService.processReturn(id, user.id, dto);
  }

  // ── Feature 6: Beidseitige Rückgabe-Bestätigung ────────────────────────────

  @Post(':id/confirm-return-customer')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Kunde bestätigt Rücksendung' })
  confirmReturnCustomer(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ) {
    return this.rentalsService.customerConfirmReturn(id, user.id);
  }

  @Post(':id/confirm-return-merchant')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.MERCHANT, UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Händler bestätigt Erhalt (good|damaged|lost)' })
  confirmReturnMerchant(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
    @Body() body: { condition: 'good' | 'damaged' | 'lost' | 'late'; notes?: string },
  ) {
    return this.rentalsService.merchantConfirmReturn(
      id, user.id, body.condition, body.notes,
    );
  }

  // ── Feature 5: Mietverlängerung ────────────────────────────────────────────

  @Get(':id/extension-options')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Verfügbare Verlängerungsoptionen + Gebühren' })
  getExtensionOptions(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ) {
    return this.rentalsService.getExtensionOptions(id, user.id);
  }

  @Post(':id/extend')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Verlängerung anfragen (danach über /payments bezahlen)' })
  requestExtension(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
    @Body() body: { extraDays: number },
  ) {
    return this.rentalsService.requestExtension(id, user.id, Number(body.extraDays));
  }

  // ── TEST-Endpoint: Overdue-Check manuell auslösen (nur Admin) ──────────────
  // Löst sofort die Strafe-Prüfung aus, ohne auf den täglichen 8-Uhr-Cron
  // zu warten. Praktisch zum Testen. Kann später entfernt werden.
  @Post('admin/run-overdue-check')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: '[Admin/Test] Overdue-Check sofort ausführen' })
  async runOverdueCheck() {
    const count = await this.rentalsService.markOverdueRentals();
    return { message: `Overdue-Check ausgeführt`, processed: count };
  }
}
