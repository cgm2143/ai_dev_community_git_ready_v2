import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { JwtConfig } from '../../../config/configuration';
import { PrismaService } from '../../../infra/prisma/prisma.service';
import { AuthenticatedUser, JwtPayload } from '../types/jwt-payload.interface';
import { UserStatus } from '@prisma/client';

/**
 * Authorization: Bearer <accessToken> 헤더를 검증하는 Passport 전략.
 * 토큰 서명/만료 검증은 passport-jwt가 처리하고, 여기서는
 * 1) payload.sub 사용자가 실제로 존재하는지, 2) 정지/탈퇴 상태가 아닌지를 추가로 확인한다.
 * (탈퇴 회원은 익명화만 될 뿐 row 자체는 남아있으므로, 상태 체크가 없으면 탈퇴 후에도 기존 토큰으로 접근 가능해지는 취약점이 생긴다.)
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    const jwtConfig = configService.get<JwtConfig>('jwt');

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: jwtConfig?.accessSecret ?? '',
    });
  }

  async validate(payload: JwtPayload): Promise<AuthenticatedUser> {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      include: { role: true },
    });

    if (!user || user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException();
    }

    return {
      id: user.id,
      email: user.email,
      nickname: user.nickname,
      role: user.role.name,
      emailVerified: user.emailVerifiedAt !== null,
    };
  }
}
