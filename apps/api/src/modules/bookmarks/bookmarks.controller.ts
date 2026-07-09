import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/types/jwt-payload.interface';
import { BookmarksService } from './bookmarks.service';
import { QueryBookmarkDto, BookmarkedPostResponseDto } from './dto/bookmark.dto';

@ApiTags('bookmarks')
@Controller('bookmarks')
export class BookmarksController {
  constructor(private readonly bookmarksService: BookmarksService) {}

  @Get()
  @ApiOperation({ summary: '내가 북마크한 게시글 목록 조회' })
  @ApiResponse({ status: 200, type: [BookmarkedPostResponseDto] })
  async listMine(@CurrentUser() user: AuthenticatedUser, @Query() query: QueryBookmarkDto) {
    return this.bookmarksService.listMine(user.id, query.page ?? 1, query.limit ?? 20);
  }
}
