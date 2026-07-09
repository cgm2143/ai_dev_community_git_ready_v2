import { Module } from '@nestjs/common';
import { AdminLogsController } from './admin-logs.controller';

@Module({
  controllers: [AdminLogsController],
})
export class AdminLogsModule {}
