import { Injectable } from '@nestjs/common';
import { Prisma, PostStatus } from '@prisma/client';
import sanitizeHtml from 'sanitize-html';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { MarkdownService } from '../../infra/markdown/markdown.service';
import { BlockService } from '../blocks/block.service';
import { AttachmentsService } from '../attachments/attachments.service';
import { PermissionCheckService } from '../../common/services/permission-check.service';
import { PermissionCode } from '../../common/constants/permission-codes';
import { AppException } from '../../common/exceptions/app.exception';
import { ErrorCode } from '../../common/constants/error-codes';
import { WordFilterService } from '../admin/word-filter/word-filter.service';
import { TagsService } from './services/tags.service';
import { PostViewService } from './services/post-view.service';
import { PostsSearchRepository } from './services/posts-search.repository';
import { RankingService, RankingPeriod } from '../ranking/ranking.service';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { QueryPostDto } from './dto/query-post.dto';
import { RankingType } from './dto/ranking-query.dto';

const EXCERPT_LENGTH = 150;

/**
 * 목록 조회 전용 select. `content`/`contentHtml`을 아예 조회하지 않아
 * 목록 API가 본문 전체를 DB에서 가져오지 않도록 한다 (성능 최적화).
 * 미리보기는 작성/수정 시 미리 계산해 저장해 둔 `excerpt` 컬럼을 그대로 사용한다.
 */
const LIST_SELECT = {
  id: true,
  boardId: true,
  board: { select: { name: true, slug: true } },
  authorId: true,
  author: { select: { nickname: true, profileImageUrl: true } },
  title: true,
  excerpt: true,
  viewCount: true,
  likeCount: true,
  dislikeCount: true,
  commentCount: true,
  isNotice: true,
  postTags: { select: { tag: { select: { name: true } } } },
  createdAt: true,
  // status/deletedAt은 목록 응답(DTO)에는 노출되지 않지만(toListItem에서 매핑 안 함),
  // fetchPublishedPostOrThrow() 등 내부 검증 로직이 이 값을 필요로 해서 select에 포함해야 한다.
  // 실제 Prisma Client가 생성되는 배포 환경에서만 드러나는 타입 오류였다(샌드박스는 Prisma
  // 엔진 다운로드가 막혀 있어 이 누락을 컴파일 타임에 잡아내지 못했다).
  status: true,
  deletedAt: true,
} satisfies Prisma.PostSelect;

/** 상세 조회 전용 select. 목록 select에 본문/첨부파일/수정일시를 더한다. */
const DETAIL_SELECT = {
  ...LIST_SELECT,
  content: true,
  contentHtml: true,
  attachments: { select: { id: true, fileUrl: true, fileType: true } },
  updatedAt: true,
} satisfies Prisma.PostSelect;

type PostListRow = Prisma.PostGetPayload<{ select: typeof LIST_SELECT }>;
type PostDetailRow = Prisma.PostGetPayload<{ select: typeof DETAIL_SELECT }>;

@Injectable()
export class PostsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly markdownService: MarkdownService,
    private readonly blockService: BlockService,
    private readonly attachmentsService: AttachmentsService,
    private readonly tagsService: TagsService,
    private readonly postViewService: PostViewService,
    private readonly postsSearchRepository: PostsSearchRepository,
    private readonly permissionCheckService: PermissionCheckService,
    private readonly wordFilterService: WordFilterService,
    private readonly rankingService: RankingService,
  ) {}

  async findAll(query: QueryPostDto, viewerId?: string) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const blockedAuthorIds = viewerId ? await this.blockService.getBlockedUserIds(viewerId) : [];

    if (query.keyword) {
      return this.searchByKeyword(query.keyword, skip, limit, blockedAuthorIds);
    }

    const where: Prisma.PostWhereInput = {
      status: PostStatus.PUBLISHED,
      deletedAt: null,
      ...(query.boardId ? { boardId: query.boardId } : {}),
      ...(query.tag ? { postTags: { some: { tag: { name: query.tag } } } } : {}),
      ...(query.category ? { board: { category: { slug: query.category } } } : {}),
      ...(query.tags
        ? {
            postTags: {
              some: {
                tag: {
                  name: {
                    in: query.tags
                      .split(',')
                      .map((name) => name.trim())
                      .filter((name) => name.length > 0),
                  },
                },
              },
            },
          }
        : {}),
      ...(blockedAuthorIds.length > 0 ? { authorId: { notIn: blockedAuthorIds } } : {}),
    };

    // 'popular' 정렬은 임시로 추천수 기준이다. 시간 가중치를 반영한 진짜 인기글 랭킹(Redis ZSET)은
    // 12단계(Performance)에서 구현하며, 이때 이 정렬 분기를 랭킹 조회로 교체한다.
    const orderBy: Prisma.PostOrderByWithRelationInput[] =
      query.sort === 'popular'
        ? [{ likeCount: 'desc' }, { createdAt: 'desc' }]
        : [{ isNotice: 'desc' }, { createdAt: 'desc' }];

    const [posts, total] = await Promise.all([
      this.prisma.post.findMany({ where, orderBy, skip, take: limit, select: LIST_SELECT }),
      this.prisma.post.count({ where }),
    ]);

    return {
      items: posts.map((post) => this.toListItem(post)),
      meta: { page, limit, total },
    };
  }

  /** SearchService의 자동완성이 이 메서드를 통해서만 검색 저장소에 접근한다 (SearchRepository 추상화 유지). */
  async autocompleteTitles(prefix: string, limit: number) {
    return this.postsSearchRepository.autocompleteTitles(prefix, limit);
  }

  /**
   * 주어진 id 순서를 그대로 보존해 게시글을 조회한다. 검색(searchByKeyword)에서 이미 쓰던
   * "정렬 순서 보존" 패턴을 재사용한 것으로, 12단계 랭킹 시스템(RankingService)이
   * Redis ZSET에서 뽑아온 postId 순서대로 게시글 데이터를 가져올 때 사용한다.
   */
  async findManyByIds(ids: string[], viewerId?: string) {
    if (ids.length === 0) return [];

    const blockedAuthorIds = viewerId ? await this.blockService.getBlockedUserIds(viewerId) : [];

    const posts = await this.prisma.post.findMany({
      where: {
        id: { in: ids },
        status: PostStatus.PUBLISHED,
        deletedAt: null,
        ...(blockedAuthorIds.length > 0 ? { authorId: { notIn: blockedAuthorIds } } : {}),
      },
      select: LIST_SELECT,
    });

    const postsById = new Map(posts.map((post) => [post.id, post]));
    return ids.map((id) => postsById.get(id)).filter((post): post is PostListRow => Boolean(post)).map((post) => this.toListItem(post));
  }

  /**
   * 범용 랭킹 조회. type=hot은 시간 가중치 랭킹(RankingService)을, 나머지는 해당 카운트
   * 내림차순을 반환한다(period가 있으면 그 기간 내 작성글로 한정). 결과는 목록 아이템 배열이다.
   */
  async findRanking(type: RankingType, period: RankingPeriod | undefined, limit: number, viewerId?: string) {
    if (type === 'hot') {
      const ids = await this.rankingService.getTopPostIds(period ?? 'daily', limit);
      return this.findManyByIds(ids, viewerId);
    }

    const blockedAuthorIds = viewerId ? await this.blockService.getBlockedUserIds(viewerId) : [];
    const windowStart = period ? this.rankingWindowStart(period) : undefined;

    const orderBy: Prisma.PostOrderByWithRelationInput[] = [
      type === 'views'
        ? { viewCount: 'desc' }
        : type === 'comments'
          ? { commentCount: 'desc' }
          : { likeCount: 'desc' },
      { createdAt: 'desc' },
    ];

    const posts = await this.prisma.post.findMany({
      where: {
        status: PostStatus.PUBLISHED,
        deletedAt: null,
        ...(windowStart ? { createdAt: { gte: windowStart } } : {}),
        ...(blockedAuthorIds.length > 0 ? { authorId: { notIn: blockedAuthorIds } } : {}),
      },
      orderBy,
      take: limit,
      select: LIST_SELECT,
    });

    return posts.map((post) => this.toListItem(post));
  }

  private rankingWindowStart(period: RankingPeriod): Date {
    const hours = period === 'daily' ? 24 : period === 'weekly' ? 24 * 7 : 24 * 30;
    return new Date(Date.now() - hours * 60 * 60 * 1000);
  }

  private async searchByKeyword(
    keyword: string,
    skip: number,
    limit: number,
    blockedAuthorIds: string[],
  ) {
    const [ids, total] = await Promise.all([
      this.postsSearchRepository.searchIds(keyword, skip, limit),
      this.postsSearchRepository.countMatches(keyword),
    ]);

    if (ids.length === 0) {
      return { items: [], meta: { page: Math.floor(skip / limit) + 1, limit, total } };
    }

    const posts = await this.prisma.post.findMany({
      where: {
        id: { in: ids },
        ...(blockedAuthorIds.length > 0 ? { authorId: { notIn: blockedAuthorIds } } : {}),
      },
      select: LIST_SELECT,
    });

    // ts_rank 순서를 유지하기 위해 검색 결과 순서(ids)에 맞춰 재정렬한다 (Prisma의 findMany는 순서를 보장하지 않음).
    const postsById = new Map(posts.map((post) => [post.id, post]));
    const ordered = ids.map((id) => postsById.get(id)).filter((post): post is PostListRow => Boolean(post));

    return {
      items: ordered.map((post) => this.toListItem(post)),
      meta: { page: Math.floor(skip / limit) + 1, limit, total },
    };
  }

  async findOne(id: string, viewerId?: string) {
    const post = await this.fetchPublishedPostOrThrow(id, viewerId);

    await this.postViewService.recordView(id);

    return this.toDetail(post);
  }

  /** create/update 직후 결과를 반환할 때 사용 - 작성/수정 자체가 "조회"로 집계되지 않도록 조회수는 건드리지 않는다. */
  private async fetchDetailWithoutRecordingView(id: string, viewerId?: string) {
    const post = await this.fetchPublishedPostOrThrow(id, viewerId);
    return this.toDetail(post);
  }

  private async fetchPublishedPostOrThrow(id: string, viewerId?: string): Promise<PostDetailRow> {
    const post = await this.prisma.post.findUnique({ where: { id }, select: DETAIL_SELECT });

    if (!post || post.status !== PostStatus.PUBLISHED || post.deletedAt) {
      throw new AppException(ErrorCode.POST_NOT_FOUND);
    }

    if (viewerId) {
      const isBlocked = await this.blockService.isBlocked(viewerId, post.authorId);
      if (isBlocked) {
        throw new AppException(ErrorCode.POST_NOT_FOUND);
      }
    }

    return post;
  }

  async create(userId: string, dto: CreatePostDto) {
    await this.assertBoardActive(dto.boardId);
    await this.assertNoBannedWords(dto.title, dto.content);

    const contentHtml = this.markdownService.render(dto.content);
    const excerpt = this.buildExcerpt(contentHtml);
    const tagNames = this.tagsService.normalizeTagNames(dto.tags);

    const created = await this.prisma.$transaction(async (tx) => {
      const post = await tx.post.create({
        data: {
          boardId: dto.boardId,
          authorId: userId,
          title: dto.title,
          content: dto.content,
          contentHtml,
          excerpt,
        },
      });

      await this.tagsService.syncPostTags(tx, post.id, tagNames);

      if (dto.attachmentIds && dto.attachmentIds.length > 0) {
        await this.attachmentsService.linkToPost(tx, userId, dto.attachmentIds, post.id);
      }

      return post;
    });

    return this.fetchDetailWithoutRecordingView(created.id, userId);
  }

  async update(userId: string, postId: string, dto: UpdatePostDto) {
    const post = await this.findEditableOrThrow(postId);

    if (post.authorId !== userId) {
      throw new AppException(ErrorCode.FORBIDDEN, '본인이 작성한 게시글만 수정할 수 있습니다.');
    }

    if (dto.boardId) {
      await this.assertBoardActive(dto.boardId);
    }

    await this.assertNoBannedWords(dto.title, dto.content);

    const contentHtml = dto.content !== undefined ? this.markdownService.render(dto.content) : undefined;
    const excerpt = contentHtml !== undefined ? this.buildExcerpt(contentHtml) : undefined;
    const tagNames = dto.tags !== undefined ? this.tagsService.normalizeTagNames(dto.tags) : undefined;

    await this.prisma.$transaction(async (tx) => {
      await tx.post.update({
        where: { id: postId },
        data: {
          ...(dto.boardId !== undefined ? { boardId: dto.boardId } : {}),
          ...(dto.title !== undefined ? { title: dto.title } : {}),
          ...(dto.content !== undefined ? { content: dto.content, contentHtml, excerpt } : {}),
        },
      });

      if (tagNames !== undefined) {
        await this.tagsService.syncPostTags(tx, postId, tagNames);
      }

      // attachmentIds는 "추가 목록"이 아니라 "최종 목록"이다: 빠진 첨부파일은 삭제, 새로 포함된 것은 연결된다.
      // 필드 자체가 요청에 없으면(undefined) 첨부파일 구성을 그대로 둔다.
      if (dto.attachmentIds !== undefined) {
        await this.attachmentsService.syncPostAttachments(tx, userId, postId, dto.attachmentIds);
      }
    });

    return this.fetchDetailWithoutRecordingView(postId, userId);
  }

  /**
   * Soft Delete: status=DELETED + deletedAt만 기록하고 row는 유지한다 (6단계 정책).
   * 본인 게시글이거나, POST_DELETE_ANY 권한(모더레이터/관리자)이 있어야 삭제할 수 있다.
   */
  async remove(userId: string, userRole: string, postId: string): Promise<void> {
    const post = await this.findEditableOrThrow(postId);

    const isOwner = post.authorId === userId;
    const canDeleteAny = await this.permissionCheckService.hasAnyPermission(userRole, [
      PermissionCode.POST_DELETE_ANY,
    ]);

    if (!isOwner && !canDeleteAny) {
      throw new AppException(ErrorCode.FORBIDDEN, '게시글을 삭제할 권한이 없습니다.');
    }

    await this.prisma.post.update({
      where: { id: postId },
      data: { status: PostStatus.DELETED, deletedAt: new Date() },
    });
  }

  // ===================== 관리자 전용 - 복구 =====================

  /** 관리자 전용. 일반 사용자는 삭제 후 복구할 수 없다 (컨트롤러에서 @Roles('ADMIN','SUPER_ADMIN')로 이미 제한). */
  async findDeletedForAdmin(page: number, limit: number) {
    const where: Prisma.PostWhereInput = { status: PostStatus.DELETED };
    const [posts, total] = await Promise.all([
      this.prisma.post.findMany({
        where,
        orderBy: { deletedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        select: LIST_SELECT,
      }),
      this.prisma.post.count({ where }),
    ]);

    return { items: posts.map((post) => this.toListItem(post)), meta: { page, limit, total } };
  }

  /** 관리자 전용 복구. 삭제되지 않은 게시글을 복구하려 하면 거부한다. */
  async restore(postId: string) {
    const post = await this.prisma.post.findUnique({ where: { id: postId } });
    if (!post) {
      throw new AppException(ErrorCode.POST_NOT_FOUND);
    }
    if (post.status !== PostStatus.DELETED) {
      throw new AppException(ErrorCode.POST_NOT_DELETED);
    }

    await this.prisma.post.update({
      where: { id: postId },
      data: { status: PostStatus.PUBLISHED, deletedAt: null },
    });

    return this.fetchDetailWithoutRecordingView(postId);
  }

  /**
   * 공지 설정/해제. 관리자 전용(AdminNoticesController에서 Role/Permission 가드).
   * 실제 알림 발송(전체 회원 브로드캐스트)은 이 메서드를 호출하는 쪽(AdminNoticesService)에서
   * NotificationsService.broadcastNotice()를 통해 별도로 트리거한다 - PostsService는
   * Notifications 모듈을 알 필요가 없도록 관심사를 분리했다.
   */
  async setNoticeStatus(postId: string, isNotice: boolean) {
    const post = await this.findEditableOrThrow(postId);

    await this.prisma.post.update({ where: { id: post.id }, data: { isNotice } });

    return this.fetchDetailWithoutRecordingView(postId);
  }

  private async findEditableOrThrow(postId: string) {
    const post = await this.prisma.post.findUnique({ where: { id: postId } });
    if (!post || post.deletedAt || post.status === PostStatus.DELETED) {
      throw new AppException(ErrorCode.POST_NOT_FOUND);
    }
    return post;
  }

  private async assertBoardActive(boardId: string): Promise<void> {
    const board = await this.prisma.board.findUnique({ where: { id: boardId } });
    if (!board || !board.isActive) {
      throw new AppException(ErrorCode.BOARD_NOT_FOUND);
    }
  }

  /**
   * 제목/본문에 금칙어가 포함되어 있는지 검사한다 (10단계 Admin에서 만든 WordFilterService 재사용).
   * title/content가 undefined면(수정 시 해당 필드를 바꾸지 않은 경우) 그 필드는 검사하지 않는다.
   */
  private async assertNoBannedWords(title?: string, content?: string): Promise<void> {
    const textToCheck = [title, content].filter((value): value is string => value !== undefined).join(' ');
    if (!textToCheck) return;

    const containsBannedWord = await this.wordFilterService.containsBannedWord(textToCheck);
    if (containsBannedWord) {
      throw new AppException(ErrorCode.CONTAINS_BANNED_WORD);
    }
  }

  private buildExcerpt(contentHtml: string): string {
    const text = sanitizeHtml(contentHtml, { allowedTags: [], allowedAttributes: {} }).replace(/\s+/g, ' ').trim();
    return text.length > EXCERPT_LENGTH ? `${text.slice(0, EXCERPT_LENGTH)}…` : text;
  }

  private toListItem(post: PostListRow) {
    return {
      id: post.id,
      boardId: post.boardId,
      boardName: post.board.name,
      boardSlug: post.board.slug,
      authorId: post.authorId,
      authorNickname: post.author.nickname,
      authorProfileImageUrl: post.author.profileImageUrl,
      title: post.title,
      excerpt: post.excerpt ?? '',
      viewCount: post.viewCount,
      likeCount: post.likeCount,
      dislikeCount: post.dislikeCount,
      commentCount: post.commentCount,
      isNotice: post.isNotice,
      tags: post.postTags.map((postTag) => postTag.tag.name),
      createdAt: post.createdAt,
    };
  }

  private toDetail(post: PostDetailRow) {
    return {
      ...this.toListItem(post),
      content: post.content,
      contentHtml: post.contentHtml ?? '',
      attachments: post.attachments.map((attachment) => ({
        id: attachment.id,
        fileUrl: attachment.fileUrl,
        fileType: attachment.fileType,
      })),
      updatedAt: post.updatedAt,
    };
  }
}
