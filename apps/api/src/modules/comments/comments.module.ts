import { Module } from '@nestjs/common';
import { PostCommentsController } from './post-comments.controller';
import { CommentsController } from './comments.controller';
import { AdminCommentsController } from './admin-comments.controller';
import { CommentsService } from './comments.service';
import { CommentTargetValidatorRegistrar } from './comment-target-validator.registrar';
import { BlocksModule } from '../blocks/blocks.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { AdminWordFilterModule } from '../admin/word-filter/admin-word-filter.module';
import { RankingModule } from '../ranking/ranking.module';

@Module({
  imports: [BlocksModule, NotificationsModule, AdminWordFilterModule, RankingModule],
  controllers: [PostCommentsController, CommentsController, AdminCommentsController],
  providers: [CommentsService, CommentTargetValidatorRegistrar],
  exports: [CommentsService],
})
export class CommentsModule {}
