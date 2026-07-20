import { Controller, Get, Param, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../../common/decorators/roles.decorator';
import { DeadLetterService } from '../../../infra/queue/dead-letter.service';
import { AdminAiMetricsService } from './admin-ai-metrics.service';

@ApiTags('admin-ai')
@Roles('ADMIN', 'SUPER_ADMIN', 'MODERATOR')
@Controller('admin/ai')
export class AdminAiController {
  constructor(
    private readonly metricsService: AdminAiMetricsService,
    private readonly deadLetterService: DeadLetterService,
  ) {}

  @Get('metrics')
  @ApiOperation({ summary: 'AI 운영 지표 (요청/성공률/응답시간/토큰/비용/Provider/캐시/큐 대기)' })
  async metrics() {
    return this.metricsService.getMetrics();
  }

  @Get('dead-letters')
  @ApiOperation({ summary: 'Dead Letter Queue 목록 (최종 실패 Job)' })
  async deadLetters() {
    return this.deadLetterService.listDeadLetters();
  }

  @Post('dead-letters/:id/requeue')
  @ApiOperation({ summary: 'Dead Letter Job을 원본 큐로 재실행' })
  async requeue(@Param('id') id: string) {
    const ok = await this.deadLetterService.requeue(id);
    return { success: ok };
  }
}
