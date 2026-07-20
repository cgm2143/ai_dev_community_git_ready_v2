import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AiAnalysisType, AiRequestKind, PostStatus, Prisma, TagType } from '@prisma/client';
import { PinoLogger } from 'nestjs-pino';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { AiConfig } from '../../config/configuration';
import { AI_PROVIDER, AiProvider, AiUsage } from './provider/ai-provider.interface';
import { AiSummaryQueueService } from './queue/ai-summary-queue.service';
import { SUMMARY_SYSTEM_PROMPT } from './prompts/summary.prompt';
import { TAG_PROMPT_RULES } from './prompts/tag.prompt';
import { buildPromptSignature, PromptSignature } from './prompt-signature.util';
import { estimateCost } from './ai-cost.util';

export type SummaryStatus = 'ready' | 'pending' | 'unavailable';

export interface SummaryResponse {
  status: SummaryStatus;
  summary?: string;
}

const MAX_SUGGESTED_TAGS = 5;
const MAX_TAG_LENGTH = 30;
const EXISTING_TAG_SAMPLE = 50;

/**
 * AI 요약 캐시(AiAnalysis SUMMARY)와 태그 추천을 담당한다.
 * - 실제 모델 호출은 주입된 AiProvider가 맡고, 이 서비스는 캐시/큐/후처리/관측 로그를 책임진다.
 * - 프롬프트 버전/해시가 바뀌면 캐시를 자동 무효화한다.
 * - 모든 LLM 호출은 AiRequestLog에 기록한다(관측). 로그 실패가 기능을 막지 않도록 격리한다.
 */
@Injectable()
export class AiAnalysisService {
  private readonly config: AiConfig;

  constructor(
    private readonly prisma: PrismaService,
    @Inject(AI_PROVIDER) private readonly aiProvider: AiProvider,
    private readonly summaryQueue: AiSummaryQueueService,
    private readonly configService: ConfigService,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(AiAnalysisService.name);
    this.config = this.configService.get<AiConfig>('ai') as AiConfig;
  }

  /** 현재 요약 프롬프트 시그니처(version + hash). */
  private summarySignature(): PromptSignature {
    return buildPromptSignature(this.config.summaryPromptVersion, SUMMARY_SYSTEM_PROMPT);
  }

  /** 현재 태그 프롬프트 시그니처(version + hash). */
  private tagSignature(): PromptSignature {
    return buildPromptSignature(this.config.tagPromptVersion, TAG_PROMPT_RULES);
  }

  /**
   * 캐시된 요약이 있고 프롬프트 시그니처가 현재와 같으면 즉시 반환한다.
   * 시그니처가 다르면(버전/템플릿 변경) 무효화 후 재생성한다. 없으면 생성 작업만 등록하고 pending을 반환.
   */
  async getOrQueueSummary(postId: string): Promise<SummaryResponse> {
    const sig = this.summarySignature();
    const cached = await this.prisma.aiAnalysis.findFirst({
      where: { postId, type: AiAnalysisType.SUMMARY },
      orderBy: { createdAt: 'desc' },
    });

    if (cached) {
      const summary = this.readSummary(cached.result);
      const fresh = cached.promptVersion === sig.version && cached.promptHash === sig.hash;
      if (summary && fresh) {
        return { status: 'ready', summary };
      }
      // 프롬프트 버전/해시가 바뀌었거나 요약이 비어 있으면 캐시를 버리고 재생성한다.
      await this.prisma.aiAnalysis.deleteMany({ where: { postId, type: AiAnalysisType.SUMMARY } });
    }

    if (this.aiProvider.name === 'stub') {
      return { status: 'unavailable' };
    }

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

  /** BullMQ Worker가 호출한다. 원문을 읽어 요약을 생성/저장하고 관측 로그를 남긴다. */
  async generateSummaryForPost(postId: string): Promise<void> {
    const sig = this.summarySignature();

    const existing = await this.prisma.aiAnalysis.findFirst({
      where: { postId, type: AiAnalysisType.SUMMARY, promptVersion: sig.version, promptHash: sig.hash },
      select: { id: true },
    });
    if (existing) return;

    const post = await this.prisma.post.findFirst({
      where: { id: postId, status: PostStatus.PUBLISHED, deletedAt: null },
      select: { title: true, content: true },
    });
    if (!post) return;

    const startedAt = Date.now();
    try {
      const { summary, usage } = await this.aiProvider.summarize({ title: post.title, content: post.content });
      const responseTimeMs = Date.now() - startedAt;

      if (!summary) {
        // 빈 요약을 캐싱하면 영구적으로 빈 값이 노출되므로 저장하지 않는다(다음 진입 시 재시도).
        await this.recordLog(AiRequestKind.SUMMARY, sig, usage, responseTimeMs, false, 'empty_summary', postId);
        this.logger.warn({ postId }, 'AI 요약 결과가 비어 있어 캐싱하지 않았습니다.');
        return;
      }

      const cost = this.cost(usage);
      await this.prisma.aiAnalysis.create({
        data: {
          postId,
          type: AiAnalysisType.SUMMARY,
          result: { summary },
          provider: this.aiProvider.name,
          model: this.config.model,
          promptVersion: sig.version,
          promptHash: sig.hash,
          createdByAI: true,
          responseTimeMs,
          inputTokens: usage?.inputTokens ?? null,
          outputTokens: usage?.outputTokens ?? null,
          totalTokens: usage ? usage.inputTokens + usage.outputTokens : null,
          estimatedCost: cost,
          metadata: { contentLength: post.content.length },
        },
      });

      await this.recordLog(AiRequestKind.SUMMARY, sig, usage, responseTimeMs, true, null, postId);
    } catch (err) {
      const responseTimeMs = Date.now() - startedAt;
      await this.recordLog(AiRequestKind.SUMMARY, sig, undefined, responseTimeMs, false, this.reason(err), postId);
      throw err; // BullMQ 재시도 유도
    }
  }

  /** 글 수정 시 기존 요약 캐시를 무효화한다. 다음 상세 진입에서 새로 생성된다. */
  async invalidateSummary(postId: string): Promise<void> {
    await this.prisma.aiAnalysis.deleteMany({ where: { postId, type: AiAnalysisType.SUMMARY } });
  }

  /**
   * 제목+본문으로 태그를 추천한다. 후처리: 정규화 → 중복 제거 → FEATURE 태그 제외 → 최대 5개.
   * 저장은 하지 않으며, LLM 호출은 관측 로그에 기록한다.
   */
  async suggestTags(title: string, content: string): Promise<string[]> {
    if (this.aiProvider.name === 'stub') return [];

    const sig = this.tagSignature();
    const existing = await this.prisma.tag.findMany({
      where: { type: TagType.NORMAL, usageCount: { gt: 0 } },
      orderBy: { usageCount: 'desc' },
      take: EXISTING_TAG_SAMPLE,
      select: { name: true },
    });

    const startedAt = Date.now();
    try {
      const { tags, usage } = await this.aiProvider.suggestTags({
        title,
        content,
        max: MAX_SUGGESTED_TAGS,
        existingTags: existing.map((t) => t.name),
      });
      const responseTimeMs = Date.now() - startedAt;
      await this.recordLog(AiRequestKind.SUGGEST_TAGS, sig, usage, responseTimeMs, true, null, null);

      const normalized = this.normalize(tags);
      if (normalized.length === 0) return [];

      // FEATURE 태그(큐레이션 태그)는 추천 대상에서 제외한다.
      const featureTags = await this.prisma.tag.findMany({
        where: { type: TagType.FEATURE, name: { in: normalized } },
        select: { name: true },
      });
      const featureSet = new Set(featureTags.map((t) => t.name));
      return normalized.filter((name) => !featureSet.has(name)).slice(0, MAX_SUGGESTED_TAGS);
    } catch (err) {
      const responseTimeMs = Date.now() - startedAt;
      await this.recordLog(AiRequestKind.SUGGEST_TAGS, sig, undefined, responseTimeMs, false, this.reason(err), null);
      // 태그 추천 실패가 글 작성 흐름을 막지 않도록 안전 기본값을 반환한다.
      this.logger.warn({ err }, 'AI 태그 추천에 실패했습니다.');
      return [];
    }
  }

  private cost(usage?: AiUsage): number {
    if (!usage) return 0;
    return estimateCost(this.config.model, usage.inputTokens, usage.outputTokens);
  }

  /** 관측 로그 기록. 로그 실패가 본 기능을 막지 않도록 예외를 삼킨다. */
  private async recordLog(
    kind: AiRequestKind,
    sig: PromptSignature,
    usage: AiUsage | undefined,
    responseTimeMs: number,
    success: boolean,
    errorReason: string | null,
    postId: string | null,
  ): Promise<void> {
    const input = usage?.inputTokens ?? 0;
    const output = usage?.outputTokens ?? 0;
    try {
      await this.prisma.aiRequestLog.create({
        data: {
          kind,
          provider: this.aiProvider.name,
          model: this.config.model,
          promptVersion: sig.version,
          promptHash: sig.hash,
          inputTokens: input,
          outputTokens: output,
          totalTokens: input + output,
          estimatedCost: usage ? estimateCost(this.config.model, input, output) : 0,
          responseTimeMs,
          retryCount: 0, // SDK 내부 재시도는 불투명하므로 콘텐츠 검증 재시도 횟수만 기록(현재 0)
          success,
          errorReason,
          cacheHit: false,
          postId,
        },
      });
    } catch (err) {
      this.logger.warn({ err, kind }, 'AI 관측 로그 기록에 실패했습니다(무시).');
    }
  }

  private reason(err: unknown): string {
    if (err instanceof Error) return err.message.slice(0, 300);
    return String(err).slice(0, 300);
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
