import { Injectable } from '@nestjs/common';
import { ReportReason, ReportStatus, ReportTargetType, NotificationType } from '@prisma/client';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { TargetValidatorRegistry } from '../../common/domain/target-validator.registry';
import { NotificationsService } from '../notifications/notifications.service';
import { AdminAuditLogService } from '../../common/services/admin-audit-log.service';
import { AppException } from '../../common/exceptions/app.exception';
import { ErrorCode } from '../../common/constants/error-codes';
import { CreateReportDto } from './dto/report.dto';
import { QueryReportDto } from './dto/query-report.dto';

const REPORT_SELECT = {
  id: true,
  reporterId: true,
  reporter: { select: { nickname: true } },
  targetType: true,
  targetId: true,
  reason: true,
  description: true,
  status: true,
  resolvedBy: true,
  createdAt: true,
  resolvedAt: true,
} as const;

/**
 * 신고(Report)는 Reaction과 마찬가지로 TargetValidatorRegistry를 통해 대상을 검증한다
 * (3단계에서 설계, 6단계 Reactions에 이어 이번이 두 번째 실전 적용).
 * POST/COMMENT/USER 각 모듈이 등록해 둔 검증기를 그대로 재사용하므로,
 * 이 서비스는 Posts/Comments/Users 모듈을 전혀 import하지 않는다.
 */
@Injectable()
export class ReportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly targetValidatorRegistry: TargetValidatorRegistry,
    private readonly notificationsService: NotificationsService,
    private readonly auditLog: AdminAuditLogService,
  ) {}

  async create(reporterId: string, dto: CreateReportDto) {
    const targetType = dto.targetType as ReportTargetType;

    if (targetType === ReportTargetType.USER && dto.targetId === reporterId) {
      throw new AppException(ErrorCode.CANNOT_REPORT_SELF);
    }

    const validator = this.targetValidatorRegistry.get(targetType);
    if (!validator) {
      throw new AppException(ErrorCode.INVALID_REPORT_TARGET);
    }

    const exists = await validator.exists(dto.targetId);
    if (!exists) {
      throw new AppException(ErrorCode.RESOURCE_NOT_FOUND);
    }

    const pending = await this.prisma.report.findFirst({
      where: { reporterId, targetType, targetId: dto.targetId, status: ReportStatus.PENDING },
    });
    if (pending) {
      throw new AppException(ErrorCode.ALREADY_REPORTED);
    }

    const report = await this.prisma.report.create({
      data: {
        reporterId,
        targetType,
        targetId: dto.targetId,
        reason: dto.reason as ReportReason,
        description: dto.description,
      },
      select: REPORT_SELECT,
    });

    // 신고자 본인에게만 접수 알림을 보낸다. actorId를 지정하지 않는 이유: actorId는 "타인이 한 행동"을
    // 의미하는데, 이 알림은 시스템이 신고자 본인에게 보내는 상태 알림이라 actorId===userId가 되어
    // NotificationsService.create()의 "자기 알림 방지" 가드에 걸려 발송되지 않기 때문이다.
    // 신고 대상자에게는 어떤 알림도 보내지 않는다 - 신고 여부/신고자 정보를 노출하지 않기 위함.
    await this.notificationsService.create({
      userId: reporterId,
      type: NotificationType.REPORT,
      targetType,
      targetId: dto.targetId,
      message: '신고가 접수되었습니다. 검토 후 처리 결과를 알려드리겠습니다.',
    });

    return this.toResponse(report);
  }

  async findAllForAdmin(query: QueryReportDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const where = query.status ? { status: query.status as ReportStatus } : {};

    const [reports, total] = await Promise.all([
      this.prisma.report.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        select: REPORT_SELECT,
      }),
      this.prisma.report.count({ where }),
    ]);

    return { items: reports.map((r) => this.toResponse(r)), meta: { page, limit, total } };
  }

  /** 모더레이터/관리자가 신고를 처리(RESOLVED) 또는 반려(REJECTED)한다. */
  async resolve(adminId: string, reportId: string, status: 'RESOLVED' | 'REJECTED') {
    const report = await this.prisma.report.findUnique({ where: { id: reportId } });
    if (!report) {
      throw new AppException(ErrorCode.REPORT_NOT_FOUND);
    }
    if (report.status !== ReportStatus.PENDING) {
      throw new AppException(ErrorCode.REPORT_ALREADY_RESOLVED);
    }

    const updated = await this.prisma.report.update({
      where: { id: reportId },
      data: {
        status: status as ReportStatus,
        resolvedBy: adminId,
        resolvedAt: new Date(),
      },
      select: REPORT_SELECT,
    });

    // 이번에도 신고자 본인에게만 알린다. 신고 대상자는 이 흐름 어디에도 등장하지 않는다.
    await this.notificationsService.create({
      userId: report.reporterId,
      type: NotificationType.REPORT,
      targetType: report.targetType,
      targetId: report.targetId,
      message:
        status === ReportStatus.RESOLVED
          ? '신고하신 내용이 검토되어 조치되었습니다.'
          : '신고하신 내용을 검토했으나, 반려되었습니다.',
    });

    await this.auditLog.record({
      adminId,
      action: status === ReportStatus.RESOLVED ? 'REPORT_RESOLVE' : 'REPORT_REJECT',
      targetType: report.targetType,
      targetId: report.targetId,
      meta: { reportId },
    });

    return this.toResponse(updated);
  }

  private toResponse(report: {
    id: string;
    reporterId: string;
    reporter: { nickname: string };
    targetType: ReportTargetType;
    targetId: string;
    reason: ReportReason;
    description: string | null;
    status: ReportStatus;
    resolvedBy: string | null;
    createdAt: Date;
    resolvedAt: Date | null;
  }) {
    return {
      id: report.id,
      reporterId: report.reporterId,
      reporterNickname: report.reporter.nickname,
      targetType: report.targetType,
      targetId: report.targetId,
      reason: report.reason,
      description: report.description,
      status: report.status,
      resolvedBy: report.resolvedBy,
      createdAt: report.createdAt,
      resolvedAt: report.resolvedAt,
    };
  }
}
