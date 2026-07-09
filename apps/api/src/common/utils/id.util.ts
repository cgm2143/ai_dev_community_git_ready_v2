import { uuidv7 } from 'uuidv7';

/**
 * 애플리케이션 레벨에서 미리 ID가 필요한 경우(배치 작업, 첨부파일 사전 발급 등)
 * DB의 uuid_generate_v7() 함수와 동일한 포맷(RFC 9562 UUIDv7)의 ID를 생성한다.
 * 일반적인 단일 row 생성은 Prisma 스키마의 @default(dbgenerated(...))에 맡기고,
 * 이 유틸은 ID를 미리 알아야 하는 경우에만 사용한다.
 */
export function generateId(): string {
  return uuidv7();
}
