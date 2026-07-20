import { NestFactory } from '@nestjs/core';
import { Logger } from 'nestjs-pino';
import { WorkerAppModule } from './worker-app.module';

/**
 * Worker 프로세스 진입점. HTTP 서버 없이 Nest ApplicationContext로 구동한다.
 * SIGTERM/SIGINT에 Graceful Shutdown하며, enableShutdownHooks로 WorkersService.onModuleDestroy가 호출된다.
 */
export async function bootstrapWorker(): Promise<void> {
  const app = await NestFactory.createApplicationContext(WorkerAppModule, { bufferLogs: true });
  app.useLogger(app.get(Logger));
  app.enableShutdownHooks();

  const logger = app.get(Logger);
  let shuttingDown = false;

  const shutdown = async (signal: string): Promise<void> => {
    if (shuttingDown) return;
    shuttingDown = true;
    logger.log(`[Worker] ${signal} 수신 - Graceful Shutdown을 시작합니다.`);
    try {
      await app.close();
      logger.log('[Worker] 정상 종료되었습니다.');
      process.exit(0);
    } catch (err) {
      logger.error(err, '[Worker] 종료 중 오류가 발생했습니다.');
      process.exit(1);
    }
  };

  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));

  logger.log('[Worker] 부트스트랩이 완료되었습니다.');
}

// worker.main.js로 직접 실행될 때만 부트스트랩한다(main.ts에서 APP_ROLE=worker로 재사용할 수 있게 export도 제공).
if (require.main === module) {
  bootstrapWorker().catch((err) => {
    // eslint-disable-next-line no-console
    console.error('[Worker] 부트스트랩 실패:', err);
    process.exit(1);
  });
}
