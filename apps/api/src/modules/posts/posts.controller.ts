import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { OptionalAuth } from '../../common/decorators/optional-auth.decorator';
import { RequireEmailVerified } from '../../common/decorators/require-email-verified.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/types/jwt-payload.interface';
import { PostsService } from './posts.service';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { QueryPostDto } from './dto/query-post.dto';
import { RankingQueryDto } from './dto/ranking-query.dto';
import { PostDetailDto, PostListItemDto } from './dto/post-response.dto';

@ApiTags('posts')
@Controller('posts')
export class PostsController {
  constructor(private readonly postsService: PostsService) {}

  @OptionalAuth()
  @Get()
  @ApiOperation({ summary: '게시글 목록 조회 (boardId/tag/keyword 필터, latest/popular 정렬)' })
  @ApiResponse({ status: 200, type: [PostListItemDto] })
  async findAll(@Query() query: QueryPostDto, @CurrentUser() user?: AuthenticatedUser) {
    return this.postsService.findAll(query, user?.id);
  }

  // '/posts/ranking'은 반드시 '/posts/:id'보다 먼저 등록해야 한다(Express 라우트 매칭 순서).
  // (기존 '/posts/best'는 이 범용 랭킹 엔드포인트 type=hot으로 통합되었다.)
  @OptionalAuth()
  @Get('ranking')
  @ApiOperation({ summary: '범용 랭킹 조회 (type=hot|views|comments|likes, period=daily|weekly|monthly)' })
  @ApiResponse({ status: 200, type: [PostListItemDto] })
  async findRanking(@Query() query: RankingQueryDto, @CurrentUser() user?: AuthenticatedUser) {
    return this.postsService.findRanking(query.type ?? 'hot', query.period, query.limit ?? 10, user?.id);
  }

  @OptionalAuth()
  @Get(':id')
  @ApiOperation({ summary: '게시글 상세 조회 (조회수는 Redis에 집계 후 배치 반영)' })
  @ApiResponse({ status: 200, type: PostDetailDto })
  async findOne(@Param('id') id: string, @CurrentUser() user?: AuthenticatedUser) {
    return this.postsService.findOne(id, user?.id);
  }

  @OptionalAuth()
  @Get(':id/related')
  @ApiOperation({ summary: '연관 게시글 (태그/카테고리/제목 유사도/조회수/최신성 점수 상위 5개, Redis 캐싱)' })
  @ApiResponse({ status: 200, type: [PostListItemDto] })
  async findRelated(@Param('id') id: string) {
    return this.postsService.findRelated(id);
  }

  @RequireEmailVerified()
  @Post()
  @ApiOperation({ summary: '게시글 작성 (Markdown, 태그, 첨부파일 연결)' })
  @ApiResponse({ status: 201, type: PostDetailDto })
  async create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreatePostDto) {
    return this.postsService.create(user.id, dto);
  }

  @RequireEmailVerified()
  @Patch(':id')
  @ApiOperation({ summary: '게시글 수정 (본인 글만 가능)' })
  @ApiResponse({ status: 200, type: PostDetailDto })
  async update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdatePostDto,
  ) {
    return this.postsService.update(user.id, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: '게시글 삭제 (Soft Delete, 본인 글이거나 POST_DELETE_ANY 권한 필요)' })
  async remove(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string): Promise<void> {
    await this.postsService.remove(user.id, user.role, id);
  }
}
