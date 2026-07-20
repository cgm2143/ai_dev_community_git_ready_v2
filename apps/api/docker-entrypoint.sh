#!/bin/sh
set -e

# APP_ROLE로 프로세스 역할을 결정한다(미설정 시 api).
#  - api    : DB 스키마 동기화 후 HTTP 서버 기동
#  - worker : 마이그레이션은 api 서비스가 담당하므로 건너뛰고 Worker만 기동
APP_ROLE="${APP_ROLE:-api}"

if [ "$APP_ROLE" = "worker" ]; then
  echo "[entrypoint] APP_ROLE=worker - 마이그레이션을 건너뛰고 Worker를 시작합니다."
  exec node dist/worker.main.js
fi

# schema.prisma가 uuid_generate_v7()이라는 커스텀 Postgres 함수를 기본값으로 사용하는데,
# 이 함수는 Postgres가 기본 제공하지 않는다(직접 정의해야 함). 로컬 docker-compose 환경에서는
# postgres 이미지의 initdb 스크립트로 최초 1회 자동 생성되지만, Railway 같은 관리형 Postgres는
# 그 메커니즘이 없으므로 여기서 직접 실행해 준다. 이미 존재해도 안전하도록 CREATE OR REPLACE로
# 작성되어 있어 매번 재실행해도 문제없다.
echo "[entrypoint] uuid_generate_v7() 함수 생성 중..."
npx prisma db execute --schema=prisma/schema.prisma --file=prisma/sql/uuid-v7-function.sql

echo "[entrypoint] Prisma 스키마를 데이터베이스에 동기화 중 (db push)..."
npx prisma db push --schema=prisma/schema.prisma --accept-data-loss --skip-generate

echo "[entrypoint] 애플리케이션을 시작합니다."
exec node dist/main.js
