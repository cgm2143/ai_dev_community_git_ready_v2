import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { Logger } from 'nestjs-pino';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { AppConfig } from './config/configuration';
import { bootstrapWorker } from './worker.main';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { bufferLogs: true });

  // Nginx 등 리버스 프록시 뒤에서 운영할 것을 고려해, X-Forwarded-For 기반으로 req.ip를 신뢰한다.
  // (ThrottlerGuard의 기본 IP 추적과 로그의 ip 필드 정확도에 직접 영향을 준다)
  app.set('trust proxy', 1);

  // nestjs-pino를 Nest의 기본 로거로 교체 (부트스트랩 로그부터 구조화된 형태로 출력)
  app.useLogger(app.get(Logger));

  const configService = app.get(ConfigService);
  const appConfig = configService.get<AppConfig>('app');
  if (!appConfig) {
    throw new Error('app 설정을 로드하지 못했습니다.');
  }

  app.use(helmet());
  app.use(compression());
  app.use(cookieParser());

  app.enableCors({
    origin: appConfig.corsOrigin.split(',').map((origin) => origin.trim()),
    credentials: true,
  });

  // API 버전은 URI 버저닝 대신 setGlobalPrefix('v1')로 고정한다.
  // (enableVersioning과 함께 쓰면 /v1/v1/... 로 중복되므로 둘 중 하나만 사용)
  app.setGlobalPrefix(appConfig.apiPrefix);

  // DTO에 정의되지 않은 필드는 제거(whitelist), 정의되지 않은 필드가 오면 400(forbidNonWhitelisted),
  // 문자열로 들어온 숫자/불리언 등은 DTO 타입에 맞춰 자동 변환(transform)
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  if (appConfig.swagger.enabled) {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('AI 개발자 커뮤니티 API')
      .setDescription('게시판/댓글/반응/알림/광고/관리자 기능을 제공하는 REST API')
      .setVersion('1.0')
      .addBearerAuth()
      .build();

    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup(appConfig.swagger.path, app, document);
  }

  app.enableShutdownHooks();

  await app.listen(appConfig.port);
}

// APP_ROLE로 프로세스 역할을 결정한다. 미설정이면 'api'. worker면 HTTP 서버 대신 Worker를 구동한다.
const role = (process.env.APP_ROLE ?? 'api').toLowerCase();
if (role === 'worker') {
  bootstrapWorker().catch((err) => {
    // eslint-disable-next-line no-console
    console.error('[Worker] 부트스트랩 실패:', err);
    process.exit(1);
  });
} else {
  bootstrap();
}
