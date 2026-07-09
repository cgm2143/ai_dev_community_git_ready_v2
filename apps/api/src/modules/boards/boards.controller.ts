import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { OptionalAuth } from '../../common/decorators/optional-auth.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/types/jwt-payload.interface';
import { BoardsService } from './boards.service';
import { BoardResponseDto } from './dto/board-response.dto';
import { PostsService } from '../posts/posts.service';
import { QueryPostDto } from '../posts/dto/query-post.dto';
import { PostListItemDto } from '../posts/dto/post-response.dto';

@ApiTags('boards')
@Controller('boards')
export class BoardsController {
  constructor(
    private readonly boardsService: BoardsService,
    private readonly postsService: PostsService,
  ) {}

  @Public()
  @Get(':slug')
  @ApiOperation({ summary: '게시판 상세 정보 조회' })
  @ApiResponse({ status: 200, type: BoardResponseDto })
  async findBySlug(@Param('slug') slug: string) {
    return this.boardsService.findBySlugPublic(slug);
  }

  @OptionalAuth()
  @Get(':slug/posts')
  @ApiOperation({ summary: '게시판별 게시글 목록 조회 (4단계 Posts 모듈과 연동)' })
  @ApiResponse({ status: 200, type: [PostListItemDto] })
  async findPostsByBoard(
    @Param('slug') slug: string,
    @Query() query: QueryPostDto,
    @CurrentUser() user?: AuthenticatedUser,
  ) {
    const board = await this.boardsService.findBySlugPublic(slug);
    return this.postsService.findAll({ ...query, boardId: board.id }, user?.id);
  }
}
