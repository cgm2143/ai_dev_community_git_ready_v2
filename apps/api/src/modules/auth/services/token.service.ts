import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { createHash, randomUUID } from 'crypto';
import { REFRESH_JWT_SERVICE } from '../auth.constants';
import { JwtConfig } from '../../../config/configuration';
import { JwtPayload } from '../types/jwt-payload.interface';

export interface RefreshTokenPayload {
  sub: string;
  jti: string;
}

export interface IssuedRefreshToken {
  token: string;
  jti: string;
  expiresAt: Date;
}

/**
 * Access/Refresh 토큰의 서명, 검증, 해시를 전담한다.
 * - Access Token: JWT_ACCESS_SECRET으로 서명, 수명이 짧고(기본 15분) DB에 별도 저장하지 않는다(무상태).
 * - Refresh Token: JWT_REFRESH_SECRET으로 서명, jti(랜덤 UUID)를 포함시켜 DB의 RefreshToken row와 1:1 대응시킨다.
 *   토큰 원문은 저장하지 않고 SHA-256 해시만 저장한다 — 이미 128비트 이상의 엔트로피를 가진 랜덤 값이므로
 *   비밀번호와 달리 bcrypt 같은 느린 해시가 아니라 빠른 해시(sha256)로 충분하다(무차별 대입 비용 관점에서 이미 안전).
 */
@Injectable()
export class TokenService {
  private readonly jwtConfig: JwtConfig;

  constructor(
    private readonly configService: ConfigService,
    private readonly accessJwtService: JwtService,
    @Inject(REFRESH_JWT_SERVICE) private readonly refreshJwtService: JwtService,
  ) {
    const jwtConfig = this.configService.get<JwtConfig>('jwt');
    if (!jwtConfig) {
      throw new Error('jwt 설정을 로드하지 못했습니다.');
    }
    this.jwtConfig = jwtConfig;
  }

  async generateAccessToken(payload: JwtPayload): Promise<string> {
    return this.accessJwtService.signAsync(payload);
  }

  async generateRefreshToken(userId: string): Promise<IssuedRefreshToken> {
    const jti = randomUUID();
    const payload: RefreshTokenPayload = { sub: userId, jti };
    const token = await this.refreshJwtService.signAsync(payload);

    return {
      token,
      jti,
      expiresAt: this.calculateExpiryDate(this.jwtConfig.refreshExpiresIn),
    };
  }

  /** 서명/만료만 검증한다. DB 조회(회전/폐기 여부 확인)는 AuthService에서 별도로 수행한다. */
  async verifyRefreshToken(token: string): Promise<RefreshTokenPayload> {
    return this.refreshJwtService.verifyAsync<RefreshTokenPayload>(token);
  }

  hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private calculateExpiryDate(expiresIn: string): Date {
    const match = /^(\d+)([smhd])$/.exec(expiresIn);
    if (!match) {
      // 파싱할 수 없는 형식이면 안전하게 하루로 대체 (환경변수 오설정으로 인한 무제한 만료를 방지)
      return new Date(Date.now() + 24 * 60 * 60 * 1000);
    }

    const value = Number(match[1]);
    const unitMs: Record<string, number> = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 };
    return new Date(Date.now() + value * unitMs[match[2]]);
  }
}
