import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../infra/prisma/prisma.service';

const MAX_TAGS_PER_POST = 5;
const MAX_TAG_NAME_LENGTH = 30;

/**
 * 게시글의 태그 목록을 동기화한다 (생성/수정 공통).
 * 태그명을 정규화(소문자, 트림)하고, Tag 테이블에 없으면 생성 + usageCount 증가,
 * 기존에 있던 태그 중 새 목록에서 빠진 것은 usageCount 감소 후 연결만 해제한다
 * (Tag row 자체는 삭제하지 않음 - 다른 게시글이 여전히 참조할 수 있고,
 *  usageCount=0이 되어도 태그 자동완성/인기 태그 집계에 남겨두는 것이 유용하기 때문).
 */
@Injectable()
export class TagsService {
  constructor(private readonly prisma: PrismaService) {}

  /** 인기 태그 목록 (usageCount 내림차순). 태그 중심 탐색/사이드바 노출에 사용. */
  async findPopular(limit = 30): Promise<Array<{ name: string; usageCount: number }>> {
    return this.prisma.tag.findMany({
      where: { usageCount: { gt: 0 } },
      orderBy: { usageCount: 'desc' },
      take: limit,
      select: { name: true, usageCount: true },
    });
  }

  normalizeTagNames(rawTags: string[] | undefined): string[] {
    if (!rawTags) return [];

    const normalized = Array.from(
      new Set(
        rawTags
          .map((tag) => tag.trim().toLowerCase())
          .filter((tag) => tag.length > 0 && tag.length <= MAX_TAG_NAME_LENGTH),
      ),
    );

    return normalized.slice(0, MAX_TAGS_PER_POST);
  }

  get maxTagsPerPost(): number {
    return MAX_TAGS_PER_POST;
  }

  /** 반드시 트랜잭션(tx) 내에서 게시글 생성/수정과 함께 호출한다. */
  async syncPostTags(tx: Prisma.TransactionClient, postId: string, tagNames: string[]): Promise<void> {
    const existingLinks = await tx.postTag.findMany({
      where: { postId },
      include: { tag: true },
    });
    const existingTagNames = new Set(existingLinks.map((link) => link.tag.name));
    const nextTagNames = new Set(tagNames);

    const toRemove = existingLinks.filter((link) => !nextTagNames.has(link.tag.name));
    const toAddNames = tagNames.filter((name) => !existingTagNames.has(name));

    for (const link of toRemove) {
      await tx.postTag.delete({ where: { postId_tagId: { postId, tagId: link.tagId } } });
      await tx.tag.update({
        where: { id: link.tagId },
        data: { usageCount: { decrement: 1 } },
      });
    }

    for (const name of toAddNames) {
      const tag = await tx.tag.upsert({
        where: { name },
        update: { usageCount: { increment: 1 } },
        create: { name, usageCount: 1 },
      });
      await tx.postTag.create({ data: { postId, tagId: tag.id } });
    }
  }

  /** 게시글 삭제 시 연결된 모든 태그의 usageCount를 되돌린다. */
  async releaseAllPostTags(tx: Prisma.TransactionClient, postId: string): Promise<void> {
    const links = await tx.postTag.findMany({ where: { postId } });
    for (const link of links) {
      await tx.tag.update({ where: { id: link.tagId }, data: { usageCount: { decrement: 1 } } });
    }
    await tx.postTag.deleteMany({ where: { postId } });
  }
}
