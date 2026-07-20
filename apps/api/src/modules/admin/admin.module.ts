import { Module } from '@nestjs/common';
import { AdminUsersModule } from './users/admin-users.module';
import { AdminNoticesModule } from './notices/admin-notices.module';
import { AdminWordFilterModule } from './word-filter/admin-word-filter.module';
import { AdminIpBansModule } from './ip-bans/admin-ip-bans.module';
import { AdminSettingsModule } from './settings/admin-settings.module';
import { AdminStatsModule } from './stats/admin-stats.module';
import { AdminLogsModule } from './logs/admin-logs.module';
import { AdminAdsModule } from './ads/admin-ads.module';
import { AdminAiModule } from './ai/admin-ai.module';

/**
 * 10단계(Admin) 전체를 묶는 최상위 모듈. 각 관리 영역(회원/공지/금칙어/IP 차단/설정/통계/로그/광고)을
 * 독립된 하위 모듈로 분리해 두었다 - 예를 들어 IP 차단만 별도 서비스로 확장하거나
 * 교체해야 할 때 이 하위 모듈 하나만 건드리면 된다.
 *
 * `AdminIpBansModule`을 재노출(export)하는 이유: 전역 Guard인 `IpBanGuard`가
 * `IpBanService`를 주입받아야 하는데, AppModule이 이 모듈을 가져오면(import)
 * `IpBanService`가 AppModule의 주입 범위에서도 보이게 하기 위함이다.
 */
@Module({
  imports: [
    AdminUsersModule,
    AdminNoticesModule,
    AdminWordFilterModule,
    AdminIpBansModule,
    AdminSettingsModule,
    AdminStatsModule,
    AdminLogsModule,
    AdminAdsModule,
    AdminAiModule,
  ],
  exports: [AdminIpBansModule],
})
export class AdminModule {}
