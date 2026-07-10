# 소셜 로그인(네이버/카카오/구글) 설정 가이드

이번에 추가된 소셜 로그인이 실제로 동작하려면, 각 회사 개발자 콘솔에 앱을 직접 등록하고
발급받은 키를 Railway 환경변수에 넣어야 합니다. 순서대로 따라 하시면 됩니다.

---

## 0. 먼저 확인할 것 — 백엔드 공개 주소

Railway에서 Generate Domain으로 받은 주소를 그대로 씁니다 (예: https://empathetic-intuition-production.up.railway.app).
아래 콜백 URL들은 전부 이 주소를 기준으로 만듭니다.

---

## 1. 네이버 로그인 등록

1. https://developers.naver.com/apps/#/register?api=nvlogin 접속 (네이버 계정 로그인 필요)
2. 애플리케이션 이름: 원하는 이름 (예: 코비온)
3. 사용 API: 네이버 로그인 선택
4. 제공 정보 선택: 이메일 주소, 별명 체크
5. 로그인 오픈 API 서비스 환경: PC웹 또는 모바일웹 선택
6. 서비스 URL: https://<Vercel 프론트엔드 주소>
7. 네이버 로그인 Callback URL: https://<Railway 백엔드 주소>/v1/auth/naver/callback
8. 등록 완료 후 발급되는 Client ID, Client Secret을 복사해 둡니다.

참고: 검수(정식 서비스 전환) 전에는 "멤버 관리"에 테스트할 네이버 계정을 등록해야 로그인이 됩니다.

---

## 2. 카카오 로그인 등록

1. https://developers.kakao.com/ 접속 → 로그인 → "내 애플리케이션" → "애플리케이션 추가하기"
2. 앱 이름, 사업자명(개인 개발자면 본인 이름) 입력 후 생성
3. 생성된 앱 클릭 → 왼쪽 메뉴 "카카오 로그인" → 활성화 설정 ON
4. Redirect URI 등록: https://<Railway 백엔드 주소>/v1/auth/kakao/callback
5. 왼쪽 메뉴 "카카오 로그인" → "동의항목"에서 이메일 항목을 "필수 동의"로 설정
   - 이메일 항목은 카카오 비즈 앱 전환(사업자 등록) 없이는 "선택 동의"만 가능할 수 있습니다.
     테스트 단계에서는 이 상태로도 개발자 본인 계정으로는 테스트 가능합니다.
6. 왼쪽 메뉴 "앱 키"에서 REST API 키를 복사 → 이게 KAKAO_CLIENT_ID 값입니다.
7. (선택) "보안" 메뉴에서 Client Secret을 생성할 수도 있습니다 → KAKAO_CLIENT_SECRET
   - 카카오는 Client Secret이 없어도 동작하니, 안 만드셔도 됩니다.

---

## 3. 구글 로그인 등록

1. https://console.cloud.google.com/ 접속 → 새 프로젝트 생성 (또는 기존 프로젝트 선택)
2. 왼쪽 메뉴 "API 및 서비스" → "OAuth 동의 화면" → User Type: 외부 선택 → 앱 이름/이메일 등 기본 정보 입력 후 저장
   - "테스트 사용자"에 본인 구글 계정을 추가해두면, 앱 검수 전에도 로그인 테스트가 가능합니다.
3. 왼쪽 메뉴 "API 및 서비스" → "사용자 인증 정보" → "+ 사용자 인증 정보 만들기" → "OAuth 클라이언트 ID"
4. 애플리케이션 유형: 웹 애플리케이션
5. 승인된 리디렉션 URI: https://<Railway 백엔드 주소>/v1/auth/google/callback
6. 생성 후 나오는 클라이언트 ID, 클라이언트 보안 비밀번호를 복사해 둡니다.

---

## 4. Railway 환경변수 설정

Railway → empathetic-intuition 서비스 → Variables 탭에서 아래를 추가합니다:

```
API_BASE_URL=https://<Railway 백엔드 주소>

NAVER_CLIENT_ID=<1단계에서 발급받은 값>
NAVER_CLIENT_SECRET=<1단계에서 발급받은 값>

KAKAO_CLIENT_ID=<2단계 REST API 키>
KAKAO_CLIENT_SECRET=<2단계에서 만들었다면>

GOOGLE_CLIENT_ID=<3단계에서 발급받은 값>
GOOGLE_CLIENT_SECRET=<3단계에서 발급받은 값>
```

저장하면 자동으로 재배포됩니다.

---

## 5. 동작 확인

1. Vercel 사이트 → 로그인 화면 → "네이버로 로그인" 클릭
2. 네이버 로그인/동의 화면으로 이동 → 로그인
3. 자동으로 사이트로 돌아오면서 로그인된 상태가 되면 성공
4. 카카오/구글도 동일하게 확인

---

## 참고 — 특정 회사만 먼저 켜도 됩니다

세 회사를 한 번에 다 등록할 필요는 없습니다. 예를 들어 구글만 먼저 설정하고 GOOGLE_CLIENT_ID/GOOGLE_CLIENT_SECRET만 넣어두면,
구글 로그인 버튼만 정상 작동하고 네이버/카카오 버튼은 클릭 시 "현재 이 소셜 로그인은 준비 중입니다"라는 안내만 뜹니다
(서버가 죽거나 하지 않습니다). 원하는 순서대로 하나씩 등록하시면 됩니다.
