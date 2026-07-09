import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { OptionalAuth } from '../../common/decorators/optional-auth.decorator';
import { RequireEmailVerified } from '../../common/decorators/require-email-verified.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/types/jwt-payload.interface';
import { PostsService } from './posts.service';
import { RankingService } from '../ranking/ranking.service';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { QueryPostDto } from './dto/query-post.dto';
import { BestPostsQueryDto } from './dto/best-posts-query.dto';
import { PostDetailDto, PostListItemDto } from './dto/post-response.dto';

@ApiTags('posts')
@Controller('posts')
export class PostsController {
  constructor(
    private readonly postsService: PostsService,
    private readonly rankingService: RankingService,
  ) {}

  @OptionalAuth()
  @Get()
  @ApiOperation({ summary: '게시글 목록 조회 (boardId/tag/keyword 필터, latest/popular 정렬)' })
  @ApiResponse({ status: 200, type: [PostListItemDto] })
  async findAll(@Query() query: QueryPostDto, @CurrentUser() user?: AuthenticatedUser) {
    return this.postsService.findAll(query, user?.id);
  }

  // '/posts/best'는 반드시 '/posts/:id'보다 먼저 등록되어야 한다 - 그렇지 않으면
  // 'best'라는 문자열이 :id 파라미터로 잘못 매칭된다 (Express는 라우트를 등록 순서대로 매칭).
  @OptionalAuth()
  @Get('best')
  @ApiOperation({
    summary: '인기글 조회 (시간 가중치 랭킹 - 오늘/주간/월간, 12단계 Performance에서 구현)',
  })
  @ApiResponse({ status: 200, type: [PostListItemDto] })
  async findBest(@Query() query: BestPostsQueryDto, @CurrentUser() user?: AuthenticatedUser) {
    const ids = await this.rankingService.getTopPostIds(query.period ?? 'daily', query.limit ?? 20);
    return this.postsService.findManyByIds(ids, user?.id);
  }

  @OptionalAuth()
  @Get(':id')
  @ApiOperation({ summary: '게시글 상세 조회 (조회수는 Redis에 집계 후 배치 반영)' })
  @ApiResponse({ status: 200, type: PostDetailDto })
  async findOne(@Param('id') id: string, @CurrentUser() user?: AuthenticatedUser) {
    return this.postsService.findOne(id, user?.id);
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
