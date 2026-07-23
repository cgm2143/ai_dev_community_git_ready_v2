import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../../../infra/prisma/prisma.service';
import { RedisService } from '../../../infra/redis/redis.service';
import { AdminAuditLogService } from '../../../common/services/admin-audit-log.service';
import { AppException } from '../../../common/exceptions/app.exception';
import { ErrorCode } from '../../../common/constants/error-codes';

const BANNED_WORDS_REDIS_KEY = 'moderation:banned-words';

/**
 * 금칙어 CRUD + 실제 콘텐츠 검사(containsBannedWord)를 함께 제공한다.
 * 매 게시글/댓글 저장 시마다 DB를 조회하면 느리므로, 금칙어 목록을 Redis Set에 캐싱해두고
 * 이 Set을 기준으로 빠르게 검사한다. 금칙어 추가/삭제 시 캐시를 즉시 갱신한다.
 *
 * 참고: 이번 단계에서는 CRUD와 검사 메서드까지만 구현했고, Posts/Comments 작성 로직에
 * 실제로 연결(작성 시 자동 차단)하는 것은 포함하지 않았다 - 이미 구현된 모듈을 다시 여는 대신,
 * 필요하다는 확인을 받은 뒤 다음 턴에 반영하는 것이 안전하다고 판단했다.
 */
@Injectable()
export class WordFilterService implements OnModuleInit {
  private readonly logger = new Logger(WordFilterService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly auditLog: AdminAuditLogService,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.refreshCache();
  }

  async list() {
    return this.prisma.bannedWord.findMany({ orderBy: { createdAt: 'desc' } });
  }

  async add(adminId: string, word: string) {
    const normalized = word.trim().toLowerCase();

    const existing = await this.prisma.bannedWord.findUnique({ where: { word: normalized } });
    if (existing) {
      throw new AppException(ErrorCode.BANNED_WORD_ALREADY_EXISTS);
    }

    const created = await this.prisma.bannedWord.create({
      data: { word: normalized, createdBy: adminId },
    });

    await this.redis.client.sadd(BANNED_WORDS_REDIS_KEY, normalized);
    await this.auditLog.record({
      adminId,
      action: 'BANNED_WORD_ADD',
      targetType: 'BANNED_WORD',
      targetId: created.id,
      meta: { word: normalized },
    });

    return created;
  }

  async remove(adminId: string, id: string): Promise<void> {
    const word = await this.prisma.bannedWord.findUnique({ where: { id } });
    if (!word) {
      throw new AppException(ErrorCode.BANNED_WORD_NOT_FOUND);
    }

    await this.prisma.bannedWord.delete({ where: { id } });
    await this.redis.client.srem(BANNED_WORDS_REDIS_KEY, word.word);
    await this.auditLog.record({
      adminId,
      action: 'BANNED_WORD_REMOVE',
      targetType: 'BANNED_WORD',
      targetId: id,
      meta: { word: word.word },
    });
  }

  /** 텍스트에 금칙어가 하나라도 포함되어 있는지 검사한다 (대소문자 무시, 단순 부분 문자열 매칭). */
  async containsBannedWord(text: string): Promise<boolean> {
    // 금칙어 목록(Redis)을 못 읽으면 fail-open(미검출)으로 degrade한다. Redis 장애가 게시글/댓글
    // 작성을 500으로 막는 것보다, 그 순간 금칙어 검사만 건너뛰는 편이 서비스 가용성에 유리하다.
    try {
      const words = await this.redis.client.smembers(BANNED_WORDS_REDIS_KEY);
      const normalized = text.toLowerCase();
      return words.some((word) => normalized.includes(word));
    } catch (error) {
      this.logger.warn(`금칙어 목록(Redis) 조회 실패 - 이번 요청은 검사를 건너뜁니다: ${String(error)}`);
      return false;
    }
  }

  private async refreshCache(): Promise<void> {
    const words = await this.prisma.bannedWord.findMany({ select: { word: true } });
    await this.redis.client.del(BANNED_WORDS_REDIS_KEY);
    if (words.length > 0) {
      await this.redis.client.sadd(BANNED_WORDS_REDIS_KEY, ...words.map((w) => w.word));
    }
  }
}
