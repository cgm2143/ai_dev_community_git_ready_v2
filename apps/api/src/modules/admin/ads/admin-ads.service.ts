import { Injectable } from '@nestjs/common';
import { AdPurpose, AdType } from '@prisma/client';
import { PrismaService } from '../../../infra/prisma/prisma.service';
import { AdminAuditLogService } from '../../../common/services/admin-audit-log.service';
import { AppException } from '../../../common/exceptions/app.exception';
import { ErrorCode } from '../../../common/constants/error-codes';
import { CreateAdDto, UpdateAdDto } from '../../ads/dto/ad.dto';

@Injectable()
export class AdminAdsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLog: AdminAuditLogService,
  ) {}

  async findAll() {
    return this.prisma.ad.findMany({
      where: { deletedAt: null },
      include: { slot: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(adminId: string, dto: CreateAdDto) {
    const slot = await this.prisma.adSlot.findUnique({ where: { code: dto.slotCode } });
    if (!slot) {
      throw new AppException(ErrorCode.AD_SLOT_NOT_FOUND);
    }

    const ad = await this.prisma.ad.create({
      data: {
        slotId: slot.id,
        type: dto.type as AdType,
        purpose: (dto.purpose as AdPurpose) ?? AdPurpose.AD,
        content: dto.content,
        linkUrl: dto.linkUrl,
        isActive: dto.isActive ?? true,
        startAt: dto.startAt ? new Date(dto.startAt) : null,
        endAt: dto.endAt ? new Date(dto.endAt) : null,
        createdBy: adminId,
      },
    });

    await this.auditLog.record({
      adminId,
      action: 'AD_CREATE',
      targetType: 'AD',
      targetId: ad.id,
      meta: { slotCode: dto.slotCode },
    });

    return ad;
  }

  async update(adminId: string, adId: string, dto: UpdateAdDto) {
    const ad = await this.findAliveOrThrow(adId);

    const updated = await this.prisma.ad.update({
      where: { id: ad.id },
      data: {
        ...(dto.type !== undefined ? { type: dto.type as AdType } : {}),
        ...(dto.purpose !== undefined ? { purpose: dto.purpose as AdPurpose } : {}),
        ...(dto.content !== undefined ? { content: dto.content } : {}),
        ...(dto.linkUrl !== undefined ? { linkUrl: dto.linkUrl } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
        ...(dto.startAt !== undefined ? { startAt: new Date(dto.startAt) } : {}),
        ...(dto.endAt !== undefined ? { endAt: new Date(dto.endAt) } : {}),
      },
    });

    await this.auditLog.record({ adminId, action: 'AD_UPDATE', targetType: 'AD', targetId: adId });

    return updated;
  }

  /** Soft Delete - 과거 노출/클릭 통계 조회를 위해 row 자체는 보존한다. */
  async remove(adminId: string, adId: string): Promise<void> {
    const ad = await this.findAliveOrThrow(adId);

    await this.prisma.ad.update({ where: { id: ad.id }, data: { deletedAt: new Date(), isActive: false } });

    await this.auditLog.record({ adminId, action: 'AD_DELETE', targetType: 'AD', targetId: adId });
  }

  async getStats(adId: string) {
    await this.findAliveOrThrow(adId);

    const [impressionCount, clickCount] = await Promise.all([
      this.prisma.adImpression.count({ where: { adId } }),
      this.prisma.adClick.count({ where: { adId } }),
    ]);

    const ctr = impressionCount > 0 ? Number(((clickCount / impressionCount) * 100).toFixed(2)) : 0;

    return { adId, impressionCount, clickCount, ctr };
  }

  private async findAliveOrThrow(adId: string) {
    const ad = await this.prisma.ad.findUnique({ where: { id: adId } });
    if (!ad || ad.deletedAt) {
      throw new AppException(ErrorCode.AD_NOT_FOUND);
    }
    return ad;
  }
}
