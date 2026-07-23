/**
 * 6단계 DB 설계에서 계획했던 검색 추상화를 정식화한다.
 * PostgreSQL(FTS) 구현체(`PostsSearchRepository`)가 이 인터페이스를 구현하며,
 * 향후 OpenSearch/Elasticsearch(+ 한국어 형태소 분석기, 예: Nori)로 전환할 때는
 * 동일한 인터페이스의 새 구현체를 만들어 DI 토큰만 교체하면 된다
 * (SearchService/PostsService 등 호출부는 변경 불필요).
 */
/** 게시글 검색 정렬 기준. 기본은 관련도(ts_rank). */
export type PostSearchSort = 'relevance' | 'latest' | 'views' | 'likes';

/**
 * 게시글 검색 필터/정렬. 모두 optional이며, 아무것도 주지 않으면 기존 검색(관련도순, 필터 없음)과 동일하게 동작한다.
 * 필터/정렬은 FTS SQL 안에서 함께 처리되어야 페이지네이션(총 개수 포함)이 정확하다.
 */
export interface PostSearchFilters {
  boardId?: string;
  categoryId?: string;
  tag?: string;
  sort?: PostSearchSort;
}

export interface SearchRepository {
  /** 키워드와 매칭되는 대상 id를 (필터 적용 후) 정렬 순으로 반환한다. */
  searchIds(keyword: string, skip: number, take: number, filters?: PostSearchFilters): Promise<string[]>;

  /** 키워드와 매칭되는 (필터 적용 후) 전체 개수. */
  countMatches(keyword: string, filters?: PostSearchFilters): Promise<number>;

  /**
   * 자동완성용 제목 후보를 관련도 순으로 반환한다.
   * "관련도"의 구체적 계산 방식(접두어 매칭 가중치, ts_rank, BM25 등)은 구현체마다 다를 수 있으며,
   * 호출부(SearchService)는 결과가 이미 관련도 순으로 정렬되어 있다는 계약만 신뢰한다.
   */
  autocompleteTitles(prefix: string, limit: number): Promise<Array<{ id: string; title: string }>>;
}
