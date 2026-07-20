/**
 * 임베딩 능력 추상화(연관글/의미 검색용). 향후 pgvector + Anthropic/OpenAI 임베딩으로 구현.
 */
export const EMBEDDING_PROVIDER = Symbol('EMBEDDING_PROVIDER');

export interface EmbedInput {
  texts: string[];
}
export interface EmbedResult {
  vectors: number[][];
  dimensions: number;
}

export interface EmbeddingProvider {
  readonly name: string;
  embed(input: EmbedInput): Promise<EmbedResult>;
}
