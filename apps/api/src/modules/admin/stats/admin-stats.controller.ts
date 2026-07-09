import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../../common/decorators/roles.decorator';
import { AdminStatsService } from './admin-stats.service';

@ApiTags('admin-stats')
@Roles('ADMIN', 'SUPER_ADMIN', 'MODERATOR')
@Controller('admin/stats')
export class AdminStatsController {
  constructor(private readonly adminStatsService: AdminStatsService) {}

  @Get('overview')
  @ApiOperation({ summary: '대시보드 개요 통계 (회원/게시글/댓글/미처리 신고 수)' })
  async overview() {
    return this.adminStatsService.getOverview();
  }

  @Get('reports')
  @ApiOperation({ summary: '신고 통계 (유형별/처리 현황별/최다 신고 대상)' })
  async reportStats() {
    return this.adminStatsService.getReportStats();
  }
}
