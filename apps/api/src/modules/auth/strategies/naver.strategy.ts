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

  validate(accessToken: string, refreshToken: string, profile: Profile): SocialProfile {
    return {
      providerUserId: profile.id,
      email: profile.email,
      nicknameHint: profile.nickname ?? profile.name ?? '네이버회원',
    };
  }
}
