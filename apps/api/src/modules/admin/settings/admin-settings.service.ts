import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../infra/prisma/prisma.service';
import { AdminAuditLogService } from '../../../common/services/admin-audit-log.service';
import { AppException } from '../../../common/exceptions/app.exception';
import { ErrorCode } from '../../../common/constants/error-codes';

@Injectable()
export class AdminSettingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLog: AdminAuditLogService,
  ) {}

  async findAll() {
    return this.prisma.setting.findMany({ orderBy: { key: 'asc' } });
  }

  async findOne(key: string) {
    const setting = await this.prisma.setting.findUnique({ where: { key } });
    if (!setting) {
      throw new AppException(ErrorCode.SETTING_NOT_FOUND);
    }
    return setting;
  }

  /** 존재하지 않는 key라도 upsert로 새로 만들 수 있게 한다 (운영 중 새 설정 항목 추가가 유연해짐). */
  async update(adminId: string, key: string, value: unknown) {
    const updated = await this.prisma.setting.upsert({
      where: { key },
      update: { value: value as Prisma.InputJsonValue },
      create: { key, value: value as Prisma.InputJsonValue },
    });

    await this.auditLog.record({
      adminId,
      action: 'SETTING_UPDATE',
      targetType: 'SETTING',
      targetId: key,
      meta: { value },
    });

    return updated;
  }
}
