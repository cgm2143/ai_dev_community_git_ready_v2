import { Inject, Module, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue, Worker, type ConnectionOptions } from 'bullmq';
import { PinoLogger } from 'nestjs-pino';
import { AiConfig, RedisConfig } from '../../config/configuration';
import { AI_PROVIDER } from './provider/ai-provider.interface';
import { EMBEDDING_PROVIDER } from './provider/embedding-provider.interface';
import { StubAiProvider } from './provider/stub-ai.provider';
import { StubEmbeddingProvider } from './provider/stub-embedding.provider';
import { AnthropicAiProvider } from './provider/anthropic-ai.provider';
import { AiAnalysisService } from './ai-analysis.service';
import { AiController } from './ai.controller';
import { AiSummaryQueueService } from './queue/ai-summary-queue.service';
import { AI_SUMMARY_QUEUE, AI_SUMMARY_QUEUE_NAME, AiSummaryJobData } from './queue/ai-summary.constants';

/** BullMQ 커넥션 옵션(QueueModule과 동일 규칙): 인스턴스 대신 순수 옵션 객체를 넘겨 타입 충돌을 피한다. */
function createBullConnectionOptions(redisConfig: RedisConfig | undefined): ConnectionOptions {
  return {
    host: redisConfig?.host,
    port: redisConfig?.port,
    password: redisConfig?.password,
    maxRetriesPerRequest: null,
  };
}

const aiSummaryQueueProvider = {
  provide: AI_SUMMARY_QUEUE,
  inject: [ConfigService],
  useFactory: (configService: ConfigService): Queue<AiSummaryJobData> => {
    const redisConfig = configService.get<RedisConfig>('queueRedis');
    return new Queue<AiSummaryJobData>(AI_SUMMARY_QUEUE_NAME, {
      connection: createBullConnectionOptions(redisConfig),
    });
  },
};

/**
 * AI 배선 모듈. 환경변수(ANTHROPIC_API_KEY)가 있으면 AnthropicAiProvider를, 없으면 StubAiProvider를 주입한다.
 * 요약 생성은 BullMQ 비동기 작업(ai-summary 큐)으로 처리하고, 이 모듈이 Worker의 기동/종료를 관리한다.
 */
@Module({
  controllers: [AiController],
  providers: [
    StubAiProvider,
    StubEmbeddingProvider,
    AnthropicAiProvider,
    AiAnalysisService,
    AiSummaryQueueService,
    aiSummaryQueueProvider,
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
export class AiModule implements OnModuleInit, OnModuleDestroy {
  private worker?: Worker<AiSummaryJobData>;

  constructor(
    private readonly configService: ConfigService,
    private readonly aiAnalysisService: AiAnalysisService,
    private readonly logger: PinoLogger,
    @Inject(AI_SUMMARY_QUEUE) private readonly summaryQueue: Queue<AiSummaryJobData>,
  ) {
    this.logger.setContext(AiModule.name);
  }

  onModuleInit(): void {
    const redisConfig = this.configService.get<RedisConfig>('queueRedis');
    this.worker = new Worker<AiSummaryJobData>(
      AI_SUMMARY_QUEUE_NAME,
      async (job) => this.aiAnalysisService.generateSummaryForPost(job.data.postId),
      { connection: createBullConnectionOptions(redisConfig) },
    );

    this.worker.on('failed', (job, err) => {
      this.logger.error({ err, jobId: job?.id, postId: job?.data.postId }, 'AI 요약 생성 작업이 실패했습니다.');
    });
  }

  async onModuleDestroy(): Promise<void> {
    await this.worker?.close();
    await this.summaryQueue.close();
  }
}
