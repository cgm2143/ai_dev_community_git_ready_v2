import { Injectable } from '@nestjs/common';
import { Prisma, PostStatus, NotificationType } from '@prisma/client';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { BlockService } from '../blocks/block.service';
import { PermissionCheckService } from '../../common/services/permission-check.service';
import { PermissionCode } from '../../common/constants/permission-codes';
import { AppException } from '../../common/exceptions/app.exception';
import { ErrorCode } from '../../common/constants/error-codes';
import { NotificationsService } from '../notifications/notifications.service';
import { WordFilterService } from '../admin/word-filter/word-filter.service';
import { RankingService, RANKING_WEIGHTS } from '../ranking/ranking.service';
import { CreateCommentDto, UpdateCommentDto } from './dto/comment.dto';
import { QueryCommentDto } from './dto/query-comment.dto';

const DELETED_COMMENT_PLACEHOLDER = '삭제된 댓글입니다.';

const COMMENT_SELECT = {
  id: true,
  postId: true,
  parentId: true,
  authorId: true,
  author: { select: { nickname: true, profileImageUrl: true } },
  content: true,
  likeCount: true,
  deletedAt: true,
  createdAt: true,
  updatedAt: true,
  _count: { select: { replies: true } },
} satisfies Prisma.CommentSelect;

type CommentRow = Prisma.CommentGetPayload<{ select: typeof COMMENT_SELECT }>;

@Injectable()
export class CommentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly blockService: BlockService,
    private readonly permissionCheckService: PermissionCheckService,
    private readonly notificationsService: NotificationsService,
    private readonly wordFilterService: WordFilterService,
    private readonly rankingService: RankingService,
  ) {}

  async findTopLevel(postId: string, query: QueryCommentDto, viewerId?: string) {
    await this.assertPostExists(postId);

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const blockedAuthorIds = viewerId ? await this.blockService.getBlockedUserIds(viewerId) : [];

    const where: Prisma.CommentWhereInput = {
      postId,
      parentId: null,
      ...(blockedAuthorIds.length > 0 ? { authorId: { notIn: blockedAuthorIds } } : {}),
    };

    const [comments, total] = await Promise.all([
      this.prisma.comment.findMany({
        where,
        orderBy: { createdAt: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
        select: COMMENT_SELECT,
      }),
      this.prisma.comment.count({ where }),
    ]);

    return {
      items: comments.map((comment) => this.toResponse(comment)),
      meta: { page, limit, total },
    };
  }

  async findReplies(parentId: string, viewerId?: string) {
    const parent = await this.prisma.comment.findUnique({ where: { id: parentId } });
    if (!parent) {
      throw new AppException(ErrorCode.COMMENT_NOT_FOUND);
    }

    const blockedAuthorIds = viewerId ? await this.blockService.getBlockedUserIds(viewerId) : [];

    const replies = await this.prisma.comment.findMany({
      where: {
        parentId,
        ...(blockedAuthorIds.length > 0 ? { authorId: { notIn: blockedAuthorIds } } : {}),
      },
      orderBy: { createdAt: 'asc' },
      select: COMMENT_SELECT,
    });

    return replies.map((reply) => this.toResponse(reply));
  }

  async create(userId: string, postId: string, dto: CreateCommentDto) {
    const post = await this.assertPostExists(postId);
    await this.assertNoBannedWords(dto.content);

    let parent: { authorId: string } | null = null;
    if (dto.parentId) {
      const parentComment = await this.prisma.comment.findUnique({ where: { id: dto.parentId } });
      if (!parentComment || parentComment.postId !== postId) {
        throw new AppException(ErrorCode.COMMENT_NOT_FOUND);
      }
      if (parentComment.parentId !== null) {
        throw new AppException(ErrorCode.INVALID_PARENT_COMMENT);
      }
      parent = parentComment;
    }

    const created = await this.prisma.$transaction(async (tx) => {
      const comment = await tx.comment.create({
        data: {
          postId,
          authorId: userId,
          parentId: dto.parentId ?? null,
          content: dto.content,
        },
      });

      await tx.post.update({ where: { id: postId }, data: { commentCount: { increment: 1 } } });

      return comment;
    });

    // 대댓글이면 부모 댓글 작성자에게 REPLY 알림, 최상위 댓글이면 게시글 작성자에게 COMMENT 알림
    // (자기 자신에게는 NotificationsService.create() 내부에서 자동으로 건너뛴다).
    if (parent) {
      await this.notificationsService.create({
        userId: parent.authorId,
        type: NotificationType.REPLY,
        actorId: userId,
        targetType: 'COMMENT',
        targetId: created.id,
      });
    } else {
      await this.notificationsService.create({
        userId: post.authorId,
        type: NotificationType.COMMENT,
        actorId: userId,
        targetType: 'POST',
        targetId: postId,
      });
    }

    const withRelations = await this.prisma.comment.findUniqueOrThrow({
      where: { id: created.id },
      select: COMMENT_SELECT,
    });

    // 대댓글이든 최상위 댓글이든, 댓글이 하나 늘어난 "그 게시글"의 랭킹 점수를 증분한다.
    await this.rankingService.applyEngagementDelta(postId, RANKING_WEIGHTS.COMMENT);

    return this.toResponse(withRelations);
  }

  async update(userId: string, commentId: string, dto: UpdateCommentDto) {
    const comment = await this.findAliveOrThrow(commentId);

    if (comment.authorId !== userId) {
      throw new AppException(ErrorCode.FORBIDDEN, '본인이 작성한 댓글만 수정할 수 있습니다.');
    }

    await this.assertNoBannedWords(dto.content);

    const updated = await this.prisma.comment.update({
      where: { id: commentId },
      data: { content: dto.content },
      select: COMMENT_SELECT,
    });

    return this.toResponse(updated);
  }

  async remove(userId: string, userRole: string, commentId: string): Promise<void> {
    const comment = await this.findAliveOrThrow(commentId);

    const isOwner = comment.authorId === userId;
    const canDeleteAny = await this.permissionCheckService.hasAnyPermission(userRole, [
      PermissionCode.COMMENT_DELETE_ANY,
    ]);

    if (!isOwner && !canDeleteAny) {
      throw new AppException(ErrorCode.FORBIDDEN, '댓글을 삭제할 권한이 없습니다.');
    }

    await this.prisma.$transaction([
      this.prisma.comment.update({ where: { id: commentId }, data: { deletedAt: new Date() } }),
      this.prisma.post.update({ where: { id: comment.postId }, data: { commentCount: { decrement: 1 } } }),
    ]);

    await this.rankingService.applyEngagementDelta(comment.postId, -RANKING_WEIGHTS.COMMENT);
  }

  async findDeletedForAdmin(page: number, limit: number) {
    const where: Prisma.CommentWhereInput = { deletedAt: { not: null } };
    const [comments, total] = await Promise.all([
      this.prisma.comment.findMany({
        where,
        orderBy: { deletedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        select: COMMENT_SELECT,
      }),
      this.prisma.comment.count({ where }),
    ]);

    return { items: comments.map((comment) => this.toResponse(comment, true)), meta: { page, limit, total } };
  }

  /**
   * 관리자 전용 복구.
   * 데이터 무결성 정책: 게시글이 삭제된 상태에서는 그 게시글에 속한 댓글을 단독으로 복구할 수 없다.
   * (게시글 없이 댓글만 살아있는 상태를 허용하지 않기 위함 - 부모-자식 일관성 유지)
   * 반드시 게시글을 먼저 복구(`PostsService.restore`)한 뒤에만 댓글 복구가 가능하다.
   */
  async restore(commentId: string) {
    const comment = await this.prisma.comment.findUnique({ where: { id: commentId } });
    if (!comment) {
      throw new AppException(ErrorCode.COMMENT_NOT_FOUND);
    }
    if (!comment.deletedAt) {
      throw new AppException(ErrorCode.COMMENT_NOT_DELETED);
    }

    await this.assertParentPostRestored(comment.postId);

    const restored = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.comment.update({
        where: { id: commentId },
        data: { deletedAt: null },
        select: COMMENT_SELECT,
      });
      await tx.post.update({ where: { id: comment.postId }, data: { commentCount: { increment: 1 } } });
      return updated;
    });

    await this.rankingService.applyEngagementDelta(comment.postId, RANKING_WEIGHTS.COMMENT);

    return this.toResponse(restored);
  }

  /**
   * 게시글을 먼저 복구한 뒤, 그 게시글에 속한 삭제된 댓글을 한 번에 복구하는 편의 기능.
   * 개별 댓글마다 restore()를 반복 호출할 필요 없이, 관리자가 "게시글 복구 -> 댓글 일괄 복구"
   * 2단계 흐름을 한 번의 추가 동작으로 마칠 수 있게 한다.
   */
  async restoreAllForPost(postId: string): Promise<number> {
    await this.assertParentPostRestored(postId);

    const restoredCount = await this.prisma.$transaction(async (tx) => {
      const deletedComments = await tx.comment.findMany({
        where: { postId, deletedAt: { not: null } },
        select: { id: true },
      });

      if (deletedComments.length === 0) {
        return 0;
      }

      await tx.comment.updateMany({
        where: { id: { in: deletedComments.map((c) => c.id) } },
        data: { deletedAt: null },
      });
      await tx.post.update({
        where: { id: postId },
        data: { commentCount: { increment: deletedComments.length } },
      });

      return deletedComments.length;
    });

    if (restoredCount > 0) {
      await this.rankingService.applyEngagementDelta(postId, RANKING_WEIGHTS.COMMENT * restoredCount);
    }

    return restoredCount;
  }

  /** 게시글 자체가 삭제된 상태라면(Soft Delete) 댓글 복구를 거부한다 - 부모-자식 무결성 정책. */
  private async assertParentPostRestored(postId: string): Promise<void> {
    const post = await this.prisma.post.findUnique({ where: { id: postId } });
    if (!post) {
      throw new AppException(ErrorCode.POST_NOT_FOUND);
    }
    if (post.status === PostStatus.DELETED || post.deletedAt) {
      throw new AppException(ErrorCode.PARENT_POST_DELETED);
    }
  }

  private async findAliveOrThrow(commentId: string) {
    const comment = await this.prisma.comment.findUnique({ where: { id: commentId } });
    if (!comment || comment.deletedAt) {
      throw new AppException(ErrorCode.COMMENT_NOT_FOUND);
    }
    return comment;
  }

  private async assertPostExists(postId: string) {
    const post = await this.prisma.post.findUnique({ where: { id: postId } });
    if (!post || post.status !== PostStatus.PUBLISHED || post.deletedAt) {
      throw new AppException(ErrorCode.POST_NOT_FOUND);
    }
    return post;
  }

  /** 댓글 내용에 금칙어가 포함되어 있는지 검사한다 (10단계 Admin에서 만든 WordFilterService 재사용). */
  private async assertNoBannedWords(content: string): Promise<void> {
    const containsBannedWord = await this.wordFilterService.containsBannedWord(content);
    if (containsBannedWord) {
      throw new AppException(ErrorCode.CONTAINS_BANNED_WORD);
    }
  }

  private toResponse(comment: CommentRow, showRealContentWhenDeleted = false) {
    const isDeleted = comment.deletedAt !== null;

    return {
      id: comment.id,
      postId: comment.postId,
      parentId: comment.parentId,
      authorId: comment.authorId,
      authorNickname: comment.author.nickname,
      authorProfileImageUrl: comment.author.profileImageUrl,
      content: isDeleted && !showRealContentWhenDeleted ? DELETED_COMMENT_PLACEHOLDER : comment.content,
      isDeleted,
      likeCount: comment.likeCount,
      replyCount: comment._count.replies,
      createdAt: comment.createdAt,
      updatedAt: comment.updatedAt,
    };
  }
}
