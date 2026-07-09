import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { RedisService } from '../../infra/redis/redis.service';
import { AppException } from '../../common/exceptions/app.exception';
import { ErrorCode } from '../../common/constants/error-codes';
import { CreateBoardDto, UpdateBoardDto } from './dto/board.dto';

// CategoriesService의 공개 목록 캐시 키와 동일해야 한다 - 게시판이 카테고리 응답에 중첩되어
// 함께 캐싱되므로, 게시판 쪽 변경도 이 캐시를 무효화해야 한다.
const PUBLIC_CATEGORIES_CACHE_KEY = 'categories:public';

@Injectable()
export class BoardsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  async findBySlugPublic(slug: string) {
    const board = await this.prisma.board.findUnique({ where: { slug } });

    // 비활성 게시판은 일반 사용자에게 404와 동일하게 처리한다 (운영 준비 중인 게시판 숨김).
    if (!board || !board.isActive) {
      throw new AppException(ErrorCode.BOARD_NOT_FOUND);
    }

    return board;
  }

  async findAllForAdmin() {
    return this.prisma.board.findMany({
      orderBy: [{ categoryId: 'asc' }, { sortOrder: 'asc' }],
    });
  }

  async create(dto: CreateBoardDto) {
    await this.assertCategoryExists(dto.categoryId);
    await this.assertSlugAvailable(dto.slug);

    const created = await this.prisma.board.create({
      data: {
        categoryId: dto.categoryId,
        name: dto.name,
        slug: dto.slug,
        description: dto.description,
        sortOrder: dto.sortOrder ?? 0,
        isActive: dto.isActive ?? true,
      },
    });

    await this.invalidateCategoriesCache();

    return created;
  }

  /**
   * categoryId를 함께 넘기면 게시판을 다른 카테고리로 이동시킨다.
   * Board.id와 게시글의 Post.boardId는 전혀 변경되지 않으므로, 이동 후에도
   * 해당 게시판에 속한 모든 게시글은 그대로 유지된다 (게시판의 소속 카테고리 정보만 바뀜).
   */
  async update(id: string, dto: UpdateBoardDto) {
    await this.findByIdOrThrow(id);

    if (dto.categoryId !== undefined) {
      await this.assertCategoryExists(dto.categoryId);
    }
    if (dto.slug !== undefined) {
      await this.assertSlugAvailable(dto.slug, id);
    }

    const updated = await this.prisma.board.update({
      where: { id },
      data: {
        ...(dto.categoryId !== undefined ? { categoryId: dto.categoryId } : {}),
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.slug !== undefined ? { slug: dto.slug } : {}),
        ...(dto.description !== undefined ? { description: dto.description } : {}),
        ...(dto.sortOrder !== undefined ? { sortOrder: dto.sortOrder } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
      },
    });

    await this.invalidateCategoriesCache();

    return updated;
  }

  async remove(id: string): Promise<void> {
    await this.findByIdOrThrow(id);

    const postCount = await this.prisma.post.count({ where: { boardId: id } });
    if (postCount > 0) {
      throw new AppException(ErrorCode.BOARD_HAS_POSTS);
    }

    await this.prisma.board.delete({ where: { id } });
    await this.invalidateCategoriesCache();
  }

  private async invalidateCategoriesCache(): Promise<void> {
    await this.redis.delete(PUBLIC_CATEGORIES_CACHE_KEY);
  }

  private async findByIdOrThrow(id: string) {
    const board = await this.prisma.board.findUnique({ where: { id } });
    if (!board) {
      throw new AppException(ErrorCode.BOARD_NOT_FOUND);
    }
    return board;
  }

  private async assertCategoryExists(categoryId: string): Promise<void> {
    const category = await this.prisma.category.findUnique({ where: { id: categoryId } });
    if (!category) {
      throw new AppException(ErrorCode.CATEGORY_NOT_FOUND);
    }
  }

  private async assertSlugAvailable(slug: string, excludeId?: string): Promise<void> {
    const existing = await this.prisma.board.findUnique({ where: { slug } });
    if (existing && existing.id !== excludeId) {
      throw new AppException(ErrorCode.BOARD_SLUG_ALREADY_EXISTS);
    }
  }
}
