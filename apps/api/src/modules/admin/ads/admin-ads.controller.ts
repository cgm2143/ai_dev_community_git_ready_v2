import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../../common/decorators/roles.decorator';
import { RequirePermission } from '../../../common/decorators/require-permission.decorator';
import { PermissionCode } from '../../../common/constants/permission-codes';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../auth/types/jwt-payload.interface';
import { AdminAdsService } from './admin-ads.service';
import { CreateAdDto, UpdateAdDto } from '../../ads/dto/ad.dto';

@ApiTags('admin-ads')
@Roles('ADMIN', 'SUPER_ADMIN')
@RequirePermission(PermissionCode.AD_MANAGE)
@Controller('admin/ads')
export class AdminAdsController {
  constructor(private readonly adminAdsService: AdminAdsService) {}

  @Get()
  @ApiOperation({ summary: '광고/배너 목록 조회' })
  async findAll() {
    return this.adminAdsService.findAll();
  }

  @Post()
  @ApiOperation({ summary: '광고/배너 등록 (purpose: AD | EVENT_BANNER)' })
  async create(@CurrentUser() admin: AuthenticatedUser, @Body() dto: CreateAdDto) {
    return this.adminAdsService.create(admin.id, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: '광고/배너 수정' })
  async update(
    @CurrentUser() admin: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateAdDto,
  ) {
    return this.adminAdsService.update(admin.id, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: '광고/배너 삭제 (Soft Delete)' })
  async remove(@CurrentUser() admin: AuthenticatedUser, @Param('id') id: string): Promise<void> {
    await this.adminAdsService.remove(admin.id, id);
  }

  @Get(':id/stats')
  @ApiOperation({ summary: '광고별 노출/클릭 통계 (CTR 포함)' })
  async getStats(@Param('id') id: string) {
    return this.adminAdsService.getStats(id);
  }
}
