import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../../../infra/prisma/prisma.service';
import { RedisService } from '../../../infra/redis/redis.service';
import { AdminAuditLogService } from '../../../common/services/admin-audit-log.service';
import { AppException } from '../../../common/exceptions/app.exception';
import { ErrorCode } from '../../../common/constants/error-codes';
import { CreateIpBanDto } from './dto/ip-ban.dto';

const BANNED_IPS_REDIS_KEY = 'moderation:banned-ips';

/**
 * IP 차단 CRUD + `IpBanGuard`가 사용하는 빠른 조회(Redis Set)를 함께 제공한다.
 * 만료 시각(expiresAt)이 있는 차단은 Redis Set 자체에는 만료 개념이 없으므로,
 * Set 멤버십 확인 후 DB에서 만료 여부를 한 번 더 검증하는 하이브리드 방식을 쓴다
 * (Set에는 있지만 이미 만료된 경우 즉시 Set에서 제거하고 통과시킨다).
 */
@Injectable()
export class IpBanService implements OnModuleInit {
  private readonly logger = new Logger(IpBanService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly auditLog: AdminAuditLogService,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.refreshCache();
  }

  async list() {
    return this.prisma.ipBan.findMany({ orderBy: { createdAt: 'desc' } });
  }

  async ban(adminId: string, dto: CreateIpBanDto) {
    const existing = await this.prisma.ipBan.findUnique({ where: { ipAddress: dto.ipAddress } });
    if (existing) {
      throw new AppException(ErrorCode.IP_ALREADY_BANNED);
    }

    const created = await this.prisma.ipBan.create({
      data: {
        ipAddress: dto.ipAddress,
        reason: dto.reason,
        createdBy: adminId,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
      },
    });

    await this.redis.client.sadd(BANNED_IPS_REDIS_KEY, dto.ipAddress);
    await this.auditLog.record({
      adminId,
      action: 'IP_BAN',
      targetType: 'IP',
      targetId: created.id,
      meta: { ipAddress: dto.ipAddress, reason: dto.reason },
    });

    return created;
  }

  async unban(adminId: string, id: string): Promise<void> {
    const ban = await this.prisma.ipBan.findUnique({ where: { id } });
    if (!ban) {
      throw new AppException(ErrorCode.IP_BAN_NOT_FOUND);
    }

    await this.prisma.ipBan.delete({ where: { id } });
    await this.redis.client.srem(BANNED_IPS_REDIS_KEY, ban.ipAddress);
    await this.auditLog.record({
      adminId,
      action: 'IP_UNBAN',
      targetType: 'IP',
      targetId: id,
      meta: { ipAddress: ban.ipAddress },
    });
  }

  /** IpBanGuard가 매 요청마다 호출한다. */
  async isBanned(ipAddress: string): Promise<boolean> {
    // IpBanGuard는 가드 체인 맨 앞에서 모든 요청에 대해 실행된다. Redis 조회가 실패하면
    // fail-open(미차단)으로 degrade한다 - Redis 장애가 전체 서비스를 500으로 마비시키는 것보다,
    // 그 짧은 장애 동안 IP 차단만 일시적으로 우회되는 편이 낫다(차단 원본은 DB에 남아있음).
    try {
      const isMember = await this.redis.client.sismember(BANNED_IPS_REDIS_KEY, ipAddress);
      if (!isMember) return false;

      const ban = await this.prisma.ipBan.findUnique({ where: { ipAddress } });
      if (!ban) {
        await this.redis.client.srem(BANNED_IPS_REDIS_KEY, ipAddress);
        return false;
      }

      if (ban.expiresAt && ban.expiresAt.getTime() < Date.now()) {
        await this.redis.client.srem(BANNED_IPS_REDIS_KEY, ipAddress);
        return false;
      }

      return true;
    } catch (error) {
      this.logger.warn(`IP 차단 확인(Redis) 실패 - 이번 요청은 통과시킵니다(fail-open) [${ipAddress}]: ${String(error)}`);
      return false;
    }
  }

  private async refreshCache(): Promise<void> {
    const bans = await this.prisma.ipBan.findMany({ select: { ipAddress: true } });
    await this.redis.client.del(BANNED_IPS_REDIS_KEY);
    if (bans.length > 0) {
      await this.redis.client.sadd(BANNED_IPS_REDIS_KEY, ...bans.map((b) => b.ipAddress));
    }
  }
}
