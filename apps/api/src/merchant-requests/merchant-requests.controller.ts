import {
  Controller, Post, Get, Patch, Param, Body,
  UseGuards, ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiBody } from '@nestjs/swagger';
import { MerchantRequestsService } from './merchant-requests.service';
import { MerchantRequestStatus } from './merchant-request.entity';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User, UserRole } from '../users/user.entity';

@ApiTags('Merchant Requests')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('merchant-requests')
export class MerchantRequestsController {
  constructor(private readonly merchantRequestsService: MerchantRequestsService) {}

  // ── User: Antrag stellen ────────────────────────────────────────
  @Post()
  @ApiOperation({ summary: 'Merchant-Antrag stellen' })
  @ApiBody({ schema: { example: { shopName: 'Marias Vintage Mode' } } })
  createRequest(
    @CurrentUser() user: User,
    @Body('shopName') shopName: string,
  ) {
    return this.merchantRequestsService.createRequest(user.id, shopName);
  }

  // ── User: eigenen Status abfragen ───────────────────────────────
  @Get('my-status')
  @ApiOperation({ summary: 'Eigenen Merchant-Status abfragen' })
  getMyStatus(@CurrentUser() user: User) {
    return this.merchantRequestsService.getMyStatus(user.id);
  }

  // ── Admin: alle Anträge ─────────────────────────────────────────
  @Get()
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: '[Admin] Alle Merchant-Anträge' })
  getAllRequests() {
    return this.merchantRequestsService.getAllRequests(MerchantRequestStatus.PENDING);
  }

  @Get('all')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: '[Admin] Alle Anträge inkl. bearbeiteter' })
  getAllRequestsIncludingProcessed() {
    return this.merchantRequestsService.getAllRequests();
  }

  // ── Admin: annehmen ─────────────────────────────────────────────
  @Patch(':id/approve')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: '[Admin] Antrag annehmen' })
  approveRequest(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() admin: User,
  ) {
    return this.merchantRequestsService.approveRequest(id, admin.id);
  }

  // ── Admin: ablehnen ─────────────────────────────────────────────
  @Patch(':id/reject')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: '[Admin] Antrag ablehnen' })
  @ApiBody({ schema: { example: { reason: 'Unvollständige Angaben' } } })
  rejectRequest(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() admin: User,
    @Body('reason') reason?: string,
  ) {
    return this.merchantRequestsService.rejectRequest(id, admin.id, reason);
  }
}
