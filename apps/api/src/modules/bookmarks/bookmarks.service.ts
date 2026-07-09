import { Injectable } from '@nestjs/common';
import { PostStatus } from '@prisma/client';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { AppException } from '../../common/exceptions/app.exception';
import { ErrorCode } from '../../common/constants/error-codes';

const BOOKMARK_LIST_SELECT = {
  id: true,
  createdAt: true,
  post: {
    select: {
      id: true,
      title: true,
      excerpt: true,
      viewCount: true,
      likeCount: true,
      commentCount: true,
      createdAt: true,
      board: { select: { name: true, slug: true } },
      author: { select: { nickname: true, profileImageUrl: true } },
    },
  },
} as const;

/**
 * 북마크는 현재 게시글만 지원한다 (스키마상 `Bookmark.postId` 단일 참조, 다형성 아님).
 *
 * 향후 댓글 등 다른 대상으로 확장이 필요해지면, 물리 스키마를 아래와 같이 바꾸는 경로를 권장한다
 * (지금 당장 구현하지는 않는다 - 실제 요구가 생겼을 때 마이그레이션):
 *   1) `Bookmark`를 `Reaction`과 동일한 다형성 패턴(targetType/targetId)으로 전환
 *      (`postId` 컬럼 대신 `targetType: BookmarkTargetType`, `targetId: string`)
 *   2) 대상 존재 검증은 이미 만들어 둔 `TargetValidatorRegistry`(6단계에서 도입)를
 *      Reactions와 동일하게 그대로 재사용 - 새 검증기 등록 없이 'POST'/'COMMENT' 키를 공유 가능
 *   3) 기존 `postId` 기반 데이터는 `targetType='POST', targetId=postId`로 백필 마이그레이션
 * 이 경로를 미리 문서화해 두는 것만으로, 실제 확장 시점에 설계를 처음부터 다시 고민할 필요가 없다.
 */
@Injectable()
export class BookmarksService {
  constructor(private readonly prisma: PrismaService) {}

  /** 이미 북마크되어 있어도 에러 없이 그대로 둔다 (멱등). */
  async add(userId: string, postId: string): Promise<void> {
    const post = await this.prisma.post.findUnique({ where: { id: postId } });
    if (!post || post.status !== PostStatus.PUBLISHED || post.deletedAt) {
      throw new AppException(ErrorCode.POST_NOT_FOUND);
    }

    await this.prisma.bookmark.upsert({
      where: { userId_postId: { userId, postId } },
      update: {},
      create: { userId, postId },
    });
  }

  /** 북마크되어 있지 않아도 에러 없이 그대로 둔다 (멱등). */
  async remove(userId: string, postId: string): Promise<void> {
    await this.prisma.bookmark.deleteMany({ where: { userId, postId } });
  }

  async listMine(userId: string, page: number, limit: number) {
    const where = { userId };
    const [bookmarks, total] = await Promise.all([
      this.prisma.bookmark.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        select: BOOKMARK_LIST_SELECT,
      }),
      this.prisma.bookmark.count({ where }),
    ]);

    return {
      items: bookmarks.map((bookmark) => ({
        bookmarkedAt: bookmark.createdAt,
        postId: bookmark.post.id,
        title: bookmark.post.title,
        excerpt: bookmark.post.excerpt ?? '',
        boardName: bookmark.post.board.name,
        boardSlug: bookmark.post.board.slug,
        authorNickname: bookmark.post.author.nickname,
        authorProfileImageUrl: bookmark.post.author.profileImageUrl,
        viewCount: bookmark.post.viewCount,
        likeCount: bookmark.post.likeCount,
        commentCount: bookmark.post.commentCount,
        createdAt: bookmark.post.createdAt,
      })),
      meta: { page, limit, total },
    };
  }
}
