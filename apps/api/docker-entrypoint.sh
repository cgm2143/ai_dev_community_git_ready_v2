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

# Prisma Migration 기반 배포. db push(--accept-data-loss)를 제거하고 버전관리된 마이그레이션만 적용한다.
#  - uuid_generate_v7() 함수: 최초 마이그레이션(20260101000000_init)에 포함.
#  - 전문검색용 search_vector 컬럼 + GIN 인덱스: 20260101000100_fts_search_vector 마이그레이션에서 멱등 생성.
# ⚠️ db push로 스키마가 이미 존재하는 "기존 운영 DB"는 최초 1회 baseline 처리가 필요하다(DEPLOYMENT.md 참고):
#     railway run npx prisma migrate resolve --applied 20260101000000_init
echo "[entrypoint] Prisma 마이그레이션 적용 중 (migrate deploy)..."
npx prisma migrate deploy --schema=prisma/schema.prisma

echo "[entrypoint] API 서버를 시작합니다."
exec node dist/main.js
