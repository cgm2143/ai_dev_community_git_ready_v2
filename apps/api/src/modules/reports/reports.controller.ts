import { Body, Controller, Post } from '@nestjs/common';
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

  @Post()
  @ApiOperation({ summary: '게시글/댓글/사용자 신고' })
  @ApiResponse({ status: 201, type: ReportResponseDto })
  async create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateReportDto) {
    return this.reportsService.create(user.id, dto);
  }
}
