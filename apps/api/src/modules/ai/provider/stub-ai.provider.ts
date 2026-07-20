import { Injectable } from '@nestjs/common';
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

/**
 * 기본 구현체(placeholder). 실제 AI를 호출하지 않고 안전한 빈 결과를 반환한다.
 * 실 구현(Anthropic 등)을 추가하기 전까지 앱이 키 없이도 정상 동작하도록 한다.
 */
@Injectable()
export class StubAiProvider implements AiProvider {
  readonly name = 'stub';

  async summarize(_input: SummarizeInput): Promise<SummarizeResult> {
    return { summary: '' };
  }
  async suggestTags(_input: SuggestTagsInput): Promise<SuggestTagsResult> {
    return { tags: [] };
  }
  async relatedPosts(_input: RelatedPostsInput): Promise<RelatedPostsResult> {
    return { postIds: [] };
  }
  async translate(input: TranslateInput): Promise<TranslateResult> {
    return { text: input.text };
  }
  async answer(_input: AnswerInput): Promise<AnswerResult> {
    return { answer: 'AI 기능이 아직 활성화되지 않았습니다.' };
  }
}
