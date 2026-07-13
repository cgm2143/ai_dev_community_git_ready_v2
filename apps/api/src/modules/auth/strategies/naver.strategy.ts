import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, Profile } from 'passport-naver-v2';
import { AppConfig, SocialAuthConfig } from '../../../config/configuration';

export interface SocialProfile {
  providerUserId: string;
  email?: string;
  nicknameHint: string;
}

@Injectable()
export class NaverStrategy extends PassportStrategy(Strategy, 'naver') {
  constructor(configService: ConfigService) {
    const socialAuthConfig = configService.get<SocialAuthConfig>('socialAuth');
    const appConfig = configService.get<AppConfig>('app');

    super({
      clientID: socialAuthConfig?.naver.clientId ?? 'not-configured',
      clientSecret: socialAuthConfig?.naver.clientSecret ?? 'not-configured',
      callbackURL: `${appConfig?.apiBaseUrl}/${appConfig?.apiPrefix}/auth/naver/callback`,
    });
  }

  /** 네이버는 auth_type=reprompt를 넘기면 이미 로그인된 상태여도 다시 계정 확인 화면을 보여준다. */
  authorizationParams(): Record<string, string> {
    return { auth_type: 'reprompt' };
  }

  validate(accessToken: string, refreshToken: string, profile: Profile): SocialProfile {
    return {
      providerUserId: profile.id,
      email: profile.email,
      nicknameHint: profile.nickname ?? profile.name ?? '네이버회원',
    };
  }
}
