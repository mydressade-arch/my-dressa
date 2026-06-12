import {
  Controller, Get, Post, Patch, Param, Body,
  UseGuards, ParseUUIDPipe, UseInterceptors, UploadedFiles,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiBody } from '@nestjs/swagger';
import { DamageReportsService } from './damage-reports.service';
import { DamageSeverity, DamageReportStatus } from './damage-report.entity';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User, UserRole } from '../users/user.entity';

@ApiTags('Damage Reports')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('damage-reports')
export class DamageReportsController {
  constructor(private readonly damageReportsService: DamageReportsService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles(UserRole.MERCHANT, UserRole.ADMIN)
  @ApiOperation({ summary: 'Schaden melden (Händler)' })
  @UseInterceptors(FilesInterceptor('photos', 5))
  createReport(
    @CurrentUser() user: User,
    @Body() body: { rentalId: string; description: string; severity?: DamageSeverity },
    @UploadedFiles() photos?: Express.Multer.File[],
  ) {
    const merchantId = (user as any).merchantProfile?.id ?? user.id;
    return this.damageReportsService.createReport({
      rentalId:    body.rentalId,
      reportedBy:  merchantId,
      description: body.description,
      severity:    body.severity || DamageSeverity.MINOR,
      photos,
    });
  }

  @Get('my-reports')
  @UseGuards(RolesGuard)
  @Roles(UserRole.MERCHANT, UserRole.ADMIN)
  myReports(@CurrentUser() user: User) {
    const merchantId = (user as any).merchantProfile?.id ?? user.id;
    return this.damageReportsService.getMerchantReports(merchantId);
  }

  @Get()
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  allReports() {
    return this.damageReportsService.getAllReports(DamageReportStatus.OPEN);
  }

  @Get('all')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  allReportsAll() {
    return this.damageReportsService.getAllReports();
  }

  // ── Admin: Kaution freigeben ──────────────────────────────────────────────
  @Patch(':id/release-deposit')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: '[Admin] Kaution freigeben → Stripe Cancel' })
  @ApiBody({ schema: { example: { note: 'Kleiner Schaden akzeptiert' } } })
  releaseDeposit(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() admin: User,
    @Body('note') note?: string,
  ) {
    return this.damageReportsService.releaseDeposit(id, admin.id, note);
  }

  // ── Admin: Kaution einbehalten ────────────────────────────────────────────
  @Patch(':id/retain-deposit')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: '[Admin] Kaution einbehalten → Stripe Capture + optional Transfer an Händler' })
  @ApiBody({ schema: { example: { note: 'Starker Fleck auf dem Kleid', merchantAmount: 30 } } })
  retainDeposit(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() admin: User,
    @Body('note') note?: string,
    @Body('merchantAmount') merchantAmount?: number,
  ) {
    const amount = merchantAmount ? Number(merchantAmount) : undefined;
    return this.damageReportsService.retainDeposit(id, admin.id, note, amount);
  }
}
