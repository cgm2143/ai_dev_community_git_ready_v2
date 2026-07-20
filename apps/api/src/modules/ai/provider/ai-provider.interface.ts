/**
 * AI 능력 추상화. 도메인 서비스는 이 인터페이스에만 의존하고, 실제 구현체(Anthropic/OpenAI/Gemini)는
 * AiModule이 환경변수로 선택 주입한다(DI). 이번 단계에서는 실제 호출을 구현하지 않고 인터페이스와
 * DI 배선, 기본 Stub 구현만 둔다.
 */
export const AI_PROVIDER = Symbol('AI_PROVIDER');

export interface SummarizeInput {
  title: string;
  content: string;
  maxChars?: number;
  lang?: string;
}
export interface SummarizeResult {
  summary: string;
}

export interface SuggestTagsInput {
  title: string;
  content: string;
  max?: number;
  existingTags?: string[];
}
export interface SuggestTagsResult {
  tags: string[];
}

export interface RelatedPostsInput {
  postId: string;
  title: string;
  content: string;
  limit?: number;
}
export interface RelatedPostsResult {
  postIds: string[];
}

export interface TranslateInput {
  text: string;
  target: string;
}
export interface TranslateResult {
  text: string;
  detectedSource?: string;
}

export interface AnswerInput {
  question: string;
  context?: string[]; // RAG용 컨텍스트(향후 임베딩 검색 결과 등)
}
export interface AnswerResult {
  answer: string;
  citations?: string[];
}

export interface AiProvider {
  readonly name: string;
  summarize(input: SummarizeInput): Promise<SummarizeResult>;
  suggestTags(input: SuggestTagsInput): Promise<SuggestTagsResult>;
  relatedPosts(input: RelatedPostsInput): Promise<RelatedPostsResult>;
  translate(input: TranslateInput): Promise<TranslateResult>;
  answer(input: AnswerInput): Promise<AnswerResult>;
}
