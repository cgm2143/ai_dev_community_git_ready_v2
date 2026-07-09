import { Body, Controller, Param, Patch } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../../common/decorators/roles.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../auth/types/jwt-payload.interface';
import { AdminNoticesService } from './admin-notices.service';
import { SetNoticeDto } from './dto/set-notice.dto';

/**
 * 공지 지정은 ADMIN/SUPER_ADMIN만 가능하다 (MODERATOR 제외 - 전체 알림을 유발하는
 * 민감한 작업이므로 더 높은 신뢰 수준을 요구한다).
 */
@ApiTags('admin-notices')
@Roles('ADMIN', 'SUPER_ADMIN')
@Controller('admin/posts')
export class AdminNoticesController {
  constructor(private readonly adminNoticesService: AdminNoticesService) {}

  @Patch(':id/notice')
  @ApiOperation({ summary: '게시글 공지 지정/해제 (지정 시 전체 회원에게 알림 브로드캐스트)' })
  async setNotice(
    @CurrentUser() admin: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: SetNoticeDto,
  ) {
    return this.adminNoticesService.setNotice(admin.id, id, dto.isNotice);
  }
}
