/**
 * Reaction, Report 등 "다형성 대상(targetType + targetId)"을 다루는 기능이 공통으로 의존하는 인터페이스.
 * 각 도메인 모듈(Posts, Comments, ...)이 자신의 대상 타입에 대한 구현체를 만들어
 * TargetValidatorRegistry에 등록한다. Reactions/Report 서비스는 이 인터페이스만 알면 되고,
 * 실제 Post/Comment 테이블 구조는 몰라도 된다.
 */
export interface TargetValidator {
  /** 대상이 실제로 존재하고(삭제되지 않고) 반응/신고가 가능한 상태인지 확인한다. */
  exists(targetId: string): Promise<boolean>;

  /** 대상의 소유자(작성자) id. 알림 발송(8단계) 등에서 "누구에게 알릴지" 결정할 때 재사용한다. */
  getOwnerId(targetId: string): Promise<string | null>;
}
