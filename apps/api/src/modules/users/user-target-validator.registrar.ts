import { Injectable, OnModuleInit } from '@nestjs/common';
import { UserStatus } from '@prisma/client';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { TargetValidator } from '../../common/domain/target-validator.interface';
import { TargetValidatorRegistry } from '../../common/domain/target-validator.registry';

/**
 * UsersModule 부트스트랩 시 TargetValidatorRegistry에 'USER' 검증기를 등록한다.
 * 신고(Report) 기능에서 "사용자 자체"를 신고 대상으로 다룰 때 사용된다.
 * User는 자기 자신이 곧 소유자이므로 getOwnerId()는 입력받은 id를 그대로 반환한다.
 */
@Injectable()
export class UserTargetValidatorRegistrar implements OnModuleInit, TargetValidator {
  constructor(
    private readonly prisma: PrismaService,
    private readonly registry: TargetValidatorRegistry,
  ) {}

  onModuleInit(): void {
    this.registry.register('USER', this);
  }

  async exists(targetId: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({ where: { id: targetId } });
    return user !== null && user.status !== UserStatus.WITHDRAWN;
  }

  async getOwnerId(targetId: string): Promise<string | null> {
    return targetId;
  }
}
