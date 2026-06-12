import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { RentalsService } from './rentals.service';
import { Rental, RentalStatus } from './rental.entity';
import { Order } from '../orders/order.entity';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class RentalScheduler {
  private readonly logger = new Logger(RentalScheduler.name);

  constructor(
    private readonly rentalsService: RentalsService,
    private readonly notifications: NotificationsService,
    @InjectRepository(Rental)
    private readonly rentalRepo: Repository<Rental>,
    @InjectRepository(Order)
    private readonly orderRepo: Repository<Order>,
  ) {}

  // ── Jeden Tag 08:00 — überfällige Mieten markieren ───────────────────────
  @Cron(CronExpression.EVERY_DAY_AT_8AM)
  async handleOverdueRentals() {
    this.logger.log('Prüfe überfällige Mieten...');
    const count = await this.rentalsService.markOverdueRentals();
    this.logger.log(`${count} überfällige Mieten verarbeitet`);
  }

  // ── Jeden Tag 09:00 — Rückgabe-Erinnerungen senden ───────────────────────
  @Cron('0 9 * * *')
  async handleRentalReminders() {
    this.logger.log('Sende Rückgabe-Erinnerungen...');

    const today = new Date();
    const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);
    const in3Days  = new Date(today); in3Days.setDate(today.getDate() + 3);

    const fmt = (d: Date) => d.toISOString().split('T')[0];

    // Mieten die morgen oder in 3 Tagen enden
    const rentals = await this.rentalRepo.find({
      where: [
        { status: RentalStatus.ACTIVE, endDate: fmt(tomorrow) },
        { status: RentalStatus.ACTIVE, endDate: fmt(in3Days)  },
      ],
      relations: ['order', 'order.productVariant', 'order.productVariant.product'],
    });

    let sent = 0;
    for (const rental of rentals) {
      const order = rental.order;
      if (!order) continue;

      // User laden via orderRepo um E-Mail zu bekommen
      const fullOrder = await this.orderRepo.findOne({
        where: { id: order.id },
        relations: ['user'],
      });
      if (!fullOrder?.user) continue;

      const endDate = new Date(rental.endDate);
      const daysLeft = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

      await this.notifications.sendRentalReminder(fullOrder.user.email, {
        firstName: fullOrder.user.firstName,
        productTitle: rental.order.productVariant?.product?.title || 'Dein Kleid',
        endDate: rental.endDate,
        daysLeft,
      });
      sent++;
    }

    this.logger.log(`${sent} Erinnerungen gesendet`);
  }
}
