import { Controller, Delete, HttpCode, HttpStatus, Param, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { RequireEmailVerified } from '../../common/decorators/require-email-verified.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/types/jwt-payload.interface';
import { BookmarksService } from './bookmarks.service';

@ApiTags('bookmarks')
@RequireEmailVerified()
@Controller('posts/:id/bookmark')
export class PostBookmarkController {
  constructor(private readonly bookmarksService: BookmarksService) {}

  @Post()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: '게시글 북마크 추가' })
  async add(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string): Promise<void> {
    await this.bookmarksService.add(user.id, id);
  }

  @Delete()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: '게시글 북마크 해제' })
  async remove(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string): Promise<void> {
    await this.bookmarksService.remove(user.id, id);
  }
}
