import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { RedisService } from '../../infra/redis/redis.service';
import { AppException } from '../../common/exceptions/app.exception';
import { ErrorCode } from '../../common/constants/error-codes';
import { CreateCategoryDto, UpdateCategoryDto } from './dto/category.dto';
import { applyCategorySeed } from './category-seed';

const PUBLIC_CATEGORIES_CACHE_KEY = 'categories:public';
const PUBLIC_CATEGORIES_CACHE_TTL_SECONDS = 60;

@Injectable()
export class CategoriesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  /**
   * 공개 카테고리 목록. 비활성화(isActive=false) 게시판은 일반 사용자에게 노출하지 않는다
   * (운영자가 준비 중인 게시판을 만들어 두고 공개 전까지 숨겨둘 수 있게 하기 위함).
   *
   * 12단계(Performance): 거의 모든 페이지에서 호출되는 홈 화면성 데이터이자 쓰기 빈도가
   * 매우 낮으므로(카테고리/게시판은 운영자만 가끔 바꿈) Redis에 60초 캐싱한다.
   * 이 서비스에서의 변경(생성/수정/삭제)은 즉시 캐시를 무효화하고, 게시판 쪽(BoardsService)의
   * isActive 토글처럼 이 서비스가 알 수 없는 변경은 60초 TTL이 안전망 역할을 한다.
   */
  async findAllPublic() {
    const cached = await this.redis.getJson<unknown>(PUBLIC_CATEGORIES_CACHE_KEY);
    if (cached) {
      return cached;
    }

    const categories = await this.prisma.category.findMany({
      where: { isActive: true },
      orderBy: { menuOrder: 'asc' },
      include: {
        boards: {
          where: { isActive: true },
          orderBy: { sortOrder: 'asc' },
        },
      },
    });

    await this.redis.setJson(PUBLIC_CATEGORIES_CACHE_KEY, categories, PUBLIC_CATEGORIES_CACHE_TTL_SECONDS);

    return categories;
  }

  /** 관리자용 - 비활성 게시판을 포함한 전체 목록 (캐싱하지 않음 - 최신 상태 확인이 목적) */
  async findAllForAdmin() {
    return this.prisma.category.findMany({
      orderBy: { menuOrder: 'asc' },
      include: { boards: { orderBy: { sortOrder: 'asc' } } },
    });
  }

  async create(dto: CreateCategoryDto) {
    await this.assertSlugAvailable(dto.slug);

    const created = await this.prisma.category.create({
      data: {
        name: dto.name,
        slug: dto.slug,
        sortOrder: dto.sortOrder ?? 0,
        icon: dto.icon,
        menuOrder: dto.menuOrder ?? 0,
        isPrimaryMenu: dto.isPrimaryMenu ?? false,
        isActive: dto.isActive ?? true,
      },
    });

    await this.invalidatePublicCache();

    return created;
  }

  async update(id: string, dto: UpdateCategoryDto) {
    await this.findByIdOrThrow(id);

    if (dto.slug !== undefined) {
      await this.assertSlugAvailable(dto.slug, id);
    }

    const updated = await this.prisma.category.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.slug !== undefined ? { slug: dto.slug } : {}),
        ...(dto.sortOrder !== undefined ? { sortOrder: dto.sortOrder } : {}),
        ...(dto.icon !== undefined ? { icon: dto.icon } : {}),
        ...(dto.menuOrder !== undefined ? { menuOrder: dto.menuOrder } : {}),
        ...(dto.isPrimaryMenu !== undefined ? { isPrimaryMenu: dto.isPrimaryMenu } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
      },
    });

    await this.invalidatePublicCache();

    return updated;
  }

  async remove(id: string): Promise<void> {
    await this.findByIdOrThrow(id);

    const boardCount = await this.prisma.board.count({ where: { categoryId: id } });
    if (boardCount > 0) {
      throw new AppException(ErrorCode.CATEGORY_HAS_BOARDS);
    }

    await this.prisma.category.delete({ where: { id } });
    await this.invalidatePublicCache();
  }

  /**
   * 관리자 초기화: 시드 스크립트(prisma/seed.ts)와 동일한 DEFAULT_CATEGORY_SEED로
   * 카테고리/게시판을 재구성한다(멱등). PrismaService는 PrismaClient를 상속하므로 그대로 전달한다.
   */
  async resetToDefault(): Promise<void> {
    await applyCategorySeed(this.prisma);
    await this.invalidatePublicCache();
  }

  private async invalidatePublicCache(): Promise<void> {
    await this.redis.delete(PUBLIC_CATEGORIES_CACHE_KEY);
  }

  private async findByIdOrThrow(id: string) {
    const category = await this.prisma.category.findUnique({ where: { id } });
    if (!category) {
      throw new AppException(ErrorCode.CATEGORY_NOT_FOUND);
    }
    return category;
  }

  private async assertSlugAvailable(slug: string, excludeId?: string): Promise<void> {
    const existing = await this.prisma.category.findUnique({ where: { slug } });
    if (existing && existing.id !== excludeId) {
      throw new AppException(ErrorCode.CATEGORY_SLUG_ALREADY_EXISTS);
    }
  }
}
