import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { OptionalAuth } from '../../common/decorators/optional-auth.decorator';
import { RequireEmailVerified } from '../../common/decorators/require-email-verified.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/types/jwt-payload.interface';
import { CommentsService } from './comments.service';
import { CreateCommentDto } from './dto/comment.dto';
import { QueryCommentDto } from './dto/query-comment.dto';
import { CommentResponseDto } from './dto/comment-response.dto';

@ApiTags('comments')
@Controller('posts/:postId/comments')
export class PostCommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  @OptionalAuth()
  @Get()
  @ApiOperation({ summary: '최상위 댓글 목록 조회 (대댓글은 /comments/:id/replies로 지연 로딩)' })
  @ApiResponse({ status: 200, type: [CommentResponseDto] })
  async findTopLevel(
    @Param('postId') postId: string,
    @Query() query: QueryCommentDto,
    @CurrentUser() user?: AuthenticatedUser,
  ) {
    return this.commentsService.findTopLevel(postId, query, user?.id);
  }

  @RequireEmailVerified()
  @Post()
  @ApiOperation({ summary: '댓글/대댓글 작성 (parentId 지정 시 대댓글, 2단계 구조만 허용)' })
  @ApiResponse({ status: 201, type: CommentResponseDto })
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Param('postId') postId: string,
    @Body() dto: CreateCommentDto,
  ) {
    return this.commentsService.create(user.id, postId, dto);
  }
}
