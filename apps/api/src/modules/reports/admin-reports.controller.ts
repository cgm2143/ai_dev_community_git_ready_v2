import { Body, Controller, Get, Param, Patch, Query } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { PermissionCode } from '../../common/constants/permission-codes';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/types/jwt-payload.interface';
import { ReportsService } from './reports.service';
import { QueryReportDto } from './dto/query-report.dto';
import { ResolveReportDto } from './dto/report.dto';
import { ReportResponseDto } from './dto/report-response.dto';

/**
 * 신고 처리는 MODERATOR 이상만 가능하다 (ADMIN/SUPER_ADMIN도 당연히 포함).
 * Role 축(MODERATOR 이상)과 Permission 축(REPORT_RESOLVE)을 함께 적용해,
 * 향후 "신고 처리 권한만 회수"하는 세분화도 role_permissions 수정만으로 가능하게 했다.
 */
@ApiTags('admin-reports')
@Roles('MODERATOR', 'ADMIN', 'SUPER_ADMIN')
@RequirePermission(PermissionCode.REPORT_RESOLVE)
@Controller('admin/reports')
export class AdminReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get()
  @ApiOperation({ summary: '신고 목록 조회 (status로 필터 가능)' })
  @ApiResponse({ status: 200, type: [ReportResponseDto] })
  async findAll(@Query() query: QueryReportDto) {
    return this.reportsService.findAllForAdmin(query);
  }

  @Patch(':id')
  @ApiOperation({ summary: '신고 처리 (RESOLVED/REJECTED)' })
  @ApiResponse({ status: 200, type: ReportResponseDto })
  async resolve(
    @CurrentUser() admin: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: ResolveReportDto,
  ) {
    return this.reportsService.resolve(admin.id, id, dto.status);
  }
}
