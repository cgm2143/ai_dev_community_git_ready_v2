import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infra/prisma/prisma.service';

export interface RecordAuditLogParams {
  adminId: string;
  action: string;
  targetType?: string;
  targetId?: string;
  meta?: Record<string, unknown>;
}

/**
 * 모든 관리자 행위를 `logs` 테이블에 남기는 단일 진실 공급원.
 * 회원 정지/역할 변경, 공지 등록, 금칙어/IP 차단 등록, 설정 변경, 신고 처리 등
 * "관리자가 무언가를 바꾼" 모든 지점에서 이 서비스 하나만 호출한다.
 */
@Injectable()
export class AdminAuditLogService {
  constructor(private readonly prisma: PrismaService) {}

  async record(params: RecordAuditLogParams): Promise<void> {
    await this.prisma.log.create({
      data: {
        adminId: params.adminId,
        action: params.action,
        targetType: params.targetType,
        targetId: params.targetId,
        meta: params.meta,
      },
    });
  }

  async findAll(page: number, limit: number, action?: string) {
    const where = action ? { action } : {};
    const [logs, total] = await Promise.all([
      this.prisma.log.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: { admin: { select: { nickname: true } } },
      }),
      this.prisma.log.count({ where }),
    ]);

    return {
      items: logs.map((log) => ({
        id: log.id,
        adminId: log.adminId,
        adminNickname: log.admin.nickname,
        action: log.action,
        targetType: log.targetType,
        targetId: log.targetId,
        meta: log.meta,
        createdAt: log.createdAt,
      })),
      meta: { page, limit, total },
    };
  }
}
