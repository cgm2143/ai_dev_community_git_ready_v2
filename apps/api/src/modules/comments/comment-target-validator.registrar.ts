import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { TargetValidator } from '../../common/domain/target-validator.interface';
import { TargetValidatorRegistry } from '../../common/domain/target-validator.registry';

/** CommentsModule 부트스트랩 시 TargetValidatorRegistry에 'COMMENT' 검증기를 등록한다. */
@Injectable()
export class CommentTargetValidatorRegistrar implements OnModuleInit, TargetValidator {
  constructor(
    private readonly prisma: PrismaService,
    private readonly registry: TargetValidatorRegistry,
  ) {}

  onModuleInit(): void {
    this.registry.register('COMMENT', this);
  }

  async exists(targetId: string): Promise<boolean> {
    const comment = await this.prisma.comment.findUnique({ where: { id: targetId } });
    return comment !== null && !comment.deletedAt;
  }

  async getOwnerId(targetId: string): Promise<string | null> {
    const comment = await this.prisma.comment.findUnique({ where: { id: targetId } });
    return comment?.authorId ?? null;
  }
}
