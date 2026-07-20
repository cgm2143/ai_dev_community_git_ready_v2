import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { RequireEmailVerified } from '../../common/decorators/require-email-verified.decorator';
import { AiAnalysisService } from './ai-analysis.service';
import { SuggestTagsDto } from './dto/suggest-tags.dto';

@ApiTags('ai')
@Controller('ai')
export class AiController {
  constructor(private readonly aiAnalysisService: AiAnalysisService) {}

  @Public()
  @Get('posts/:postId/summary')
  @ApiOperation({ summary: 'AI 요약 조회 (없으면 생성 작업 등록 후 pending 반환, 프론트는 polling)' })
  @ApiResponse({ status: 200, description: 'status: ready|pending|unavailable' })
  async getSummary(@Param('postId') postId: string) {
    return this.aiAnalysisService.getOrQueueSummary(postId);
  }

  @RequireEmailVerified()
  @Post('suggest-tags')
  @ApiOperation({ summary: 'AI 태그 추천 (제목+본문 기반, 최대 5개, 저장하지 않음)' })
  @ApiResponse({ status: 201, description: 'tags: string[]' })
  async suggestTags(@Body() dto: SuggestTagsDto) {
    const tags = await this.aiAnalysisService.suggestTags(dto.title, dto.content);
    return { tags };
  }
}
