'use client';

/**
 * 루트 레이아웃 자체가 깨졌을 때의 최후 방어선. 이 경계는 <html>/<body>를 직접 렌더해야 하며,
 * 전역 CSS/폰트를 신뢰할 수 없으므로 인라인 스타일만 사용한다.
 */
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="ko">
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '12px',
          fontFamily: 'system-ui, sans-serif',
          color: '#111',
          background: '#fafafa',
        }}
      >
        <h1 style={{ fontSize: '20px', margin: 0 }}>문제가 발생했습니다</h1>
        <p style={{ fontSize: '14px', color: '#666', margin: 0 }}>페이지를 새로고침하거나 잠시 후 다시 시도해 주세요.</p>
        <button
          onClick={reset}
          style={{ padding: '8px 16px', fontSize: '14px', borderRadius: '6px', border: '1px solid #ddd', cursor: 'pointer' }}
        >
          다시 시도
        </button>
      </body>
    </html>
  );
}
