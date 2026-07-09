export const MAIL_QUEUE = Symbol('MAIL_QUEUE');

export const MAIL_QUEUE_NAME = 'mail';

export interface MailJobData {
  to: string;
  subject: string;
  html: string;
}

/**
 * 메일 발송 재시도 정책: 30초 → 2분 → 10분 (최초 시도 포함 총 4회 시도, 재시도는 3회).
 * Worker의 backoffStrategy에서 attemptsMade(1부터 시작)를 인덱스로 사용한다.
 */
export const MAIL_RETRY_DELAYS_MS = [30_000, 120_000, 600_000];
export const MAIL_MAX_ATTEMPTS = MAIL_RETRY_DELAYS_MS.length + 1; // 최초 1회 + 재시도 3회

export const NOTIFICATION_BROADCAST_QUEUE = Symbol('NOTIFICATION_BROADCAST_QUEUE');
export const NOTIFICATION_BROADCAST_QUEUE_NAME = 'notification-broadcast';

/**
 * 공지(NOTICE) 알림처럼 전체 회원을 대상으로 하는 대량 발송 작업 하나의 페이로드.
 * 커서(afterUserId) 기반으로 batchSize만큼 처리한 뒤, 다음 배치를 새 작업으로 스스로
 * 다시 큐에 적재하는 재귀적 팬아웃(fan-out) 패턴을 사용한다 - 회원 수가 아무리 많아도
 * 하나의 거대한 작업이 Worker를 오래 점유하지 않고, 배치 사이사이 다른 작업도 처리될 수 있다.
 */
export interface NotificationBroadcastJobData {
  type: 'COMMENT' | 'REPLY' | 'LIKE' | 'NOTICE';
  message: string;
  actorId?: string;
  targetType?: string;
  targetId?: string;
  batchSize: number;
  /** 이 사용자 id 이후부터 이어서 처리한다 (오름차순 id 커서). 최초 실행 시 undefined. */
  afterUserId?: string;
}

export const RANKING_RECALCULATION_QUEUE = Symbol('RANKING_RECALCULATION_QUEUE');
export const RANKING_RECALCULATION_QUEUE_NAME = 'ranking-recalculation';
export const RANKING_RECALCULATION_JOB_NAME = 'recalculate-all';
/** BullMQ 반복 작업 주기 - 인기글 랭킹 전체 재검증(증분 갱신 오차 보정)을 5분마다 수행한다. */
export const RANKING_RECALCULATION_INTERVAL_MS = 5 * 60 * 1000;
