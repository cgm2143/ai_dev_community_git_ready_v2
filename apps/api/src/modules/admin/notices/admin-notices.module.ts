import { Module } from '@nestjs/common';
import { AdminNoticesController } from './admin-notices.controller';
import { AdminNoticesService } from './admin-notices.service';
import { PostsModule } from '../../posts/posts.module';
import { NotificationsModule } from '../../notifications/notifications.module';

@Module({
  imports: [PostsModule, NotificationsModule],
  controllers: [AdminNoticesController],
  providers: [AdminNoticesService],
})
export class AdminNoticesModule {}
