/**
 * Access/Refresh 토큰에 서명되는 페이로드.
 * sub 는 User.id (UUID v7), role 은 인가(Guard) 판단에 사용한다.
 */
export interface JwtPayload {
  sub: string;
  email: string;
  role: string;
}

/**
 * JwtStrategy.validate() 의 반환값이자, 이후 request.user 에 주입되는 타입.
 * Prisma User 엔티티 전체가 아니라 요청 처리에 필요한 최소 정보만 담는다.
 */
export interface AuthenticatedUser {
  id: string;
  email: string;
  nickname: string;
  role: string;
  emailVerified: boolean;
}
