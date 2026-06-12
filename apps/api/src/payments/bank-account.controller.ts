import { Controller, Get, Post, Patch, Param, Body, UseGuards, ParseUUIDPipe, UseInterceptors, UploadedFile } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { BankAccountService } from './bank-account.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User, UserRole } from '../users/user.entity';
import { StorageService } from '../products/storage.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PayoutReceipt } from '../commissions/payout-receipt.entity';
import { MerchantPayout } from '../commissions/merchant-payout.entity';

@ApiTags('Bank Account')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('bank')
export class BankAccountController {
  constructor(
    private readonly bankAccountService: BankAccountService,
    private readonly storageService: StorageService,
    @InjectRepository(PayoutReceipt)
    private readonly receiptRepo: Repository<PayoutReceipt>,
    @InjectRepository(MerchantPayout)
    private readonly payoutRepo: Repository<MerchantPayout>,
  ) {}

  // ── Händler: Bankdaten speichern ──────────────────────────────────────────
  @Post('account')
  @UseGuards(RolesGuard)
  @Roles(UserRole.MERCHANT, UserRole.ADMIN)
  @ApiOperation({ summary: 'Bankdaten speichern (verschlüsselt)' })
  saveBankAccount(
    @CurrentUser() user: User,
    @Body() dto: { accountName: string; iban: string; bic?: string; bankName?: string },
  ) {
    return this.bankAccountService.saveBankAccount(user.id, dto);
  }

  // ── Händler: eigene Bankdaten (maskiert) ──────────────────────────────────
  @Get('account')
  @UseGuards(RolesGuard)
  @Roles(UserRole.MERCHANT, UserRole.ADMIN)
  @ApiOperation({ summary: 'Eigene Bankdaten abrufen (maskiert)' })
  getBankAccount(@CurrentUser() user: User) {
    return this.bankAccountService.getBankAccount(user.id);
  }

  // ── Admin: Bankdaten eines Händlers (vollständig) ─────────────────────────
  @Get('admin/:merchantId')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: '[Admin] Bankdaten eines Händlers abrufen' })
  getForAdmin(@Param('merchantId', ParseUUIDPipe) merchantId: string) {
    return this.bankAccountService.getBankAccountForAdmin(merchantId);
  }

  // ── Admin: Überweisungsquittung hochladen ─────────────────────────────────
  @Post('payouts/:payoutId/receipt')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: '[Admin] Überweisungsquittung hochladen' })
  @UseInterceptors(FileInterceptor('receipt'))
  async uploadReceipt(
    @Param('payoutId', ParseUUIDPipe) payoutId: string,
    @CurrentUser() admin: User,
    @UploadedFile() file: Express.Multer.File,
    @Body('notes') notes?: string,
  ) {
    const payout = await this.payoutRepo.findOne({ where: { id: payoutId } });
    if (!payout) throw new Error('Payout nicht gefunden');

    const receiptUrl = await this.storageService.uploadProductImage(file, `receipts/${admin.id}`);

    const receipt = this.receiptRepo.create({
      payoutId,
      receiptUrl,
      uploadedBy: admin.id,
      notes: notes || null,
    });
    await this.receiptRepo.save(receipt);

    return { message: 'Quittung hochgeladen', receiptUrl };
  }

  // ── Admin: Quittungen eines Payouts abrufen ───────────────────────────────
  @Get('payouts/:payoutId/receipts')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  getReceipts(@Param('payoutId', ParseUUIDPipe) payoutId: string) {
    return this.receiptRepo.find({ where: { payoutId }, order: { createdAt: 'DESC' } });
  }
}
