import { Injectable } from '@nestjs/common';
import { TargetValidator } from './target-validator.interface';

/**
 * targetType(문자열, 예: 'POST', 'COMMENT') -> TargetValidator 매핑을 보관하는 레지스트리.
 * 각 도메인 모듈이 부트스트랩 시점(OnModuleInit)에 자기 자신을 등록한다
 * (PostsModule -> 'POST', CommentsModule -> 'COMMENT'). 순환 의존을 피하기 위해
 * Reactions/Report 모듈이 Posts/Comments 모듈을 직접 import하지 않고, 이 레지스트리를 통해서만
 * 간접적으로 대상을 검증한다.
 *
 * 새로운 반응/신고 대상이 추가되어도(예: 8단계 이후 채팅 메시지 신고) 이 클래스나
 * ReactionsService/ReportsService의 핵심 로직을 건드릴 필요 없이, 새 모듈에서
 * register()만 호출하면 된다.
 */
@Injectable()
export class TargetValidatorRegistry {
  private readonly validators = new Map<string, TargetValidator>();

  register(targetType: string, validator: TargetValidator): void {
    this.validators.set(targetType, validator);
  }

  get(targetType: string): TargetValidator | undefined {
    return this.validators.get(targetType);
  }
}
