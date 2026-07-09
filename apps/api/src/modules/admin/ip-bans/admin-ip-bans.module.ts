import { Module } from '@nestjs/common';
import { AdminIpBansController } from './admin-ip-bans.controller';
import { IpBanService } from './ip-ban.service';

@Module({
  controllers: [AdminIpBansController],
  providers: [IpBanService],
  exports: [IpBanService],
})
export class AdminIpBansModule {}
