import {
  Controller, Get, Post, Patch, Param, Body,
  UseGuards, ParseUUIDPipe, Query,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiBody } from '@nestjs/swagger';
import { CommissionsService } from './commissions.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User, UserRole } from '../users/user.entity';

@ApiTags('Commissions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('commissions')
export class CommissionsController {
  constructor(private readonly commissionsService: CommissionsService) {}

  // ── Händler ───────────────────────────────────────────────────────────────

  @Get('merchant-stats')
  @Roles(UserRole.MERCHANT, UserRole.ADMIN)
  @ApiOperation({ summary: 'Händler Einnahmen & Statistiken' })
  merchantStats(@CurrentUser() user: User) {
    const merchantId = (user as any).merchantProfile?.id ?? user.id;
    return this.commissionsService.getMerchantStats(merchantId);
  }

  @Get('merchant-payouts')
  @Roles(UserRole.MERCHANT, UserRole.ADMIN)
  @ApiOperation({ summary: 'Händler Auszahlungshistorie' })
  merchantPayouts(@CurrentUser() user: User) {
    const merchantId = (user as any).merchantProfile?.id ?? user.id;
    return this.commissionsService.getMerchantPayouts(merchantId);
  }

  @Post('request-payout')
  @Roles(UserRole.MERCHANT, UserRole.ADMIN)
  @ApiOperation({ summary: 'Auszahlung anfragen (Händler)' })
  @ApiBody({ schema: { example: { note: 'Bitte schnell überweisen :)' } } })
  requestPayout(
    @CurrentUser() user: User,
    @Body('note') note?: string,
  ) {
    const merchantId = (user as any).merchantProfile?.id ?? user.id;
    return this.commissionsService.requestPayout(merchantId, note);
  }

  // ── Admin ─────────────────────────────────────────────────────────────────

  @Get('admin-pending-payouts')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: '[Admin] Offene Auszahlungsanfragen' })
  pendingPayouts() {
    return this.commissionsService.getAllPendingPayouts();
  }

  @Get('admin-all-payouts')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: '[Admin] Alle Auszahlungen' })
  allPayouts(@Query('status') status?: string) {
    return this.commissionsService.getAllPayouts(status as any);
  }

  @Patch('payouts/:id/approve')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: '[Admin] Auszahlung genehmigen' })
  @ApiBody({ schema: { example: { stripeTransferId: 'tr_xxx' } } })
  approvePayout(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() admin: User,
    @Body('stripeTransferId') stripeTransferId?: string,
  ) {
    return this.commissionsService.approvePayout(id, admin.id, stripeTransferId);
  }

  @Patch('payouts/:id/reject')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: '[Admin] Auszahlung ablehnen' })
  @ApiBody({ schema: { example: { reason: 'Stripe-Konto fehlt' } } })
  rejectPayout(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() admin: User,
    @Body('reason') reason?: string,
  ) {
    return this.commissionsService.rejectPayout(id, admin.id, reason);
  }

  @Get('admin-report')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Plattform-Einnahmen Report (Admin)' })
  adminReport() {
    return this.commissionsService.getAdminReport();
  }
}
