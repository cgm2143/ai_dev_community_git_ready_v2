import { Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { PostsService } from './posts.service';
import { QueryPostDto } from './dto/query-post.dto';
import { PostDetailDto, PostListItemDto } from './dto/post-response.dto';

/**
 * Soft Delete된 게시글의 조회/복구는 관리자만 가능하다 (일반 사용자는 삭제 후 복구 불가).
 * `@Roles('ADMIN', 'SUPER_ADMIN')`으로 역할 자체를 제한한다.
 */
@ApiTags('admin-posts')
@Roles('ADMIN', 'SUPER_ADMIN')
@Controller('admin/posts')
export class AdminPostsController {
  constructor(private readonly postsService: PostsService) {}

  @Get('deleted')
  @ApiOperation({ summary: '삭제된(Soft Delete) 게시글 목록 조회' })
  @ApiResponse({ status: 200, type: [PostListItemDto] })
  async findDeleted(@Query() query: QueryPostDto) {
    return this.postsService.findDeletedForAdmin(query.page ?? 1, query.limit ?? 20);
  }

  @Post(':id/restore')
  @ApiOperation({ summary: '삭제된 게시글 복구' })
  @ApiResponse({ status: 200, type: PostDetailDto })
  async restore(@Param('id') id: string) {
    return this.postsService.restore(id);
  }
}
