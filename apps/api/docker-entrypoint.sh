#!/bin/sh
set -e

echo "[entrypoint] Prisma 스키마를 데이터베이스에 동기화 중 (db push)..."
npx prisma db push --schema=prisma/schema.prisma --accept-data-loss --skip-generate

echo "[entrypoint] 애플리케이션을 시작합니다."
exec node dist/main.js
