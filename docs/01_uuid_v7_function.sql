-- 01_uuid_v7_function.sql
-- Prisma는 uuid_generate_v7()을 기본 제공하지 않으므로, 최초 마이그레이션 시
-- `prisma migrate dev --create-only` 로 빈 마이그레이션을 만든 뒤 아래 SQL을 수동으로 추가합니다.
-- (참고: PostgreSQL 18+ 는 네이티브 uuidv7() 함수를 제공할 예정이나, 그 이전 버전 호환을 위해 함수로 구현합니다.)

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE OR REPLACE FUNCTION uuid_generate_v7()
RETURNS uuid
AS $$
DECLARE
  unix_ts_ms   bytea;
  uuid_bytes   bytea;
BEGIN
  unix_ts_ms = substring(int8send(floor(extract(epoch FROM clock_timestamp()) * 1000)::bigint) FROM 3);

  uuid_bytes = unix_ts_ms || gen_random_bytes(10);

  -- 버전(7)과 variant(RFC 4122) 비트 설정
  uuid_bytes = set_byte(uuid_bytes, 6, (get_byte(uuid_bytes, 6) & 15) | 112);
  uuid_bytes = set_byte(uuid_bytes, 8, (get_byte(uuid_bytes, 8) & 63) | 128);

  RETURN encode(uuid_bytes, 'hex')::uuid;
END;
$$
LANGUAGE plpgsql
VOLATILE;

-- 검증: 아래 쿼리로 생성된 값이 시간순으로 정렬되는지 확인 가능
-- SELECT uuid_generate_v7() FROM generate_series(1, 5);
