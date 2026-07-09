import { Injectable, OnModuleInit } from '@nestjs/common';
import { PostStatus } from '@prisma/client';
import { PrismaService } from '../../../infra/prisma/prisma.service';
import { TargetValidator } from '../../../common/domain/target-validator.interface';
import { TargetValidatorRegistry } from '../../../common/domain/target-validator.registry';

/**
 * PostsModule 부트스트랩 시 TargetValidatorRegistry에 'POST' 검증기를 등록한다.
 * Reactions/Report 모듈은 PostsModule을 직접 import하지 않고 이 레지스트리를 통해서만
 * 게시글 존재 여부를 확인한다 (순환 의존 방지).
 */
@Injectable()
export class PostTargetValidatorRegistrar implements OnModuleInit, TargetValidator {
  constructor(
    private readonly prisma: PrismaService,
    private readonly registry: TargetValidatorRegistry,
  ) {}

  onModuleInit(): void {
    this.registry.register('POST', this);
  }

  async exists(targetId: string): Promise<boolean> {
    const post = await this.prisma.post.findUnique({ where: { id: targetId } });
    return post !== null && post.status === PostStatus.PUBLISHED && !post.deletedAt;
  }

  async getOwnerId(targetId: string): Promise<string | null> {
    const post = await this.prisma.post.findUnique({ where: { id: targetId } });
    return post?.authorId ?? null;
  }
}
