import {
  Injectable, NotFoundException,
  ConflictException, BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MerchantRequest, MerchantRequestStatus } from './merchant-request.entity';
import { User, UserRole } from '../users/user.entity';
import { MerchantProfile } from '../users/merchant-profile.entity';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class MerchantRequestsService {
  constructor(
    @InjectRepository(MerchantRequest)
    private readonly requestRepo: Repository<MerchantRequest>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(MerchantProfile)
    private readonly merchantProfileRepo: Repository<MerchantProfile>,
    private readonly notifications: NotificationsService,
  ) {}

  // ── User: Antrag stellen ────────────────────────────────────────
  async createRequest(userId: string, shopName: string): Promise<MerchantRequest> {
    // Bereits Merchant oder Admin?
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User nicht gefunden');
    if (user.role === UserRole.MERCHANT || user.role === UserRole.ADMIN) {
      throw new ConflictException('Du bist bereits Merchant');
    }

    // Bereits offener Antrag?
    const existing = await this.requestRepo.findOne({
      where: { userId, status: MerchantRequestStatus.PENDING },
    });
    if (existing) throw new ConflictException('Du hast bereits einen offenen Antrag');

    if (!shopName || shopName.trim().length < 2) {
      throw new BadRequestException('Shop-Name muss mindestens 2 Zeichen haben');
    }

    const request = this.requestRepo.create({
      userId,
      shopName: shopName.trim(),
      status: MerchantRequestStatus.PENDING,
    });
    return this.requestRepo.save(request);
  }

  // ── User: eigenen Status abfragen ───────────────────────────────
  async getMyStatus(userId: string): Promise<{
    hasRequest: boolean;
    status: MerchantRequestStatus | null;
    shopName: string | null;
    reason: string | null;
    createdAt: Date | null;
  }> {
    // Letzten Antrag (egal welchen Status) zurückgeben
    const request = await this.requestRepo.findOne({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
    if (!request) return { hasRequest: false, status: null, shopName: null, reason: null, createdAt: null };
    return {
      hasRequest: true,
      status: request.status,
      shopName: request.shopName,
      reason: request.reason,
      createdAt: request.createdAt,
    };
  }

  // ── Admin: alle Anträge (filter by status) ─────────────────────
  async getAllRequests(status?: MerchantRequestStatus) {
    const where: any = {};
    if (status) where.status = status;
    return this.requestRepo.find({
      where,
      relations: ['user'],
      order: { createdAt: 'DESC' },
    });
  }

  // ── Admin: Antrag annehmen ──────────────────────────────────────
  async approveRequest(requestId: string, adminId: string): Promise<MerchantRequest> {
    const request = await this.requestRepo.findOne({
      where: { id: requestId },
      relations: ['user'],
    });
    if (!request) throw new NotFoundException('Antrag nicht gefunden');
    if (request.status !== MerchantRequestStatus.PENDING) {
      throw new ConflictException('Antrag wurde bereits bearbeitet');
    }

    // 1. Status des Antrags aktualisieren
    await this.requestRepo.update(requestId, {
      status: MerchantRequestStatus.APPROVED,
      reviewedBy: adminId,
    });

    // 2. User-Rolle auf MERCHANT setzen
    await this.userRepo.update(request.userId, { role: UserRole.MERCHANT });

    // 3. MerchantProfile anlegen (falls noch keins existiert)
    const existingProfile = await this.merchantProfileRepo.findOne({
      where: { userId: request.userId },
    });
    if (!existingProfile) {
      const profile = this.merchantProfileRepo.create({
        userId: request.userId,
        shopName: request.shopName,
        isVerified: true,
      });
      await this.merchantProfileRepo.save(profile);
    } else {
      await this.merchantProfileRepo.update(existingProfile.id, {
        isVerified: true,
        shopName: request.shopName,
      });
    }

    const approved = await this.requestRepo.findOne({ where: { id: requestId }, relations: ['user'] }) as MerchantRequest;

    // Genehmigungsmail senden
    if (approved?.user) {
      await this.notifications.sendMerchantApproved(
        approved.user.email, approved.user.firstName, request.shopName
      );
    }

    return approved;
  }

  // ── Admin: Antrag ablehnen ──────────────────────────────────────
  async rejectRequest(requestId: string, adminId: string, reason?: string): Promise<MerchantRequest> {
    const request = await this.requestRepo.findOne({ where: { id: requestId } });
    if (!request) throw new NotFoundException('Antrag nicht gefunden');
    if (request.status !== MerchantRequestStatus.PENDING) {
      throw new ConflictException('Antrag wurde bereits bearbeitet');
    }

    await this.requestRepo.update(requestId, {
      status: MerchantRequestStatus.REJECTED,
      reviewedBy: adminId,
      reason: reason ?? null,
    });

    const rejected = await this.requestRepo.findOne({ where: { id: requestId }, relations: ['user'] }) as MerchantRequest;

    // Ablehnungsmail senden
    if (rejected?.user) {
      await this.notifications.sendMerchantRejected(
        rejected.user.email, rejected.user.firstName, reason
      );
    }

    return rejected;
  }
}
