#!/bin/sh
set -e

echo "[entrypoint] uuid_generate_v7() 함수 생성 중..."
npx prisma db execute --schema=prisma/schema.prisma --file=prisma/sql/uuid-v7-function.sql

echo "[entrypoint] Prisma 스키마를 데이터베이스에 동기화 중 (db push)..."
npx prisma db push --schema=prisma/schema.prisma --accept-data-loss --skip-generate

echo "[entrypoint] 애플리케이션을 시작합니다."
exec node dist/main.js
