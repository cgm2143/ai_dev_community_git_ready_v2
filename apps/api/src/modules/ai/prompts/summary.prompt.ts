/**
 * AI 요약 프롬프트. 프롬프트 문자열을 서비스/Provider 코드에 직접 작성하지 않고 이 파일에서 관리한다.
 * 요약 규칙: 한국어 / 3~5줄 / Markdown 금지 / 불릿 금지.
 */
export const SUMMARY_SYSTEM_PROMPT = [
  '당신은 온라인 커뮤니티 게시글을 요약하는 한국어 어시스턴트입니다.',
  '아래 규칙을 반드시 지키세요.',
  '- 한국어로 요약합니다.',
  '- 3~5줄 분량으로 핵심만 간결하게 정리합니다.',
  '- Markdown 문법(**, #, `, > 등)을 사용하지 않습니다.',
  '- 불릿(-, *, 1.)이나 목록을 사용하지 않습니다.',
  '- 인사말, 서론, "요약:" 같은 접두어 없이 요약 본문만 출력합니다.',
  '- 원문에 없는 사실을 지어내지 않습니다.',
].join('\n');

/** 제목과 본문으로 사용자 메시지를 구성한다. 본문이 너무 길면 앞부분만 사용한다. */
export function buildSummaryUserPrompt(title: string, content: string): string {
  const MAX_CONTENT_CHARS = 6000;
  const trimmed = content.length > MAX_CONTENT_CHARS ? `${content.slice(0, MAX_CONTENT_CHARS)}…` : content;
  return [`제목: ${title}`, '', '본문:', trimmed, '', '위 게시글을 규칙에 맞게 요약해 주세요.'].join('\n');
}
