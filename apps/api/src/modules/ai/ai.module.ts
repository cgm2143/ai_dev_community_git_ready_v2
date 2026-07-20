import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AI_PROVIDER } from './provider/ai-provider.interface';
import { EMBEDDING_PROVIDER } from './provider/embedding-provider.interface';
import { StubAiProvider } from './provider/stub-ai.provider';
import { StubEmbeddingProvider } from './provider/stub-embedding.provider';

/**
 * AI 배선 전용 모듈. 지금은 Stub 구현을 기본 주입하며, 향후 Anthropic/OpenAI/Gemini 구현 클래스를
 * providers에 추가하고 useFactory에서 config(AI_PROVIDER)로 선택하도록 확장한다. 소비 측은
 * @Inject(AI_PROVIDER) / @Inject(EMBEDDING_PROVIDER)로 인터페이스에만 의존한다.
 */
@Module({
  providers: [
    StubAiProvider,
    StubEmbeddingProvider,
    {
      provide: AI_PROVIDER,
      inject: [ConfigService, StubAiProvider],
      useFactory: (_config: ConfigService, stub: StubAiProvider) => {
        // 예) const kind = _config.get('AI_PROVIDER');
        //     if (kind === 'anthropic' && _config.get('ANTHROPIC_API_KEY')) return anthropic;
        return stub;
      },
    },
    {
      provide: EMBEDDING_PROVIDER,
      inject: [ConfigService, StubEmbeddingProvider],
      useFactory: (_config: ConfigService, stub: StubEmbeddingProvider) => stub,
    },
  ],
  exports: [AI_PROVIDER, EMBEDDING_PROVIDER],
})
export class AiModule {}
