-- Prisma는 uuid_generate_v7()을 기본 제공하지 않으므로 직접 정의한다.
-- (참고: PostgreSQL 18+는 네이티브 uuidv7() 함수를 제공할 예정이나, 그 이전 버전 호환을 위해 함수로 구현)

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

  uuid_bytes = set_byte(uuid_bytes, 6, (get_byte(uuid_bytes, 6) & 15) | 112);
  uuid_bytes = set_byte(uuid_bytes, 8, (get_byte(uuid_bytes, 8) & 63) | 128);

  RETURN encode(uuid_bytes, 'hex')::uuid;
END;
$$
LANGUAGE plpgsql
VOLATILE;
