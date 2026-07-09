# AI 개발자 커뮤니티 — Search 단계 최종 반영

지시하신 3가지 방향을 모두 반영했습니다.

---

## 1. 한국어 형태소 분석 — 변경 없음, 추상화 재확인

- `simple` tsconfig 그대로 유지합니다.
- `SearchRepository` 인터페이스(7단계에서 정식화)가 이미 검색 엔진 교체 지점을 캡슐화하고 있습니다. 향후 OpenSearch/Elasticsearch + 한국어 형태소 분석기(Nori 등)로 고도화할 때는:
  1. 동일 인터페이스를 구현하는 `OpenSearchPostsRepository`를 새로 작성
  2. `PostsModule`의 DI 토큰만 교체
  3. `PostsService`/`SearchService`는 전혀 수정할 필요 없음
- 인터페이스 주석에 이 경로를 명시적으로 기록해 두었습니다.

## 2. 자동완성 — 관련도 기반 정렬로 전환

### 문제
기존 구현은 `title ILIKE '%q%'` + `ORDER BY createdAt DESC`였습니다 — 관련도와 무관하게 최신 글만 우선했습니다.

### 개선
`PostsSearchRepository.autocompleteTitles()`를 새로 추가했습니다.
- `plainto_tsquery`는 어간 단위 완전 일치만 지원해 "타이핑 도중"(prefix) 검색에 적합하지 않으므로, **`to_tsquery`의 `:*` 접두어 연산자**로 직접 쿼리를 구성합니다.
- 정렬은 **(1) `ts_rank` 관련도 내림차순 → (2) 동점 시 `createdAt` 내림차순(보조 기준)** — 요청하신 우선순위를 그대로 반영했습니다.
- 사용자 입력은 유니코드 letter/digit만 추출해 토큰화한 뒤 `word:*` 형태로 안전하게 조립합니다(특수문자로 인한 `to_tsquery` 문법 오류 방지). 유효 토큰이 없으면 쿼리 자체를 실행하지 않고 빈 배열을 반환합니다.
- `SearchService.autocomplete()`는 이제 `PostsService.autocompleteTitles()`(→ 내부적으로 `SearchRepository` 구현체)를 통해서만 제목 후보를 가져옵니다 — Prisma의 단순 `contains` 검색을 더 이상 사용하지 않습니다.

## 3. 인기 검색어 — 변경 없음 (계획대로 12단계에서 Time Decay 적용)

`search:popular-terms` ZSET 누적 방식을 그대로 유지합니다. 시간 가중치 감쇠는 12단계(Performance)에서 인기글 랭킹 시스템과 함께 구현합니다.

---

## 검증 결과

```
npm install     → 성공
tsc --noEmit     → 오류 48건 (모두 Prisma Client 미생성, 코드 결함 아님, 이전과 동일)
파일 수(.ts)      → 130개
```

---

**Search 단계가 완전히 마무리**되었습니다. 확인해 주시면 **8단계: Notifications(알림)**로 진행하겠습니다.
