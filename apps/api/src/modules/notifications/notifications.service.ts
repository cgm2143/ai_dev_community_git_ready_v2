import { Injectable } from '@nestjs/common';
import { NotificationType } from '@prisma/client';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { RedisService } from '../../infra/redis/redis.service';
import { AppException } from '../../common/exceptions/app.exception';
import { ErrorCode } from '../../common/constants/error-codes';
import { computeNotificationGroupKey } from './notification-group-key.util';
import { NotificationBroadcastQueueService } from '../../infra/queue/notification-broadcast-queue.service';

export const NOTIFICATION_BROADCAST_CHANNEL = 'notifications:broadcast';

export interface CreateNotificationParams {
  userId: string;
  type: NotificationType;
  actorId?: string;
  targetType?: string;
  targetId?: string;
  /**
   * 지정하면 buildMessage()의 자동 템플릿 대신 이 문구를 그대로 사용한다.
   * 신고 처리 결과처럼 상황별로 문구가 크게 달라지는 알림(REPORT)에 사용한다.
   */
  message?: string;
}

const NOTIFICATION_SELECT = {
  id: true,
  type: true,
  actorId: true,
  actor: { select: { nickname: true } },
  targetType: true,
  targetId: true,
  message: true,
  isRead: true,
  groupCount: true,
  createdAt: true,
} as const;

/**
 * 알림 생성 + 실시간 브로드캐스트를 전담한다.
 *
 * 실시간 전달 방식: 이 서비스는 DB에 저장한 뒤 Redis Pub/Sub 채널(`notifications:broadcast`)에
 * { userId, notification } 페이로드를 발행하기만 한다. `NotificationsGateway`가 이 채널을 구독해,
 * 자신에게 연결된 사용자(userId)의 소켓 룸으로만 재전송한다. 1단계 아키텍처에서 계획한
 * "WebSocket은 초기엔 백엔드에 통합하되, Redis Pub/Sub으로 다중 인스턴스 확장 가능하게" 원칙을
 * 그대로 구현한 것 - 인스턴스가 여러 대로 늘어나도 이 서비스나 Gateway 코드를 바꿀 필요가 없다.
 */
@Injectable()
export class NotificationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly broadcastQueue: NotificationBroadcastQueueService,
  ) {}

  /**
   * 알림을 생성한다. actorId와 userId(수신자)가 같으면(자기 글에 자기가 댓글/추천) 생성하지 않는다.
   * message는 여기서 중앙 집중적으로 조합해, 알림 문구 포맷이 여러 호출부에 흩어지지 않게 한다.
   */
  async create(params: CreateNotificationParams): Promise<void> {
    if (params.actorId && params.actorId === params.userId) {
      return;
    }

    const message = params.message ?? (await this.buildMessage(params));
    const groupKey = computeNotificationGroupKey(params.type, params.targetType, params.targetId);

    const notification = await this.prisma.notification.create({
      data: {
        userId: params.userId,
        type: params.type,
        actorId: params.actorId,
        targetType: params.targetType,
        targetId: params.targetId,
        message,
        groupKey,
      },
      select: NOTIFICATION_SELECT,
    });

    await this.redis.publishJson(NOTIFICATION_BROADCAST_CHANNEL, {
      userId: params.userId,
      notification: this.toResponse(notification),
    });
  }

  /**
   * 공지 등 전체 회원 대상 알림. API 응답과 분리하기 위해 즉시 DB에 쓰지 않고
   * BullMQ 큐에 "첫 배치" 작업만 적재한 뒤 바로 반환한다 - 실제 대량 INSERT는
   * `NotificationBroadcastWorker`(QueueModule)가 배치 크기만큼씩 나누어 비동기로 처리한다.
   * 배치 크기는 `NOTIFICATION_BROADCAST_BATCH_SIZE` 환경변수로 조정 가능하다(기본 500명).
   */
  async broadcastNotice(message: string, actorId?: string, targetType?: string, targetId?: string): Promise<void> {
    await this.broadcastQueue.enqueueFirstBatch({
      type: 'NOTICE',
      message,
      actorId,
      targetType,
      targetId,
    });
  }

  async findMine(userId: string, page: number, limit: number, unreadOnly?: boolean) {
    const where = { userId, ...(unreadOnly ? { isRead: false } : {}) };

    const [notifications, total, unreadCount] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        select: NOTIFICATION_SELECT,
      }),
      this.prisma.notification.count({ where }),
      this.prisma.notification.count({ where: { userId, isRead: false } }),
    ]);

    return {
      items: notifications.map((n) => this.toResponse(n)),
      meta: { page, limit, total, unreadCount },
    };
  }

  async markAsRead(userId: string, notificationId: string): Promise<void> {
    const notification = await this.prisma.notification.findUnique({ where: { id: notificationId } });
    if (!notification || notification.userId !== userId) {
      throw new AppException(ErrorCode.NOTIFICATION_NOT_FOUND);
    }

    if (!notification.isRead) {
      await this.prisma.notification.update({ where: { id: notificationId }, data: { isRead: true } });
    }
  }

  async markAllAsRead(userId: string): Promise<void> {
    await this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });
  }

  async remove(userId: string, notificationId: string): Promise<void> {
    const notification = await this.prisma.notification.findUnique({ where: { id: notificationId } });
    if (!notification || notification.userId !== userId) {
      throw new AppException(ErrorCode.NOTIFICATION_NOT_FOUND);
    }
    await this.prisma.notification.delete({ where: { id: notificationId } });
  }

  private async buildMessage(params: CreateNotificationParams): Promise<string> {
    const actorNickname = params.actorId
      ? (await this.prisma.user.findUnique({ where: { id: params.actorId }, select: { nickname: true } }))
          ?.nickname
      : null;

    switch (params.type) {
      case NotificationType.COMMENT:
        return `${actorNickname ?? '누군가'}님이 회원님의 게시글에 댓글을 남겼습니다.`;
      case NotificationType.REPLY:
        return `${actorNickname ?? '누군가'}님이 회원님의 댓글에 답글을 남겼습니다.`;
      case NotificationType.LIKE:
        return `${actorNickname ?? '누군가'}님이 회원님의 글을 추천했습니다.`;
      case NotificationType.NOTICE:
        return '새로운 공지사항이 등록되었습니다.';
      case NotificationType.REPORT:
        return '신고 처리 현황에 업데이트가 있습니다.';
      default:
        return '새 알림이 있습니다.';
    }
  }

  private toResponse(notification: {
    id: string;
    type: NotificationType;
    actorId: string | null;
    actor: { nickname: string } | null;
    targetType: string | null;
    targetId: string | null;
    message: string;
    isRead: boolean;
    groupCount: number;
    createdAt: Date;
  }) {
    return {
      id: notification.id,
      type: notification.type,
      actorId: notification.actorId,
      actorNickname: notification.actor?.nickname ?? null,
      targetType: notification.targetType,
      targetId: notification.targetId,
      message: notification.message,
      isRead: notification.isRead,
      groupCount: notification.groupCount,
      createdAt: notification.createdAt,
    };
  }
}
