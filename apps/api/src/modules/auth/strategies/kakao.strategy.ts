import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, Profile } from 'passport-kakao';
import { AppConfig, SocialAuthConfig } from '../../../config/configuration';
import type { SocialProfile } from './naver.strategy';

interface KakaoAccount {
  email?: string;
  profile?: { nickname?: string };
}

@Injectable()
export class KakaoStrategy extends PassportStrategy(Strategy, 'kakao') {
  constructor(configService: ConfigService) {
    const socialAuthConfig = configService.get<SocialAuthConfig>('socialAuth');
    const appConfig = configService.get<AppConfig>('app');

    super({
      clientID: socialAuthConfig?.kakao.clientId ?? 'not-configured',
      clientSecret: socialAuthConfig?.kakao.clientSecret,
      callbackURL: `${appConfig?.apiBaseUrl}/${appConfig?.apiPrefix}/auth/kakao/callback`,
    });
  }

  /** 카카오는 prompt=login을 넘기면 이미 로그인된 상태여도 다시 로그인 화면을 보여준다. */
  authorizationParams(): Record<string, string> {
    return { prompt: 'login' };
  }

  validate(accessToken: string, refreshToken: string, profile: Profile): SocialProfile {
    const kakaoAccount = (profile._json as { kakao_account?: KakaoAccount })?.kakao_account;

    return {
      providerUserId: profile.id,
      email: kakaoAccount?.email,
      nicknameHint: kakaoAccount?.profile?.nickname ?? '카카오회원',
    };
  }
}
