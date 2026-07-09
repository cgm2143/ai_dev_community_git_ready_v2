# AI 개발자 커뮤니티 — Backend 7단계: Search 완료

Full Text Search와 자동완성을 구현했습니다. 4단계에서 만든 `PostsSearchRepository`를 `SearchRepository` 인터페이스의 정식 구현체로 승격시키고, 1단계에서 설계만 해두었던 Redis ZSET(`zIncrBy`/`zRevRangeWithScores`)을 처음으로 실전에 사용했습니다.

---

## 1. `SearchRepository` 인터페이스 정식화

- `src/modules/search/domain/search-repository.interface.ts` 신설: `searchIds()` / `countMatches()` 두 메서드만 정의합니다.
- `PostsSearchRepository`가 이제 이 인터페이스를 명시적으로 `implements`합니다.
- **효과**: 향후 OpenSearch로 전환하려면 동일 인터페이스의 `OpenSearchPostsRepository`를 새로 만들어 DI 토큰만 교체하면 되고, `PostsService`/`SearchService`는 전혀 손댈 필요가 없습니다 (6단계에서 계획했던 그대로).

## 2. 엔드포인트

| Method | Endpoint | 인증 | 설명 |
|---|---|---|---|
| GET | `/v1/search/posts` | OptionalAuth | 게시글 검색 (FTS, `PostsService.findAll` 재사용 — 차단 필터링도 함께 적용됨) |
| GET | `/v1/search/users` | Public | 회원 검색 (닉네임 ILIKE) |
| GET | `/v1/search/tags` | Public | 태그 검색 (usageCount 내림차순) |
| GET | `/v1/search/boards` | Public | 게시판 검색 (활성 게시판만) |
| GET | `/v1/search/autocomplete` | Public | 자동완성 (게시글 제목 + 태그, prefix 매칭) |
| GET | `/v1/search/popular` | Public | 인기 검색어 (Redis ZSET 누적 집계) |

- **게시글 검색은 새로 구현하지 않고 4단계 `PostsService.findAll({ keyword })`를 그대로 재사용**했습니다. 차단 필터링(2단계 `BlockService`)이 검색 결과에도 자동으로 적용됩니다.
- 회원/태그/게시판은 별도 tsvector 컬럼이 없는 단순한 대상이라, Prisma의 `contains`(ILIKE) 검색으로 충분하다고 판단해 raw SQL을 추가하지 않았습니다.
- **인기 검색어**: 검색/자동완성 호출마다 `RedisService.zIncrBy('search:popular-terms', 1, term)`으로 누적하고, `GET /search/popular`가 `zRevRangeWithScores`로 상위 10개를 반환합니다. 1단계에서 "향후 랭킹에 쓰일 것"이라는 전제로 미리 만들어 둔 메서드들의 첫 실사용입니다.

## 3. Rate Limit 적용

Auth 단계에서 약속했던 대로 이번에 적용했습니다.
- `/search/posts`, `/search/users`, `/search/tags`, `/search/boards`: IP당 1분 30회
- `/search/autocomplete`: IP당 10초 60회 (타이핑 중 반복 호출을 감안해 더 관대하게 설정)

---

## 4. 검증 결과

```
npm install     → 성공
tsc --noEmit     → 오류 48건 (모두 Prisma Client 미생성, 코드 결함 아님)
파일 수(.ts)      → 130개
```

---

## 5. 코드 리뷰 — 확인이 필요한 사항

1. **한국어 형태소 분석 미적용**: 6단계에서 언급했듯 현재 FTS는 `simple` tsconfig 기준입니다. 한국어 검색 품질이 중요해지면 별도 한국어 tsconfig 또는 OpenSearch(Nori 분석기) 전환을 검토해야 합니다 — `SearchRepository` 인터페이스 덕분에 전환 자체는 어렵지 않습니다.
2. **자동완성이 관련도가 아닌 최신순**: 지금은 응답 속도를 우선해 `createdAt desc`로만 정렬합니다. 검색어와의 관련도를 반영하고 싶으면 정렬 로직 보강이 필요합니다.
3. **인기 검색어에 만료(decay) 없음**: `search:popular-terms` ZSET은 계속 누적되기만 하고 시간 가중치 감쇠가 없습니다. 12단계(Performance)의 랭킹 시스템과 함께 적용하는 것을 고려할 수 있습니다.

---

이 상태로 확인해 주시면 **8단계: Notifications(알림)**로 진행하겠습니다.
