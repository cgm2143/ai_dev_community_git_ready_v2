import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AiConfig } from '../../config/configuration';
import { AI_PROVIDER } from './provider/ai-provider.interface';
import { EMBEDDING_PROVIDER } from './provider/embedding-provider.interface';
import { StubAiProvider } from './provider/stub-ai.provider';
import { StubEmbeddingProvider } from './provider/stub-embedding.provider';
import { AnthropicAiProvider } from './provider/anthropic-ai.provider';
import { AiAnalysisService } from './ai-analysis.service';
import { AiCostGuardService } from './ai-cost-guard.service';
import { AiController } from './ai.controller';

/**
 * AI 도메인 모듈 - Controller + Service + Provider만 담당한다.
 * 큐 프로듀서는 전역 QueueModule에서, 요약 생성 Worker(소비자)는 별도 프로세스의 WorkerModule에서 담당한다.
 * 환경변수(ANTHROPIC_API_KEY)가 있으면 AnthropicAiProvider를, 없으면 StubAiProvider를 주입한다.
 */
@Module({
  controllers: [AiController],
  providers: [
    StubAiProvider,
    StubEmbeddingProvider,
    AnthropicAiProvider,
    AiAnalysisService,
    AiCostGuardService,
    {
      provide: AI_PROVIDER,
      inject: [ConfigService, StubAiProvider, AnthropicAiProvider],
      useFactory: (config: ConfigService, stub: StubAiProvider, anthropic: AnthropicAiProvider) => {
        const ai = config.get<AiConfig>('ai');
        // API Key가 없으면 자동으로 StubProvider로 폴백한다.
        if (ai?.provider === 'anthropic' && ai.apiKey) return anthropic;
        return stub;
      },
    },
    {
      provide: EMBEDDING_PROVIDER,
      inject: [ConfigService, StubEmbeddingProvider],
      useFactory: (_config: ConfigService, stub: StubEmbeddingProvider) => stub,
    },
  ],
  exports: [AI_PROVIDER, EMBEDDING_PROVIDER, AiAnalysisService],
})
export class AiModule {}
