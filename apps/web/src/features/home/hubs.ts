/**
 * 콘텐츠 허브(Feature View) 정의. 별도 Category/Board가 아니라 기존 Post + Tag를 태그 배열로
 * 큐레이션해서 보여준다. 하드코딩을 이 한 곳에 모아 메인 섹션/허브 페이지가 공유한다.
 * (tags 중 하나라도 포함하는 글을 모은다 - GET /posts?tags=a,b,c)
 */
export interface FeatureHub {
  key: string;
  title: string;
  icon: string;
  description: string;
  tags: string[];
}

export const FEATURE_HUBS: FeatureHub[] = [
  { key: 'labs', title: 'Labs', icon: '🧪', description: '프로젝트 공유 · 제작기 · 자동화 · 개발일지', tags: ['프로젝트', '제작기', '오픈소스', '자동화', '개발일지'] },
  { key: 'challenge', title: '챌린지', icon: '🏆', description: '운동 · 공부 · 독서 · 코딩 챌린지', tags: ['챌린지', '운동', '공부', '독서', '코딩'] },
  { key: 'review', title: '리뷰', icon: '⭐', description: 'AI · 전자제품 · 음식 · 자동차 · 영화 리뷰', tags: ['리뷰', '전자제품', '자동차', '영화'] },
  { key: 'ama', title: 'AMA', icon: '🎤', description: '개발자 · 창업자 · 전문가에게 무엇이든 물어보세요', tags: ['ama', '개발자', '창업자', '전문가'] },
];

export function findHub(key: string): FeatureHub | undefined {
  return FEATURE_HUBS.find((hub) => hub.key === key);
}
