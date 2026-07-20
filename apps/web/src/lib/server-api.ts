const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';
const API_PREFIX = '/v1';

/**
 * 서버 컴포넌트/메타데이터 전용 GET 헬퍼(공개 엔드포인트). 인증 없이 호출하며 실패 시 null을 반환한다
 * (메타데이터/사이트맵 생성이 데이터 조회 실패로 전체 페이지를 깨뜨리지 않도록). fetch 캐시(revalidate)로
 * 같은 요청 내 generateMetadata와 페이지의 중복 호출이 자동 dedupe 된다.
 */
export async function serverGet<T>(path: string, revalidateSeconds = 60): Promise<T | null> {
  try {
    const res = await fetch(`${API_BASE_URL}${API_PREFIX}${path}`, { next: { revalidate: revalidateSeconds } });
    if (!res.ok) return null;
    const body = (await res.json()) as { success?: boolean; data?: T };
    return body?.success ? (body.data ?? null) : null;
  } catch {
    return null;
  }
}
