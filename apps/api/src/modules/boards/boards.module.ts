import { Module } from '@nestjs/common';
import { BoardsController } from './boards.controller';
import { AdminBoardsController } from './admin-boards.controller';
import { BoardsService } from './boards.service';
import { PostsModule } from '../posts/posts.module';

@Module({
  imports: [PostsModule],
  controllers: [BoardsController, AdminBoardsController],
  providers: [BoardsService],
  exports: [BoardsService],
})
export class BoardsModule {}
