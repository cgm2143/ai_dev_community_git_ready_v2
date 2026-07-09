import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { JwtConfig } from '../../config/configuration';
import { JwtStrategy } from './strategies/jwt.strategy';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { PasswordService } from './services/password.service';
import { TokenService } from './services/token.service';
import { EmailVerificationService } from './services/email-verification.service';
import { PasswordResetService } from './services/password-reset.service';
import { REFRESH_JWT_SERVICE } from './auth.constants';

/**
 * Access Token은 기본 JwtModule(JWT_ACCESS_SECRET)로 서명하고,
 * Refresh Token은 별도 비밀키(JWT_REFRESH_SECRET)를 쓰므로 독립된 JwtService 인스턴스를
 * REFRESH_JWT_SERVICE 토큰으로 등록해 분리한다 (같은 JwtModule로는 두 개의 서로 다른
 * 시크릿/만료 정책을 동시에 등록할 수 없기 때문).
 *
 * MailerModule/QueueModule은 @Global()로 등록되어 있어 별도 import 없이
 * MailQueueService를 바로 주입받을 수 있다.
 */
const refreshJwtServiceProvider = {
  provide: REFRESH_JWT_SERVICE,
  inject: [ConfigService],
  useFactory: (configService: ConfigService): JwtService => {
    const jwtConfig = configService.get<JwtConfig>('jwt');
    return new JwtService({
      secret: jwtConfig?.refreshSecret,
      signOptions: { expiresIn: jwtConfig?.refreshExpiresIn },
    });
  },
};

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const jwtConfig = configService.get<JwtConfig>('jwt');
        return {
          secret: jwtConfig?.accessSecret,
          signOptions: { expiresIn: jwtConfig?.accessExpiresIn },
        };
      },
    }),
  ],
  controllers: [AuthController],
  providers: [
    JwtStrategy,
    AuthService,
    PasswordService,
    TokenService,
    EmailVerificationService,
    PasswordResetService,
    refreshJwtServiceProvider,
  ],
  exports: [JwtModule, PassportModule, PasswordService],
})
export class AuthModule {}
