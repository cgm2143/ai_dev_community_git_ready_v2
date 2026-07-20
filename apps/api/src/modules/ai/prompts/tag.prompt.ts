/**
 * AI 태그 추천 프롬프트. 규칙: 최대 5개 / 기존 태그 우선 / 중복 제거 / NORMAL 태그만 추천.
 * FEATURE 태그(Labs·챌린지·리뷰·AMA 등 큐레이션 태그)는 추천 대상에서 제외한다.
 */
export function buildTagSystemPrompt(existingTags: string[]): string {
  const lines = [
    '당신은 온라인 커뮤니티 게시글에 어울리는 태그를 추천하는 한국어 어시스턴트입니다.',
    '아래 규칙을 반드시 지키세요.',
    '- 게시글 제목과 본문 내용에 맞는 태그를 최대 5개까지 추천합니다.',
    '- 가능하면 아래 "기존 태그 목록"에 있는 태그를 우선적으로 사용합니다.',
    '- 태그는 짧은 단어나 짧은 구로, 소문자 위주의 일반 콘텐츠 태그여야 합니다.',
    '- 중복되는 태그를 넣지 않습니다.',
    '- 반드시 JSON 배열 형식(예: ["태그1","태그2"])으로만 응답합니다. 다른 설명을 덧붙이지 않습니다.',
  ];
  if (existingTags.length > 0) {
    lines.push('', `기존 태그 목록: ${existingTags.join(', ')}`);
  }
  return lines.join('\n');
}

export function buildTagUserPrompt(title: string, content: string): string {
  const MAX_CONTENT_CHARS = 4000;
  const trimmed = content.length > MAX_CONTENT_CHARS ? `${content.slice(0, MAX_CONTENT_CHARS)}…` : content;
  return [`제목: ${title}`, '', '본문:', trimmed, '', '이 게시글에 어울리는 태그를 JSON 배열로 추천해 주세요.'].join('\n');
}
