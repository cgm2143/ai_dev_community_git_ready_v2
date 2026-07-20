import { Module } from '@nestjs/common';
import { PostsController } from './posts.controller';
import { AdminPostsController } from './admin-posts.controller';
import { TagsController } from './tags.controller';
import { PostsService } from './posts.service';
import { TagsService } from './services/tags.service';
import { PostViewService } from './services/post-view.service';
import { PostsSearchRepository } from './services/posts-search.repository';
import { PostTargetValidatorRegistrar } from './services/post-target-validator.registrar';
import { MarkdownModule } from '../../infra/markdown/markdown.module';
import { BlocksModule } from '../blocks/blocks.module';
import { AttachmentsModule } from '../attachments/attachments.module';
import { AdminWordFilterModule } from '../admin/word-filter/admin-word-filter.module';
import { RankingModule } from '../ranking/ranking.module';
import { AiModule } from '../ai/ai.module';

@Module({
  imports: [MarkdownModule, BlocksModule, AttachmentsModule, AdminWordFilterModule, RankingModule, AiModule],
  controllers: [PostsController, AdminPostsController, TagsController],
  providers: [
    PostsService,
    TagsService,
    PostViewService,
    PostsSearchRepository,
    PostTargetValidatorRegistrar,
  ],
  exports: [PostsService],
})
export class PostsModule {}
