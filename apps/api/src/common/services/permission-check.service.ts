import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { RedisService } from '../../infra/redis/redis.service';
import { PermissionCode } from '../constants/permission-codes';

// 5~10분 범위 중 상한을 채택했다 - role_permissions는 운영 중 거의 바뀌지 않는 정적에
// 가까운 데이터이고, 실제로 바뀌는 드문 경우에도 invalidateRole()로 즉시 무효화하므로
// TTL 자체는 "무효화를 깜빡했을 때의 안전망" 역할만 하면 충분하다.
const CACHE_TTL_SECONDS = 10 * 60; // 10분
const CACHE_KEY_PREFIX = 'permission-check:';

/**
 * "이 역할이 이 권한을 가지고 있는가"를 확인하는 단일 진실 공급원.
 * `PermissionsGuard`(라우트 단위 차단)와, 서비스 레이어의 조건부 인가 로직 양쪽에서
 * 이 서비스 하나만 재사용해, role_permissions 조회 쿼리가 여러 곳에 중복되지 않게 한다.
 *
 * 12단계(Performance): 결과를 Redis에 10분 캐싱해 매 요청마다의 DB 조인을 없앤다.
 * 대신 role_permissions 매핑이 실제로 바뀌는 시점(예: 관리자가 회원 역할을 변경해
 * 해당 역할의 권한 집합을 다시 확인해야 하는 경우)에는 `invalidateRole()`로 해당 역할의
 * 캐시 전체를 즉시 비워, 캐시 때문에 최대 10분간 낡은 권한 판정이 발생하지 않도록 한다.
 */
@Injectable()
export class PermissionCheckService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  async hasAnyPermission(roleName: string, codes: PermissionCode[]): Promise<boolean> {
    if (codes.length === 0) return true;

    const cacheKey = this.buildCacheKey(roleName, codes);
    const cached = await this.redis.get(cacheKey);
    if (cached !== null) {
      return cached === '1';
    }

    const match = await this.prisma.rolePermission.findFirst({
      where: {
        role: { name: roleName },
        permission: { code: { in: codes } },
      },
      select: { roleId: true },
    });

    const result = match !== null;
    await this.redis.set(cacheKey, result ? '1' : '0', CACHE_TTL_SECONDS);

    return result;
  }

  /**
   * 특정 역할에 대해 캐싱된 모든 권한 조합 결과를 즉시 비운다.
   * 하나의 역할에 대해 여러 다른 권한 코드 조합(`@RequirePermission(...)`이 컨트롤러마다
   * 다르게 요청)이 각각 별도 캐시 엔트리로 저장되어 있으므로, 패턴 매칭으로 한 번에 지운다.
   */
  async invalidateRole(roleName: string): Promise<void> {
    await this.redis.deleteByPattern(`${CACHE_KEY_PREFIX}${roleName}:*`);
  }

  /** 코드 순서와 무관하게 같은 캐시 키를 갖도록 정렬 후 조합한다. */
  private buildCacheKey(roleName: string, codes: PermissionCode[]): string {
    const sortedCodes = [...codes].sort().join(',');
    return `${CACHE_KEY_PREFIX}${roleName}:${sortedCodes}`;
  }
}
