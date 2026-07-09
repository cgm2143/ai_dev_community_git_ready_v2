import { Injectable } from '@nestjs/common';
import { PostsService } from '../../posts/posts.service';
import { NotificationsService } from '../../notifications/notifications.service';
import { AdminAuditLogService } from '../../../common/services/admin-audit-log.service';

/**
 * 8단계(Notifications)에서 미리 만들어 둔 BullMQ 기반 전체 회원 브로드캐스트 큐의
 * 첫 실제 호출 지점. 게시글을 공지로 지정하는 순간, 회원 전체에게 NOTICE 알림을
 * 비동기로 발송한다 (API 응답은 큐 적재만 기다리므로 즉시 반환된다).
 */
@Injectable()
export class AdminNoticesService {
  constructor(
    private readonly postsService: PostsService,
    private readonly notificationsService: NotificationsService,
    private readonly auditLog: AdminAuditLogService,
  ) {}

  async setNotice(adminId: string, postId: string, isNotice: boolean) {
    const post = await this.postsService.setNoticeStatus(postId, isNotice);

    if (isNotice) {
      await this.notificationsService.broadcastNotice(
        `새로운 공지사항이 등록되었습니다: ${post.title}`,
        adminId,
        'POST',
        postId,
      );
    }

    await this.auditLog.record({
      adminId,
      action: isNotice ? 'POST_SET_NOTICE' : 'POST_UNSET_NOTICE',
      targetType: 'POST',
      targetId: postId,
    });

    return post;
  }
}
