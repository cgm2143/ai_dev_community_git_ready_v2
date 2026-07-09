import { Module } from '@nestjs/common';
import { AdminWordFilterController } from './admin-word-filter.controller';
import { WordFilterService } from './word-filter.service';

@Module({
  controllers: [AdminWordFilterController],
  providers: [WordFilterService],
  exports: [WordFilterService],
})
export class AdminWordFilterModule {}
