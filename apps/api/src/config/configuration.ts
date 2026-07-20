export interface AppConfig {
  nodeEnv: string;
  port: number;
  apiPrefix: string;
  corsOrigin: string;
  frontendUrl: string;
  apiBaseUrl: string;
  swagger: {
    enabled: boolean;
    path: string;
  };
}

export interface SocialAuthConfig {
  naver: { clientId?: string; clientSecret?: string };
  kakao: { clientId?: string; clientSecret?: string };
  google: { clientId?: string; clientSecret?: string };
}

export interface DatabaseConfig {
  url: string;
}

export interface RedisConfig {
  host: string;
  port: number;
  password?: string;
}

export interface JwtConfig {
  accessSecret: string;
  accessExpiresIn: string;
  refreshSecret: string;
  refreshExpiresIn: string;
}

export interface MailConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  from: string;
  secure: boolean;
}

export interface StorageConfig {
  endpoint: string;
  region: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
  publicUrlBase: string;
  forcePathStyle: boolean;
}

export interface NotificationConfig {
  broadcastBatchSize: number;
}

/**
 * AI 기능(요약/태그 추천 등) 설정. Temperature/MaxTokens/Timeout/Retry를 코드에 하드코딩하지 않고
 * 모두 환경변수로 관리한다. apiKey가 비어 있으면 AiModule이 자동으로 StubProvider로 폴백한다.
 */
export interface AiConfig {
  provider: string;
  apiKey: string;
  model: string;
  temperature: number;
  maxTokens: number;
  timeoutMs: number;
  maxRetries: number;
}

/**
 * Railway/Render/Heroku 같은 PaaS는 Redis를 개별 HOST/PORT/PASSWORD가 아니라
 * 단일 연결 문자열(REDIS_URL, 예: redis://default:password@host:6379)로 제공하는 경우가 많다.
 * 이 헬퍼는 URL이 있으면 그것을 우선 파싱하고, 없으면 기존 개별 환경변수 방식으로 폴백한다 -
 * 로컬/Docker Compose 환경(개별 변수)과 PaaS 배포 환경(URL) 양쪽을 코드 변경 없이 모두 지원한다.
 */
function resolveRedisConfig(urlEnvKey: string, hostEnvKey: string, portEnvKey: string, passwordEnvKey: string): RedisConfig {
  const url = process.env[urlEnvKey];
  if (url) {
    try {
      const parsed = new URL(url);
      return {
        host: parsed.hostname,
        port: parsed.port ? parseInt(parsed.port, 10) : 6379,
        password: parsed.password || undefined,
      };
    } catch {
      // URL 파싱에 실패하면 개별 변수 방식으로 계속 폴백한다 (아래 로직으로 이어짐).
    }
  }

  return {
    host: process.env[hostEnvKey] ?? 'localhost',
    port: parseInt(process.env[portEnvKey] ?? '6379', 10),
    password: process.env[passwordEnvKey] || undefined,
  };
}

/**
 * ConfigModule.forRoot({ load: [configuration] }) 로 등록한다.
 * 각 모듈은 ConfigService.get<T>('app') 형태로 타입 안전하게 조회한다.
 */
export default () => {
  const redisConfig = resolveRedisConfig('REDIS_URL', 'REDIS_HOST', 'REDIS_PORT', 'REDIS_PASSWORD');

  // QUEUE_REDIS_URL이 없으면, 개별 QUEUE_REDIS_* 변수 -> 그마저 없으면 위에서 이미 계산한
  // (URL이든 개별 변수든 상관없이 최종 확정된) 메인 redisConfig를 그대로 재사용한다.
  const queueRedisUrl = process.env.QUEUE_REDIS_URL;
  const queueRedisConfig: RedisConfig = queueRedisUrl
    ? resolveRedisConfig('QUEUE_REDIS_URL', 'QUEUE_REDIS_HOST', 'QUEUE_REDIS_PORT', 'QUEUE_REDIS_PASSWORD')
    : {
        host: process.env.QUEUE_REDIS_HOST ?? redisConfig.host,
        port: process.env.QUEUE_REDIS_PORT ? parseInt(process.env.QUEUE_REDIS_PORT, 10) : redisConfig.port,
        password: process.env.QUEUE_REDIS_PASSWORD || redisConfig.password,
      };

  return {
    app: {
      nodeEnv: process.env.NODE_ENV ?? 'development',
      port: parseInt(process.env.PORT ?? '3000', 10),
      apiPrefix: process.env.API_PREFIX ?? 'v1',
      corsOrigin: process.env.CORS_ORIGIN ?? 'http://localhost:3001',
      frontendUrl: process.env.FRONTEND_URL ?? 'http://localhost:3001',
      apiBaseUrl: process.env.API_BASE_URL ?? 'http://localhost:3000',
      swagger: {
        enabled: (process.env.SWAGGER_ENABLED ?? 'true') === 'true',
        path: process.env.SWAGGER_PATH ?? 'docs',
      },
    } satisfies AppConfig,
    database: {
      url: process.env.DATABASE_URL ?? '',
    } satisfies DatabaseConfig,
    redis: redisConfig,
    /**
     * BullMQ(큐) 전용 Redis 커넥션 설정. QUEUE_REDIS_*가 없으면 캐시용 Redis와 동일한
     * 인스턴스를 재사용하되, 코드 변경 없이 환경변수만 추가하면 별도 인스턴스로 분리할 수 있다.
     */
    queueRedis: queueRedisConfig,
    jwt: {
      accessSecret: process.env.JWT_ACCESS_SECRET ?? '',
      accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN ?? '15m',
      refreshSecret: process.env.JWT_REFRESH_SECRET ?? '',
      refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? '14d',
    } satisfies JwtConfig,
    mail: {
      host: process.env.MAIL_HOST ?? '',
      port: parseInt(process.env.MAIL_PORT ?? '587', 10),
      user: process.env.MAIL_USER ?? '',
      password: process.env.MAIL_PASSWORD ?? '',
      from: process.env.MAIL_FROM ?? 'devhub <no-reply@devhub.example.com>',
      secure: (process.env.MAIL_SECURE ?? 'false') === 'true',
    } satisfies MailConfig,
    storage: {
      endpoint: process.env.S3_ENDPOINT ?? '',
      region: process.env.S3_REGION ?? 'us-east-1',
      bucket: process.env.S3_BUCKET ?? '',
      accessKeyId: process.env.S3_ACCESS_KEY_ID ?? '',
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY ?? '',
      publicUrlBase: process.env.S3_PUBLIC_URL_BASE ?? '',
      forcePathStyle: (process.env.S3_FORCE_PATH_STYLE ?? 'true') === 'true',
    } satisfies StorageConfig,
    notification: {
      broadcastBatchSize: parseInt(process.env.NOTIFICATION_BROADCAST_BATCH_SIZE ?? '500', 10),
    } satisfies NotificationConfig,
    socialAuth: {
      naver: { clientId: process.env.NAVER_CLIENT_ID, clientSecret: process.env.NAVER_CLIENT_SECRET },
      kakao: { clientId: process.env.KAKAO_CLIENT_ID, clientSecret: process.env.KAKAO_CLIENT_SECRET },
      google: { clientId: process.env.GOOGLE_CLIENT_ID, clientSecret: process.env.GOOGLE_CLIENT_SECRET },
    } satisfies SocialAuthConfig,
    ai: {
      provider: process.env.AI_PROVIDER ?? 'anthropic',
      apiKey: process.env.ANTHROPIC_API_KEY ?? '',
      // 요약/태그 추천은 짧고 빈번한 호출이므로 비용/속도 효율이 좋은 모델을 기본값으로 둔다.
      // 필요 시 AI_MODEL 환경변수로 상위 모델로 교체할 수 있다.
      model: process.env.AI_MODEL ?? 'claude-haiku-4-5',
      temperature: parseFloat(process.env.AI_TEMPERATURE ?? '0.3'),
      maxTokens: parseInt(process.env.AI_MAX_TOKENS ?? '1024', 10),
      timeoutMs: parseInt(process.env.AI_TIMEOUT_MS ?? '20000', 10),
      maxRetries: parseInt(process.env.AI_MAX_RETRIES ?? '2', 10),
    } satisfies AiConfig,
  };
};
