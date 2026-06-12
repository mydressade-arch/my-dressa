import {
  Controller, Post, Get, Body, Param, UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { PaymentsService } from './payments.service';
import { CreatePaymentIntentDto } from './dto/create-payment-intent.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User, UserRole } from '../users/user.entity';

@ApiTags('Payments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('create-intent')
  @ApiOperation({ summary: 'Payment Intent erstellen (vor Checkout)' })
  createPaymentIntent(
    @Body() dto: CreatePaymentIntentDto,
    @CurrentUser() user: User,
  ) {
    return this.paymentsService.createPaymentIntent(dto.orderId, user.id);
  }

  @Post('merchant/stripe-account')
  @UseGuards(RolesGuard)
  @Roles(UserRole.MERCHANT, UserRole.ADMIN)
  @ApiOperation({ summary: 'Stripe Express Account erstellen (Händler)' })
  createStripeAccount(@CurrentUser() user: User) {
    const merchantId = (user as any).merchantProfile?.id ?? user.id;
    return this.paymentsService.createMerchantStripeAccount(merchantId, user.email);
  }

  @Get('merchant/stripe-status')
  @UseGuards(RolesGuard)
  @Roles(UserRole.MERCHANT, UserRole.ADMIN)
  @ApiOperation({ summary: 'Stripe Account Status prüfen (Händler)' })
  stripeStatus(@CurrentUser() user: User) {
    const merchantId = (user as any).merchantProfile?.id ?? user.id;
    return this.paymentsService.checkMerchantStripeStatus(merchantId);
  }

  @Post('merchant/stripe-refresh-link')
  @UseGuards(RolesGuard)
  @Roles(UserRole.MERCHANT, UserRole.ADMIN)
  @ApiOperation({ summary: 'Neuen Onboarding-Link generieren' })
  refreshOnboardingLink(@CurrentUser() user: User) {
    const merchantId = (user as any).merchantProfile?.id ?? user.id;
    return this.paymentsService.refreshMerchantOnboardingLink(merchantId);
  }

  @Post('payout/:orderId')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Händler-Auszahlung auslösen (Admin)' })
  payoutMerchant(@Param('orderId', ParseUUIDPipe) orderId: string) {
    return this.paymentsService.payoutMerchant(orderId);
  }

  @Post('refund/:orderId')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Bestellung zurückerstatten (Admin)' })
  refundOrder(
    @Param('orderId', ParseUUIDPipe) orderId: string,
    @Body('reason') reason: string,
  ) {
    return this.paymentsService.refundOrder(orderId, reason);
  }


  @Get('merchant/transfers')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.MERCHANT, UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Händler: Stripe Transfers (Schadensentschädigungen)' })
  async getMerchantTransfers(@CurrentUser() user: User) {
    const merchant = await this.paymentsService.getMerchantProfile(user.id);
    if (!merchant?.stripeAccountId) return [];
    try {
      const transfers = await this.paymentsService.getStripeTransfers(merchant.stripeAccountId);
      return transfers;
    } catch { return []; }
  }
}
