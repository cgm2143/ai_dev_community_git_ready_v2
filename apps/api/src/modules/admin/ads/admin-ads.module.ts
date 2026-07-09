import { Module } from '@nestjs/common';
import { AdminAdsController } from './admin-ads.controller';
import { AdminAdsService } from './admin-ads.service';

@Module({
  controllers: [AdminAdsController],
  providers: [AdminAdsService],
})
export class AdminAdsModule {}
