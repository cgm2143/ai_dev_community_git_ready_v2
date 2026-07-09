import { Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { CommentsService } from './comments.service';
import { QueryCommentDto } from './dto/query-comment.dto';
import { CommentResponseDto } from './dto/comment-response.dto';

@ApiTags('admin-comments')
@Roles('ADMIN', 'SUPER_ADMIN')
@Controller('admin/comments')
export class AdminCommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  @Get('deleted')
  @ApiOperation({ summary: '삭제된(Soft Delete) 댓글 목록 조회' })
  @ApiResponse({ status: 200, type: [CommentResponseDto] })
  async findDeleted(@Query() query: QueryCommentDto) {
    return this.commentsService.findDeletedForAdmin(query.page ?? 1, query.limit ?? 20);
  }

  @Post(':id/restore')
  @ApiOperation({
    summary: '삭제된 댓글 복구 (게시글이 삭제 상태면 거부 - 게시글을 먼저 복구해야 함)',
  })
  @ApiResponse({ status: 200, type: CommentResponseDto })
  async restore(@Param('id') id: string) {
    return this.commentsService.restore(id);
  }

  @Post('restore-by-post/:postId')
  @ApiOperation({
    summary: '게시글에 속한 삭제된 댓글 일괄 복구 (게시글을 먼저 복구한 뒤 호출)',
  })
  async restoreAllForPost(@Param('postId') postId: string) {
    const restoredCount = await this.commentsService.restoreAllForPost(postId);
    return { restoredCount };
  }
}
