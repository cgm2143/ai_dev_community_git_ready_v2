import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { OptionalAuth } from '../../common/decorators/optional-auth.decorator';
import { RequireEmailVerified } from '../../common/decorators/require-email-verified.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/types/jwt-payload.interface';
import { CommentsService } from './comments.service';
import { UpdateCommentDto } from './dto/comment.dto';
import { CommentResponseDto } from './dto/comment-response.dto';

@ApiTags('comments')
@Controller('comments')
export class CommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  @OptionalAuth()
  @Get(':id/replies')
  @ApiOperation({ summary: '특정 최상위 댓글의 대댓글 목록 조회 (지연 로딩)' })
  @ApiResponse({ status: 200, type: [CommentResponseDto] })
  async findReplies(@Param('id') id: string, @CurrentUser() user?: AuthenticatedUser) {
    return this.commentsService.findReplies(id, user?.id);
  }

  @RequireEmailVerified()
  @Patch(':id')
  @ApiOperation({ summary: '댓글 수정 (본인 댓글만)' })
  @ApiResponse({ status: 200, type: CommentResponseDto })
  async update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateCommentDto,
  ) {
    return this.commentsService.update(user.id, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: '댓글 삭제 (Soft Delete, 본인 댓글이거나 COMMENT_DELETE_ANY 권한 필요)' })
  async remove(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string): Promise<void> {
    await this.commentsService.remove(user.id, user.role, id);
  }
}
