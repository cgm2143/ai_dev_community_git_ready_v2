import { Body, Controller, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { RequireEmailVerified } from '../../common/decorators/require-email-verified.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/types/jwt-payload.interface';
import { ReportsService } from './reports.service';
import { CreateReportDto } from './dto/report.dto';
import { ReportResponseDto } from './dto/report-response.dto';

@ApiTags('reports')
@RequireEmailVerified()
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  // 대량 스팸 신고(서로 다른 대상 남발)를 막는 보호 계층. 전역 100회/분과 별개로 이 라우트만
  // IP당 1시간 10회로 제한한다(기존 Throttler가 IP 기준이라 동일 방식 재사용, 새 Guard 없음).
  // 동일 대상 중복 신고 방지는 서비스의 ALREADY_REPORTED 로직이 별도로 담당하며 여기서 건드리지 않는다.
  @Throttle({ default: { limit: 10, ttl: 60 * 60 * 1000 } })
  @Post()
  @ApiOperation({ summary: '게시글/댓글/사용자 신고' })
  @ApiResponse({ status: 201, type: ReportResponseDto })
  async create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateReportDto) {
    return this.reportsService.create(user.id, dto);
  }
}
