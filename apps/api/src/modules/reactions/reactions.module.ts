import { Module } from '@nestjs/common';
import { PostReactionsController } from './post-reactions.controller';
import { CommentReactionsController } from './comment-reactions.controller';
import { ReactionsService } from './reactions.service';
import { NotificationsModule } from '../notifications/notifications.module';
import { RankingModule } from '../ranking/ranking.module';

@Module({
  imports: [NotificationsModule, RankingModule],
  controllers: [PostReactionsController, CommentReactionsController],
  providers: [ReactionsService],
})
export class ReactionsModule {}
