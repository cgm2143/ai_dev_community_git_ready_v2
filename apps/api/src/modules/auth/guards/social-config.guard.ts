import { CanActivate, ExecutionContext, Injectable, Type } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SocialAuthConfig } from '../../../config/configuration';
import { AppException } from '../../../common/exceptions/app.exception';
import { ErrorCode } from '../../../common/constants/error-codes';

/**
 * 실제 Passport 전략(AuthGuard('naver') 등)이 실행되기 전에 먼저 통과해야 하는 가드.
 * 해당 제공자의 clientId가 설정되어 있지 않으면, 사용자를 그대로 네이버/카카오/구글의
 * 실제 인증 페이지로 리다이렉트시키는 대신 우리 쪽에서 먼저
 * "이 로그인은 아직 준비되지 않았습니다"라고 명확히 알려준다.
 */
export function createSocialConfigGuard(provider: 'naver' | 'kakao' | 'google'): Type<CanActivate> {
  @Injectable()
  class SocialConfigGuard implements CanActivate {
    constructor(private readonly configService: ConfigService) {}

    canActivate(_context: ExecutionContext): boolean {
      const socialAuthConfig = this.configService.get<SocialAuthConfig>('socialAuth');
      if (!socialAuthConfig?.[provider].clientId) {
        throw new AppException(ErrorCode.SOCIAL_PROVIDER_NOT_CONFIGURED);
      }
      return true;
    }
  }

  return SocialConfigGuard;
}
