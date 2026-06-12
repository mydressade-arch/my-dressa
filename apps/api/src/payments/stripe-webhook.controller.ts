import {
  Controller, Post, Req, Headers, RawBodyRequest, Logger,
} from '@nestjs/common';
import { Request } from 'express';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { PaymentsService } from './payments.service';

@ApiTags('Webhooks')
@Controller('webhooks')
export class StripeWebhookController {
  private readonly logger = new Logger(StripeWebhookController.name);

  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('stripe')
  @ApiOperation({ summary: 'Stripe Webhook Endpoint' })
  async handleStripeWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('stripe-signature') signature: string,
  ) {
    if (!req.rawBody) {
      this.logger.error('rawBody fehlt — NestJS RawBody Middleware aktivieren');
      return { received: false };
    }

    let event: any;
    try {
      event = this.paymentsService.constructWebhookEvent(req.rawBody, signature);
    } catch (err) {
      this.logger.error(`Webhook Fehler: ${err.message}`);
      return { received: false };
    }

    this.logger.log(`Webhook empfangen: ${event.type}`);

    switch (event.type) {
      case 'payment_intent.succeeded':
        await this.paymentsService.handlePaymentSucceeded(event.data.object);
        break;
      case 'payment_intent.payment_failed':
        await this.paymentsService.handlePaymentFailed(event.data.object);
        break;
      default:
        this.logger.log(`Unbehandelter Event-Typ: ${event.type}`);
    }

    return { received: true };
  }
}
