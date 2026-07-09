import { Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Query } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/types/jwt-payload.interface';
import { NotificationsService } from './notifications.service';
import { QueryNotificationDto } from './dto/query-notification.dto';
import { NotificationResponseDto } from './dto/notification-response.dto';

@ApiTags('notifications')
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: '내 알림 목록 조회 (unreadOnly=true로 안 읽은 알림만 필터 가능)' })
  @ApiResponse({ status: 200, type: [NotificationResponseDto] })
  async findMine(@CurrentUser() user: AuthenticatedUser, @Query() query: QueryNotificationDto) {
    return this.notificationsService.findMine(user.id, query.page ?? 1, query.limit ?? 20, query.unreadOnly);
  }

  @Patch('read-all')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: '전체 알림 읽음 처리' })
  async markAllAsRead(@CurrentUser() user: AuthenticatedUser): Promise<void> {
    await this.notificationsService.markAllAsRead(user.id);
  }

  @Patch(':id/read')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: '알림 읽음 처리' })
  async markAsRead(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string): Promise<void> {
    await this.notificationsService.markAsRead(user.id, id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: '알림 삭제' })
  async remove(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string): Promise<void> {
    await this.notificationsService.remove(user.id, id);
  }
}
