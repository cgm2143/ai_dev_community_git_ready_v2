import { Inject, Injectable } from '@nestjs/common';
import { AiAnalysisType, PostStatus, Prisma, TagType } from '@prisma/client';
import { PinoLogger } from 'nestjs-pino';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { AI_PROVIDER, AiProvider } from './provider/ai-provider.interface';
import { AiSummaryQueueService } from './queue/ai-summary-queue.service';

export type SummaryStatus = 'ready' | 'pending' | 'unavailable';

export interface SummaryResponse {
  status: SummaryStatus;
  summary?: string;
}

const MAX_SUGGESTED_TAGS = 5;
const MAX_TAG_LENGTH = 30;
const EXISTING_TAG_SAMPLE = 50;

/**
 * AI 요약 캐시(AiAnalysis SUMMARY)와 태그 추천을 담당한다. 실제 모델 호출은 주입된 AiProvider가 맡고,
 * 이 서비스는 캐시/큐/후처리(정규화·FEATURE 태그 제외)만 책임진다. Provider가 Stub이면 요약은 'unavailable'.
 */
@Injectable()
export class AiAnalysisService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(AI_PROVIDER) private readonly aiProvider: AiProvider,
    private readonly summaryQueue: AiSummaryQueueService,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(AiAnalysisService.name);
  }

  /**
   * 캐시된 요약이 있으면 즉시 반환하고, 없으면 생성 작업만 큐에 등록한 뒤 'pending'을 반환한다.
   * 프론트는 'pending'인 동안 폴링으로 완료를 확인한다. AI가 비활성(Stub)이면 'unavailable'.
   */
  async getOrQueueSummary(postId: string): Promise<SummaryResponse> {
    const cached = await this.prisma.aiAnalysis.findFirst({
      where: { postId, type: AiAnalysisType.SUMMARY },
      orderBy: { createdAt: 'desc' },
    });

    if (cached) {
      const summary = this.readSummary(cached.result);
      return summary ? { status: 'ready', summary } : { status: 'unavailable' };
    }

    if (this.aiProvider.name === 'stub') {
      return { status: 'unavailable' };
    }

    // 게시글이 실제로 존재/게시 상태일 때만 작업을 등록한다.
    const post = await this.prisma.post.findFirst({
      where: { id: postId, status: PostStatus.PUBLISHED, deletedAt: null },
      select: { id: true },
    });
    if (!post) {
      return { status: 'unavailable' };
    }

    await this.summaryQueue.enqueue(postId);
    return { status: 'pending' };
  }

  /** BullMQ Worker가 호출한다. 원문을 읽어 요약을 생성하고 AiAnalysis에 저장한다(이미 있으면 건너뜀). */
  async generateSummaryForPost(postId: string): Promise<void> {
    const existing = await this.prisma.aiAnalysis.findFirst({
      where: { postId, type: AiAnalysisType.SUMMARY },
      select: { id: true },
    });
    if (existing) return;

    const post = await this.prisma.post.findFirst({
      where: { id: postId, status: PostStatus.PUBLISHED, deletedAt: null },
      select: { title: true, content: true },
    });
    if (!post) return;

    const { summary } = await this.aiProvider.summarize({ title: post.title, content: post.content });
    if (!summary) {
      // 빈 요약을 캐싱하면 영구적으로 빈 값이 노출되므로 저장하지 않는다(다음 진입 시 재시도).
      this.logger.warn({ postId }, 'AI 요약 결과가 비어 있어 캐싱하지 않았습니다.');
      return;
    }

    await this.prisma.aiAnalysis.create({
      data: { postId, type: AiAnalysisType.SUMMARY, result: { summary } },
    });
  }

  /** 글 수정 시 기존 요약 캐시를 무효화한다. 다음 상세 진입에서 새로 생성된다. */
  async invalidateSummary(postId: string): Promise<void> {
    await this.prisma.aiAnalysis.deleteMany({ where: { postId, type: AiAnalysisType.SUMMARY } });
  }

  /**
   * 제목+본문으로 태그를 추천한다. 후처리: 정규화 → 중복 제거 → FEATURE 태그 제외 → 최대 5개.
   * 저장은 하지 않으며, 사용자가 선택해서 적용하도록 목록만 반환한다.
   */
  async suggestTags(title: string, content: string): Promise<string[]> {
    if (this.aiProvider.name === 'stub') return [];

    const existing = await this.prisma.tag.findMany({
      where: { type: TagType.NORMAL, usageCount: { gt: 0 } },
      orderBy: { usageCount: 'desc' },
      take: EXISTING_TAG_SAMPLE,
      select: { name: true },
    });

    const { tags } = await this.aiProvider.suggestTags({
      title,
      content,
      max: MAX_SUGGESTED_TAGS,
      existingTags: existing.map((t) => t.name),
    });

    const normalized = this.normalize(tags);
    if (normalized.length === 0) return [];

    // FEATURE 태그(큐레이션 태그)는 추천 대상에서 제외한다.
    const featureTags = await this.prisma.tag.findMany({
      where: { type: TagType.FEATURE, name: { in: normalized } },
      select: { name: true },
    });
    const featureSet = new Set(featureTags.map((t) => t.name));

    return normalized.filter((name) => !featureSet.has(name)).slice(0, MAX_SUGGESTED_TAGS);
  }

  private normalize(rawTags: string[]): string[] {
    return Array.from(
      new Set(
        rawTags
          .map((tag) => tag.trim().toLowerCase())
          .filter((tag) => tag.length > 0 && tag.length <= MAX_TAG_LENGTH),
      ),
    );
  }

  private readSummary(result: Prisma.JsonValue): string | null {
    if (result && typeof result === 'object' && !Array.isArray(result)) {
      const value = (result as Record<string, unknown>).summary;
      if (typeof value === 'string' && value.trim().length > 0) return value;
    }
    return null;
  }
}
