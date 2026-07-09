#!/bin/sh
set -e

echo "[entrypoint] Prisma 마이그레이션 적용 중..."
npx prisma migrate deploy --schema=prisma/schema.prisma

echo "[entrypoint] 애플리케이션을 시작합니다."
exec node dist/main.js
