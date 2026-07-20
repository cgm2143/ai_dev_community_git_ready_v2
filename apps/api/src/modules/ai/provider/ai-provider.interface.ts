/**
 * AI 능력 추상화. 도메인 서비스는 이 인터페이스에만 의존하고, 실제 구현체(Anthropic/OpenAI/Gemini)는
 * AiModule이 환경변수로 선택 주입한다(DI). 이번 단계에서는 실제 호출을 구현하지 않고 인터페이스와
 * DI 배선, 기본 Stub 구현만 둔다.
 */
export const AI_PROVIDER = Symbol('AI_PROVIDER');

/** LLM 호출 토큰 사용량. 관측 로그/비용 계산에 사용한다. */
export interface AiUsage {
  inputTokens: number;
  outputTokens: number;
}

export interface SummarizeInput {
  title: string;
  content: string;
  maxChars?: number;
  lang?: string;
}
export interface SummarizeResult {
  summary: string;
  usage?: AiUsage;
}

export interface SuggestTagsInput {
  title: string;
  content: string;
  max?: number;
  existingTags?: string[];
}
export interface SuggestTagsResult {
  tags: string[];
  usage?: AiUsage;
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
