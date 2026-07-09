import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Request } from 'express';
import { IpBanService } from '../../modules/admin/ip-bans/ip-ban.service';
import { AppException } from '../exceptions/app.exception';
import { ErrorCode } from '../constants/error-codes';

/**
 * 전역 Guard 체인의 가장 앞단에서 실행된다 (Throttler보다도 먼저) - 차단된 IP는
 * Rate Limit 카운터를 소비하기 전에 즉시 거부한다. `@Public()`/`@OptionalAuth()` 여부와
 * 무관하게 모든 요청에 적용된다(로그인 여부와 IP 차단은 별개의 관심사이기 때문).
 */
@Injectable()
export class IpBanGuard implements CanActivate {
  constructor(private readonly ipBanService: IpBanService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const ip = request.ip;

    if (ip && (await this.ipBanService.isBanned(ip))) {
      throw new AppException(ErrorCode.FORBIDDEN, '차단된 IP에서의 접근입니다.');
    }

    return true;
  }
}
