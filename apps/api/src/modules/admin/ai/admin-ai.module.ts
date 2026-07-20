import { Module } from '@nestjs/common';
import { AdminAiController } from './admin-ai.controller';
import { AdminAiMetricsService } from './admin-ai-metrics.service';

/**
 * 관리자 AI 운영 모듈. 지표 조회(GET /admin/ai/metrics)와 DLQ 조회/재실행 API를 제공한다.
 * 큐/DLQ 프로듀서는 전역 QueueModule에서 주입받는다.
 */
@Module({
  controllers: [AdminAiController],
  providers: [AdminAiMetricsService],
})
export class AdminAiModule {}
