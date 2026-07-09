import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../../common/decorators/roles.decorator';
import { AdminAuditLogService } from '../../../common/services/admin-audit-log.service';
import { QueryAdminLogDto } from './dto/query-admin-log.dto';

/**
 * 조회 전용 컨트롤러. 실제 로그 적재는 AdminAuditLogService.record()를 통해
 * 이번 단계의 다른 모든 관리자 액션(회원 정지/역할 변경, 공지 지정, 금칙어/IP 차단,
 * 설정 변경, 9단계의 신고 처리)에서 이미 호출하고 있다.
 */
@ApiTags('admin-logs')
@Roles('ADMIN', 'SUPER_ADMIN')
@Controller('admin/logs')
export class AdminLogsController {
  constructor(private readonly auditLog: AdminAuditLogService) {}

  @Get()
  @ApiOperation({ summary: '관리자 행위 로그 조회 (action으로 필터 가능)' })
  async findAll(@Query() query: QueryAdminLogDto) {
    return this.auditLog.findAll(query.page ?? 1, query.limit ?? 20, query.action);
  }
}
