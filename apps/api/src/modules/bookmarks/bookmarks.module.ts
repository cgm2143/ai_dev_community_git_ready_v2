import { Module } from '@nestjs/common';
import { PostBookmarkController } from './post-bookmark.controller';
import { BookmarksController } from './bookmarks.controller';
import { BookmarksService } from './bookmarks.service';

@Module({
  controllers: [PostBookmarkController, BookmarksController],
  providers: [BookmarksService],
})
export class BookmarksModule {}
