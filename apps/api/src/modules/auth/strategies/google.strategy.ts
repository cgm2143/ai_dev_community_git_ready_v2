import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, Profile, VerifyCallback } from 'passport-google-oauth20';
import { AppConfig, SocialAuthConfig } from '../../../config/configuration';
import type { SocialProfile } from './naver.strategy';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(configService: ConfigService) {
    const socialAuthConfig = configService.get<SocialAuthConfig>('socialAuth');
    const appConfig = configService.get<AppConfig>('app');

    super({
      clientID: socialAuthConfig?.google.clientId ?? 'not-configured',
      clientSecret: socialAuthConfig?.google.clientSecret ?? 'not-configured',
      callbackURL: `${appConfig?.apiBaseUrl}/${appConfig?.apiPrefix}/auth/google/callback`,
      scope: ['email', 'profile'],
    });
  }


  /**
   * 기본값으로는 브라우저에 구글 로그인이 이미 되어 있으면(계정이 1개뿐일 때)
   * 계정 선택 화면 없이 곧바로 로그인시켜 버린다. 매번 "어느 계정으로 로그인할지"
   * 선택 화면이 뜨도록 강제한다 - 계정을 여러 개 쓰는 사용자나, 탈퇴 후 다른 계정으로
   * 다시 가입하고 싶은 경우를 위해 필요하다.
   */
  authorizationParams(): Record<string, string> {
    return { prompt: 'select_account' };
  }

  
  validate(accessToken: string, refreshToken: string, profile: Profile, done: VerifyCallback): void {
    const socialProfile: SocialProfile = {
      providerUserId: profile.id,
      email: profile.emails?.[0]?.value,
      nicknameHint: profile.displayName ?? '구글회원',
    };
    done(null, socialProfile);
  }
}
