import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Public } from '../../common/decorators/public.decorator';
import { OptionalAuth } from '../../common/decorators/optional-auth.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/types/jwt-payload.interface';
import { SearchService } from './search.service';
import { SearchQueryDto, AutocompleteQueryDto } from './dto/search-query.dto';
import {
  UserSearchResultDto,
  TagSearchResultDto,
  BoardSearchResultDto,
  AutocompleteResponseDto,
  PopularSearchTermDto,
} from './dto/search-response.dto';

/**
 * 검색은 FTS 쿼리 부하 + (특히 자동완성) 호출 빈도 때문에 전역 기본값(1분 100회)과
 * 별도로 엔드포인트별 Rate Limit을 적용한다.
 */
@ApiTags('search')
@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @OptionalAuth()
  @Throttle({ default: { limit: 30, ttl: 60 * 1000 } }) // IP당 1분 30회
  @Get('posts')
  @ApiOperation({ summary: '게시글 검색 (PostgreSQL Full Text Search)' })
  async searchPosts(@Query() query: SearchQueryDto, @CurrentUser() user?: AuthenticatedUser) {
    return this.searchService.searchPosts(query.q, query.page ?? 1, query.limit ?? 20, user?.id);
  }

  @Public()
  @Throttle({ default: { limit: 30, ttl: 60 * 1000 } })
  @Get('users')
  @ApiOperation({ summary: '회원 검색 (닉네임)' })
  @ApiResponse({ status: 200, type: [UserSearchResultDto] })
  async searchUsers(@Query() query: SearchQueryDto) {
    return this.searchService.searchUsers(query.q, query.page ?? 1, query.limit ?? 20);
  }

  @Public()
  @Throttle({ default: { limit: 30, ttl: 60 * 1000 } })
  @Get('tags')
  @ApiOperation({ summary: '태그 검색' })
  @ApiResponse({ status: 200, type: [TagSearchResultDto] })
  async searchTags(@Query() query: SearchQueryDto) {
    return this.searchService.searchTags(query.q, query.limit ?? 20);
  }

  @Public()
  @Throttle({ default: { limit: 30, ttl: 60 * 1000 } })
  @Get('boards')
  @ApiOperation({ summary: '게시판 검색' })
  @ApiResponse({ status: 200, type: [BoardSearchResultDto] })
  async searchBoards(@Query() query: SearchQueryDto) {
    return this.searchService.searchBoards(query.q, query.limit ?? 20);
  }

  @Public()
  @Throttle({ default: { limit: 60, ttl: 10 * 1000 } }) // 타이핑 중 호출을 감안해 10초당 60회(초당 6회)
  @Get('autocomplete')
  @ApiOperation({ summary: '자동완성 (게시글 제목 + 태그, prefix 매칭)' })
  @ApiResponse({ status: 200, type: AutocompleteResponseDto })
  async autocomplete(@Query() query: AutocompleteQueryDto) {
    return this.searchService.autocomplete(query.q, query.limit ?? 5);
  }

  @Public()
  @Get('popular')
  @ApiOperation({ summary: '인기 검색어 (Redis ZSET 누적 집계)' })
  @ApiResponse({ status: 200, type: [PopularSearchTermDto] })
  async popularTerms() {
    return this.searchService.getPopularTerms(10);
  }
}
