import { Body, Controller, Get, Param, Patch, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../../common/decorators/roles.decorator';
import { RequirePermission } from '../../../common/decorators/require-permission.decorator';
import { PermissionCode } from '../../../common/constants/permission-codes';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../auth/types/jwt-payload.interface';
import { AdminUsersService } from './admin-users.service';
import { QueryAdminUserDto, UpdateUserStatusDto, UpdateUserRoleDto } from './dto/admin-user.dto';

@ApiTags('admin-users')
@Roles('ADMIN', 'SUPER_ADMIN')
@RequirePermission(PermissionCode.USER_BAN)
@Controller('admin/users')
export class AdminUsersController {
  constructor(private readonly adminUsersService: AdminUsersService) {}

  @Get()
  @ApiOperation({ summary: '회원 목록/검색 (닉네임/이메일 키워드, 상태 필터)' })
  async findAll(@Query() query: QueryAdminUserDto) {
    return this.adminUsersService.findAll(query);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: '계정 정지/활성화 (정지 시 모든 세션 즉시 종료)' })
  async updateStatus(
    @CurrentUser() admin: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateUserStatusDto,
  ) {
    return this.adminUsersService.updateStatus(admin.id, id, dto.status);
  }

  @Patch(':id/role')
  @ApiOperation({ summary: '권한(역할) 변경 (SUPER_ADMIN 승격은 SUPER_ADMIN만 가능)' })
  async updateRole(
    @CurrentUser() admin: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateUserRoleDto,
  ) {
    return this.adminUsersService.updateRole(admin.id, admin.role, id, dto.roleName);
  }
}
