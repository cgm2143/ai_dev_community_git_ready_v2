import { CanActivate, Injectable } from '@nestjs/common';

/**
 * 이메일 인증 요구 정책이 제거되었다(사용자 요청). 이 가드는 항상 통과시킨다.
 * 컨트롤러에 남아 있는 @RequireEmailVerified() 데코레이터는 더 이상 아무 것도 제한하지 않는다.
 * (가드/데코레이터 배선 자체는 유지해 두어, 향후 인증 정책을 다시 켜야 할 때 이 파일만 되돌리면 되도록 한다.)
 */
@Injectable()
export class EmailVerifiedGuard implements CanActivate {
  canActivate(): boolean {
    return true;
  }
}
