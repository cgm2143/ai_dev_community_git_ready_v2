# syntax=docker/dockerfile:1

# ---- deps: 의존성만 먼저 설치해 레이어 캐시 극대화 ----
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci

# ---- build: Prisma Client 생성 + TypeScript 빌드 ----
FROM node:20-alpine AS build
WORKDIR /app
# Prisma가 OpenSSL 버전을 감지할 때 `openssl` 커맨드라인 도구를 직접 실행해서 확인하는데,
# node:20-alpine 기본 이미지에는 이 도구(바이너리)가 빠져 있어(라이브러리 자체는 있음)
# 감지에 실패하고 잘못된 버전(1.1.x)으로 잘못 추측한 뒤, 실제로는 맞지 않는 엔진을 실행하려다
# "Could not parse schema engine response... is not valid JSON" 오류로 이어진다.
# openssl 패키지를 설치해 감지 도구 자체를 제공하면 정확한 버전(3.x)을 잡아낸다.
RUN apk add --no-cache openssl
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate --schema=prisma/schema.prisma
RUN npm run build

# ---- production deps: 운영에 필요한 패키지만 재설치 후 Prisma Client 재생성 ----
FROM node:20-alpine AS prod-deps
WORKDIR /app
RUN apk add --no-cache openssl
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev
COPY --from=build /app/prisma ./prisma
RUN npx prisma generate --schema=prisma/schema.prisma

# ---- runner: 최소 런타임 이미지 ----
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
# 런타임에도 docker-entrypoint.sh가 `prisma migrate deploy`를 실행하므로 여기도 필요하다.
RUN apk add --no-cache openssl
RUN addgroup -S nodejs && adduser -S nestjs -G nodejs

COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=prod-deps /app/prisma ./prisma
COPY package.json ./
COPY docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh && chown -R nestjs:nodejs /app

USER nestjs

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/v1/health', (res) => process.exit(res.statusCode === 200 ? 0 : 1)).on('error', () => process.exit(1))"

ENTRYPOINT ["./docker-entrypoint.sh"]
