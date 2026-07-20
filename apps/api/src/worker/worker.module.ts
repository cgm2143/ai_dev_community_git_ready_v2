import { Module } from '@nestjs/common';
import { MailerModule } from '../infra/mailer/mailer.module';
import { RankingModule } from '../modules/ranking/ranking.module';
import { AiModule } from '../modules/ai/ai.module';
import { WorkersService } from './workers.service';

/**
 * 큐 소비자(Consumer) + BullMQ Worker 전용 모듈. **Worker 프로세스에서만** 로드된다.
 * 워커가 의존하는 도메인 모듈(Mailer/Ranking/Ai)을 가져오고, 큐 프로듀서/DLQ는 전역 QueueModule에서 얻는다.
 */
@Module({
  imports: [MailerModule, RankingModule, AiModule],
  providers: [WorkersService],
})
export class WorkerModule {}
