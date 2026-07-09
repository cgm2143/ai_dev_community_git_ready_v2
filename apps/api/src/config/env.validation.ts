import { z } from 'zod';

/**
 * 애플리케이션 부트스트랩 시점에 필요한 모든 환경변수를 Zod로 검증한다.
 * NestJS ConfigModule.forRoot({ validate }) 에 연결해, 잘못된 설정으로
 * 앱이 기동되는 것을 원천 차단한다. 검증 실패 시 각 필드별 오류를 모아
 * 한 번에 보여줘서 반복적인 재시도 없이 설정을 고칠 수 있게 한다.
 */
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  API_PREFIX: z.string().min(1).default('v1'),

  DATABASE_URL: z.string().url(),

  // Railway/Render 등은 REDIS_URL 하나로 제공하는 경우가 많아 이를 우선 지원한다.
  // REDIS_URL이 있으면 아래 개별 값은 무시되므로, HOST에 기본값을 두어 URL만 설정해도 검증을 통과시킨다.
  REDIS_URL: z.string().url().optional(),
  REDIS_HOST: z.string().min(1).default('localhost'),
  REDIS_PORT: z.coerce.number().int().min(1).max(65535).default(6379),
  REDIS_PASSWORD: z.string().optional(),

  // 큐(BullMQ) 전용 Redis 커넥션. 지정하지 않으면 위 REDIS_* 값을 그대로 사용하되,
  // 운영 규모가 커지면 QUEUE_REDIS_URL 또는 QUEUE_REDIS_HOST/PORT/PASSWORD만 채워서 분리할 수 있다.
  QUEUE_REDIS_URL: z.string().url().optional(),
  QUEUE_REDIS_HOST: z.string().min(1).optional(),
  QUEUE_REDIS_PORT: z.coerce.number().int().min(1).max(65535).optional(),
  QUEUE_REDIS_PASSWORD: z.string().optional(),

  JWT_ACCESS_SECRET: z.string().min(32, 'JWT_ACCESS_SECRET은 최소 32자 이상이어야 합니다.'),
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET은 최소 32자 이상이어야 합니다.'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('14d'),

  CORS_ORIGIN: z.string().default('http://localhost:3001'),
  FRONTEND_URL: z.string().url().default('http://localhost:3001'),

  MAIL_HOST: z.string().min(1),
  MAIL_PORT: z.coerce.number().int().min(1).max(65535).default(587),
  MAIL_USER: z.string().min(1),
  MAIL_PASSWORD: z.string().min(1),
  MAIL_FROM: z.string().min(1).default('devhub <no-reply@devhub.example.com>'),
  MAIL_SECURE: z
    .string()
    .default('false')
    .transform((value) => value === 'true'),

  S3_ENDPOINT: z.string().url(),
  S3_REGION: z.string().default('us-east-1'),
  S3_BUCKET: z.string().min(1),
  S3_ACCESS_KEY_ID: z.string().min(1),
  S3_SECRET_ACCESS_KEY: z.string().min(1),
  S3_PUBLIC_URL_BASE: z.string().url(),
  S3_FORCE_PATH_STYLE: z
    .string()
    .default('true')
    .transform((value) => value === 'true'),

  // 공지 등 전체 회원 대상 알림 발송 시 한 배치에서 처리할 사용자 수 (BullMQ 재귀 팬아웃의 배치 크기)
  NOTIFICATION_BROADCAST_BATCH_SIZE: z.coerce.number().int().min(10).max(5000).default(500),

  SWAGGER_ENABLED: z
    .string()
    .default('true')
    .transform((value) => value === 'true'),
  SWAGGER_PATH: z.string().default('docs'),
});

export type EnvSchema = z.infer<typeof envSchema>;

/**
 * ConfigModule.forRoot({ validate: validateEnv }) 형태로 등록한다.
 * Joi와 달리 Zod는 검증 + 변환(coerce/transform)된 값을 그대로 반환하므로,
 * 이 반환값이 이후 configuration.ts / ConfigService가 실제로 참조하는 process.env를 대체한다.
 */
export function validateEnv(config: Record<string, unknown>): EnvSchema {
  const result = envSchema.safeParse(config);

  if (!result.success) {
    const formatted = result.error.issues
      .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
      .join('\n');
    throw new Error(`환경변수 검증에 실패했습니다:\n${formatted}`);
  }

  return result.data;
}
