import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { TagsService } from './services/tags.service';

/**
 * 태그 공개 조회. 게시판뿐 아니라 태그로도 탐색할 수 있도록(/tag/[slug]),
 * 인기 태그 목록을 제공한다. 태그별 게시글은 기존 GET /posts?tag= 로 조회한다.
 */
@ApiTags('tags')
@Controller('tags')
export class TagsController {
  constructor(private readonly tagsService: TagsService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: '인기 태그 목록 (usageCount 내림차순)' })
  async findPopular(@Query('limit') limit?: string) {
    const parsed = Number(limit);
    const take = Math.min(Math.max(Number.isFinite(parsed) ? parsed : 30, 1), 100);
    return this.tagsService.findPopular(take);
  }
}
