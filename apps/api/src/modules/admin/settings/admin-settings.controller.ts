import { Body, Controller, Get, Param, Patch } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../../common/decorators/roles.decorator';
import { RequirePermission } from '../../../common/decorators/require-permission.decorator';
import { PermissionCode } from '../../../common/constants/permission-codes';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../auth/types/jwt-payload.interface';
import { AdminSettingsService } from './admin-settings.service';
import { UpdateSettingDto } from './dto/update-setting.dto';

@ApiTags('admin-settings')
@Roles('ADMIN', 'SUPER_ADMIN')
@RequirePermission(PermissionCode.SETTING_MANAGE)
@Controller('admin/settings')
export class AdminSettingsController {
  constructor(private readonly adminSettingsService: AdminSettingsService) {}

  @Get()
  @ApiOperation({ summary: '사이트 설정 전체 조회' })
  async findAll() {
    return this.adminSettingsService.findAll();
  }

  @Patch(':key')
  @ApiOperation({ summary: '사이트 설정 항목 수정 (없으면 새로 생성)' })
  async update(
    @CurrentUser() admin: AuthenticatedUser,
    @Param('key') key: string,
    @Body() dto: UpdateSettingDto,
  ) {
    return this.adminSettingsService.update(admin.id, key, dto.value);
  }
}
