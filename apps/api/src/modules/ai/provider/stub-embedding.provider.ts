import { Injectable } from '@nestjs/common';
import { EmbeddingProvider, EmbedInput, EmbedResult } from './embedding-provider.interface';

/** 기본 임베딩 구현체(placeholder). 실제 임베딩을 계산하지 않는다. */
@Injectable()
export class StubEmbeddingProvider implements EmbeddingProvider {
  readonly name = 'stub';

  async embed(input: EmbedInput): Promise<EmbedResult> {
    return { vectors: input.texts.map(() => []), dimensions: 0 };
  }
}
