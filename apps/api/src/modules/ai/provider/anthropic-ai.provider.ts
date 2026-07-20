import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Anthropic from '@anthropic-ai/sdk';
import { PinoLogger } from 'nestjs-pino';
import { z } from 'zod';
import { AiConfig } from '../../../config/configuration';
import {
  AiProvider,
  SummarizeInput,
  SummarizeResult,
  SuggestTagsInput,
  SuggestTagsResult,
  RelatedPostsInput,
  RelatedPostsResult,
  TranslateInput,
  TranslateResult,
  AnswerInput,
  AnswerResult,
} from './ai-provider.interface';
import { SUMMARY_SYSTEM_PROMPT, buildSummaryUserPrompt } from '../prompts/summary.prompt';
import { buildTagSystemPrompt, buildTagUserPrompt } from '../prompts/tag.prompt';

/** LLM 태그 응답 런타임 검증 스키마. 문자열 배열이 아니면 안전 기본값([])으로 폴백한다. */
const TAG_ARRAY_SCHEMA = z.array(z.string());

/**
 * Anthropic 실제 구현체. 모델/temperature/maxTokens/timeout/retry는 모두 ConfigService(ai)에서 읽는다.
 * 환경변수에 ANTHROPIC_API_KEY가 없으면 애초에 AiModule이 이 Provider 대신 StubProvider를 주입한다.
 */
@Injectable()
export class AnthropicAiProvider implements AiProvider {
  readonly name = 'anthropic';
  private client?: Anthropic;
  private readonly config: AiConfig;

  constructor(configService: ConfigService, private readonly logger: PinoLogger) {
    this.logger.setContext(AnthropicAiProvider.name);
    this.config = configService.get<AiConfig>('ai') as AiConfig;
    // apiKey가 없는 환경에서도 Nest가 이 Provider를 인스턴스화하므로, 클라이언트는 키가 있을 때만 생성한다.
    if (this.config.apiKey) {
      this.client = new Anthropic({
        apiKey: this.config.apiKey,
        timeout: this.config.timeoutMs, // TS SDK는 밀리초 단위
        maxRetries: this.config.maxRetries,
      });
    }
  }

  private getClient(): Anthropic {
    if (!this.client) {
      throw new Error('ANTHROPIC_API_KEY가 설정되지 않아 Anthropic 클라이언트를 사용할 수 없습니다.');
    }
    return this.client;
  }

  async summarize(input: SummarizeInput): Promise<SummarizeResult> {
    const message = await this.getClient().messages.create({
      model: this.config.model,
      max_tokens: this.config.maxTokens,
      temperature: this.config.temperature,
      system: SUMMARY_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: buildSummaryUserPrompt(input.title, input.content) }],
    });

    return { summary: this.extractText(message).trim(), usage: this.extractUsage(message) };
  }

  async suggestTags(input: SuggestTagsInput): Promise<SuggestTagsResult> {
    const message = await this.getClient().messages.create({
      model: this.config.model,
      max_tokens: this.config.maxTokens,
      temperature: this.config.temperature,
      system: buildTagSystemPrompt(input.existingTags ?? []),
      messages: [{ role: 'user', content: buildTagUserPrompt(input.title, input.content) }],
    });

    const text = this.extractText(message);
    return { tags: this.parseTagArray(text), usage: this.extractUsage(message) };
  }

  // ── 아래 세 기능은 Phase 5-1 범위 밖이라 인터페이스 충족용 안전 기본값만 반환한다.
  async relatedPosts(_input: RelatedPostsInput): Promise<RelatedPostsResult> {
    return { postIds: [] };
  }
  async translate(input: TranslateInput): Promise<TranslateResult> {
    return { text: input.text };
  }
  async answer(_input: AnswerInput): Promise<AnswerResult> {
    return { answer: 'AI 답변 기능은 아직 활성화되지 않았습니다.' };
  }

  /** 응답 content 블록에서 text 블록만 이어붙인다. */
  private extractText(message: Anthropic.Message): string {
    return message.content
      .filter((block): block is Anthropic.TextBlock => block.type === 'text')
      .map((block) => block.text)
      .join('')
      .trim();
  }

  private extractUsage(message: Anthropic.Message) {
    return {
      inputTokens: message.usage?.input_tokens ?? 0,
      outputTokens: message.usage?.output_tokens ?? 0,
    };
  }

  /**
   * 모델이 반환한 JSON 배열 문자열을 파싱하고 Zod로 런타임 검증한다.
   * 파싱/검증 실패 시 예외 대신 안전 기본값([])을 반환해 태그 추천이 게시글 작성 흐름을 막지 않도록 한다.
   */
  private parseTagArray(text: string): string[] {
    const match = text.match(/\[[\s\S]*\]/);
    if (!match) return [];
    try {
      const parsed: unknown = JSON.parse(match[0]);
      const result = TAG_ARRAY_SCHEMA.safeParse(parsed);
      if (!result.success) {
        this.logger.warn({ text }, 'AI 태그 추천 응답이 스키마에 맞지 않습니다. 빈 목록으로 폴백합니다.');
        return [];
      }
      return result.data;
    } catch (err) {
      this.logger.warn({ err, text }, 'AI 태그 추천 응답 JSON 파싱에 실패했습니다.');
      return [];
    }
  }
}
