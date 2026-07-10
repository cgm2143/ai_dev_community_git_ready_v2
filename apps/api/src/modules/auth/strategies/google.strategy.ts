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
