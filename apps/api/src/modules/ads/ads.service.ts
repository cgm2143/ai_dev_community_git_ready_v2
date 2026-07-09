import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { RedisService } from '../../infra/redis/redis.service';
import { AppException } from '../../common/exceptions/app.exception';
import { ErrorCode } from '../../common/constants/error-codes';

const IMPRESSION_COOLDOWN_SECONDS = 60; // 동일 사용자/IP + 광고 조합 1분당 1회만 노출 집계

/**
 * 광고 공개 조회/집계 서비스. 노출(impression) 기록은 스크롤 중 반복 호출될 수 있어
 * 어뷰징 방지를 위해 Redis 쿨다운을 적용한다(4단계 API 설계 검토에서 결정한 사항).
 * 클릭은 사용자의 능동적 행동이라 쿨다운을 적용하지 않고, 대신 컨트롤러 레벨 Rate Limit으로 방어한다.
 */
@Injectable()
export class AdsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  async getActiveBySlotCode(slotCode: string) {
    const slot = await this.prisma.adSlot.findUnique({ where: { code: slotCode } });
    if (!slot) {
      throw new AppException(ErrorCode.AD_SLOT_NOT_FOUND);
    }

    const now = new Date();
    const candidates = await this.prisma.ad.findMany({
      where: {
        slotId: slot.id,
        isActive: true,
        deletedAt: null,
        OR: [{ startAt: null }, { startAt: { lte: now } }],
        AND: [{ OR: [{ endAt: null }, { endAt: { gte: now } }] }],
      },
    });

    if (candidates.length === 0) {
      return null;
    }

    const chosen = candidates[Math.floor(Math.random() * candidates.length)];

    return {
      id: chosen.id,
      type: chosen.type,
      purpose: chosen.purpose,
      content: chosen.content,
      linkUrl: chosen.linkUrl,
    };
  }

  async recordImpression(adId: string, identifier: string): Promise<void> {
    const ad = await this.prisma.ad.findUnique({ where: { id: adId } });
    if (!ad) {
      throw new AppException(ErrorCode.AD_NOT_FOUND);
    }

    const cooldownKey = `ad-impression-cooldown:${adId}:${identifier}`;
    const isCoolingDown = await this.redis.exists(cooldownKey);
    if (isCoolingDown) {
      return;
    }
    await this.redis.set(cooldownKey, '1', IMPRESSION_COOLDOWN_SECONDS);

    await this.prisma.adImpression.create({ data: { adId, ip: identifier } });
  }

  async recordClick(adId: string, identifier: string): Promise<{ linkUrl: string | null }> {
    const ad = await this.prisma.ad.findUnique({ where: { id: adId } });
    if (!ad) {
      throw new AppException(ErrorCode.AD_NOT_FOUND);
    }

    await this.prisma.adClick.create({ data: { adId, ip: identifier } });

    return { linkUrl: ad.linkUrl };
  }
}
