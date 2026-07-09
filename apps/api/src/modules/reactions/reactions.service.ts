import { Injectable } from '@nestjs/common';
import { Prisma, ReactionTargetType, ReactionType, NotificationType } from '@prisma/client';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { TargetValidatorRegistry } from '../../common/domain/target-validator.registry';
import { NotificationsService } from '../notifications/notifications.service';
import { RankingService, RANKING_WEIGHTS } from '../ranking/ranking.service';
import { AppException } from '../../common/exceptions/app.exception';
import { ErrorCode } from '../../common/constants/error-codes';

export interface ReactionResult {
  active: boolean;
  type: 'LIKE' | 'DISLIKE' | null;
  likeCount: number;
  dislikeCount: number | null;
}

/**
 * Post/Comment 양쪽에 재사용되는 다형성 추천/비추천 서비스.
 * 대상 존재 여부는 TargetValidatorRegistry에 등록된 검증기를 통해서만 확인하므로,
 * 이 서비스는 Posts/Comments 모듈을 전혀 import하지 않는다 (3단계에서 설계한 원칙).
 * 알림 발송 시 대상 소유자(작성자) 조회도 동일한 레지스트리의 getOwnerId()를 재사용한다.
 *
 * 토글 규칙:
 * - 같은 타입을 다시 누르면 반응이 취소된다 (active: false)
 * - 다른 타입을 누르면 기존 반응이 새 타입으로 전환된다 (카운트도 함께 이동)
 * - 반응이 없었다면 새로 생성된다
 *
 * 댓글은 "추천"만 지원한다 (스키마상 Comment.dislikeCount 컬럼 자체가 없음).
 */
@Injectable()
export class ReactionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly targetValidatorRegistry: TargetValidatorRegistry,
    private readonly notificationsService: NotificationsService,
    private readonly rankingService: RankingService,
  ) {}

  async react(
    userId: string,
    targetType: ReactionTargetType,
    targetId: string,
    type: ReactionType,
  ): Promise<ReactionResult> {
    if (targetType === ReactionTargetType.COMMENT && type === ReactionType.DISLIKE) {
      throw new AppException(ErrorCode.REACTION_TYPE_NOT_SUPPORTED);
    }

    const validator = this.targetValidatorRegistry.get(targetType);
    if (!validator) {
      throw new AppException(ErrorCode.INVALID_REACTION_TARGET);
    }

    const exists = await validator.exists(targetId);
    if (!exists) {
      throw new AppException(ErrorCode.RESOURCE_NOT_FOUND);
    }

    let shouldNotifyLike = false;
    // 게시글의 likeCount 순증감분 (-1/0/+1) - 12단계 랭킹 증분 업데이트에 사용한다.
    // 비추천은 랭킹 점수식에 반영하지 않으므로(likeCount만 가중치를 가짐) 추천의 증감만 추적한다.
    let postLikeCountDelta = 0;

    const result = await this.prisma.$transaction(async (tx) => {
      const existing = await tx.reaction.findUnique({
        where: { userId_targetType_targetId: { userId, targetType, targetId } },
      });

      if (!existing) {
        await tx.reaction.create({ data: { userId, targetType, targetId, type } });
        await this.applyCountDelta(tx, targetType, targetId, type, 1);
        shouldNotifyLike = type === ReactionType.LIKE;
        if (targetType === ReactionTargetType.POST && type === ReactionType.LIKE) postLikeCountDelta = 1;
        return this.buildResult(tx, targetType, targetId, type, true);
      }

      if (existing.type === type) {
        await tx.reaction.delete({ where: { id: existing.id } });
        await this.applyCountDelta(tx, targetType, targetId, type, -1);
        if (targetType === ReactionTargetType.POST && type === ReactionType.LIKE) postLikeCountDelta = -1;
        return this.buildResult(tx, targetType, targetId, null, false);
      }

      await tx.reaction.update({ where: { id: existing.id }, data: { type } });
      await this.applyCountDelta(tx, targetType, targetId, existing.type, -1);
      await this.applyCountDelta(tx, targetType, targetId, type, 1);
      shouldNotifyLike = type === ReactionType.LIKE; // DISLIKE -> LIKE 전환도 알림 대상
      if (targetType === ReactionTargetType.POST) {
        if (type === ReactionType.LIKE) postLikeCountDelta = 1; // DISLIKE -> LIKE
        else postLikeCountDelta = -1; // LIKE -> DISLIKE
      }
      return this.buildResult(tx, targetType, targetId, type, true);
    });

    // 알림 발송과 랭킹 증분 갱신은 트랜잭션 밖에서 처리한다 (Redis 작업 실패가 반응 자체의
    // 원자성에 영향을 주지 않도록 - 반응 자체는 이미 DB에 커밋된 상태다).
    if (shouldNotifyLike) {
      const ownerId = await validator.getOwnerId(targetId);
      if (ownerId) {
        await this.notificationsService.create({
          userId: ownerId,
          type: NotificationType.LIKE,
          actorId: userId,
          targetType,
          targetId,
        });
      }
    }

    if (postLikeCountDelta !== 0) {
      await this.rankingService.applyEngagementDelta(targetId, postLikeCountDelta * RANKING_WEIGHTS.LIKE);
    }

    return result;
  }

  private async applyCountDelta(
    tx: Prisma.TransactionClient,
    targetType: ReactionTargetType,
    targetId: string,
    type: ReactionType,
    delta: number,
  ): Promise<void> {
    if (targetType === ReactionTargetType.POST) {
      if (type === ReactionType.LIKE) {
        await tx.post.update({ where: { id: targetId }, data: { likeCount: { increment: delta } } });
      } else {
        await tx.post.update({ where: { id: targetId }, data: { dislikeCount: { increment: delta } } });
      }
      return;
    }

    await tx.comment.update({ where: { id: targetId }, data: { likeCount: { increment: delta } } });
  }

  private async buildResult(
    tx: Prisma.TransactionClient,
    targetType: ReactionTargetType,
    targetId: string,
    type: 'LIKE' | 'DISLIKE' | null,
    active: boolean,
  ): Promise<ReactionResult> {
    if (targetType === ReactionTargetType.POST) {
      const post = await tx.post.findUniqueOrThrow({
        where: { id: targetId },
        select: { likeCount: true, dislikeCount: true },
      });
      return { active, type, likeCount: post.likeCount, dislikeCount: post.dislikeCount };
    }

    const comment = await tx.comment.findUniqueOrThrow({
      where: { id: targetId },
      select: { likeCount: true },
    });
    return { active, type, likeCount: comment.likeCount, dislikeCount: null };
  }
}
