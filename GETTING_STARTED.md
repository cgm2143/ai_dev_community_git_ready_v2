# 처음부터 따라하는 배포 가이드 — GitHub → Railway → Vercel

이 문서 하나만 따라오면 링크 하나로 접속 가능한 사이트가 나옵니다. 순서대로만 진행하세요.

**전체 그림**: 코드(GitHub) → 백엔드 서버(Railway, DB/Redis 포함) → 프론트엔드(Vercel) → 완성된 링크

예상 소요 시간: 30~40분 (대부분 계정 가입/버튼 클릭이고, 실제로 "만드는" 시간은 짧습니다)

---

## 0단계. 미리 필요한 것

| 항목 | 용도 | 링크 |
|---|---|---|
| GitHub 계정 | 코드 저장소 | https://github.com/signup |
| Railway 계정 | 백엔드 서버 + DB 호스팅 | https://railway.app |
| Vercel 계정 | 프론트엔드 호스팅 | https://vercel.com |
| Git 프로그램 (컴퓨터에 설치) | 코드를 GitHub에 올리는 도구 | https://git-scm.com/downloads |

Railway/Vercel은 **GitHub 계정으로 바로 가입**할 수 있으니, GitHub 계정만 먼저 만들어도 됩니다.

Git이 설치되어 있는지 확인하려면, 터미널(Mac은 "터미널" 앱, Windows는 "Git Bash" 또는 PowerShell)을 열고 아래를 입력해보세요:
```bash
git --version
```
버전이 나오면 설치되어 있는 것이고, "찾을 수 없음" 같은 오류가 나면 위 링크에서 설치하세요 (설치 마법사에서 계속 "Next"만 누르면 됩니다).

---

## 1단계. GitHub에 코드 올리기

### 1-1. 빈 저장소 만들기
1. https://github.com/new 접속
2. Repository name에 원하는 이름 입력 (예: `ai-dev-community`)
3. Public/Private 아무거나 선택 (처음엔 Public 추천 — 무료 배포 서비스와 연결이 더 쉽습니다)
4. **"Add a README file" 등 아래쪽 체크박스는 전부 체크 해제한 채로** "Create repository" 클릭
5. 생성되면 `https://github.com/<본인계정>/ai-dev-community.git` 같은 주소가 보이는 빈 화면이 나옵니다 — 이 주소를 기억해두세요.

### 1-2. 받은 zip 파일을 컴퓨터에 풀기
제가 드린 `ai_dev_community_git_ready.zip`을 다운로드해서, 원하는 위치(바탕화면 등)에 압축을 풉니다. 이 파일은 이미 "커밋"까지 완료된 상태라 별도 준비 없이 바로 올릴 수 있습니다.

### 1-3. 터미널에서 GitHub로 업로드
터미널을 열고, 압축을 푼 폴더로 이동한 뒤 아래 명령어를 **한 줄씩** 실행합니다.

```bash
# 1) 압축 푼 폴더로 이동 (경로는 실제 위치에 맞게 수정)
cd 바탕화면/ai_dev_community_git_ready

# 2) 방금 만든 GitHub 저장소 주소를 연결
git remote add origin https://github.com/<본인계정>/ai-dev-community.git

# 3) 실제로 업로드
git push -u origin main
```

- `<본인계정>` 자리에는 실제 GitHub 아이디를 넣으세요.
- `git push` 실행 시 로그인 창이 뜨면 GitHub 아이디/비밀번호를 입력하면 되는데, **최근 GitHub는 일반 비밀번호 로그인을 막아놨습니다.** 아래 중 하나로 인증하세요:
  - 브라우저 창이 자동으로 뜨면서 "Authorize" 버튼만 누르면 되는 경우가 많습니다 (Git이 최신 버전이면 자동으로 이 방식을 씁니다).
  - 안 뜨면 https://github.com/settings/tokens 에서 "Generate new token (classic)" → `repo` 권한 체크 → 생성된 토큰(긴 문자열)을 **비밀번호 자리에 붙여넣기**

성공하면 GitHub 저장소 페이지를 새로고침했을 때 폴더/파일들이 보입니다. **여기까지 되면 1단계 완료입니다.**

> 터미널 사용이 어려우시면 [GitHub Desktop](https://desktop.github.com/) 프로그램을 설치해서, "Add local repository"로 압축 푼 폴더를 선택 → "Publish repository" 버튼 클릭으로도 동일하게 할 수 있습니다 (명령어 없이 클릭만으로 가능).

---

## 2단계. Railway에 백엔드 배포하기

### 2-1. 프로젝트 생성
1. https://railway.app 접속 → GitHub 계정으로 로그인
2. "New Project" → **"Deploy from GitHub repo"** 클릭
3. 방금 만든 `ai-dev-community` 저장소 선택
4. 배포가 자동으로 시작되는데, **일단 실패해도 정상**입니다 (아직 설정을 안 했기 때문). 아래를 이어서 진행하세요.

### 2-2. Root Directory 설정 (중요, 반드시 필요)
이 프로젝트는 한 저장소 안에 백엔드(`apps/api`)와 프론트엔드(`apps/web`)가 같이 있는 구조라서, Railway에게 "백엔드 폴더가 어디인지" 알려줘야 합니다.
1. 방금 생성된 서비스 카드를 클릭
2. "Settings" 탭 → "Root Directory"에 `apps/api` 입력 후 저장

### 2-3. 데이터베이스/Redis 추가
1. 같은 프로젝트 화면에서 "New" 버튼 → "Database" → **"Add PostgreSQL"** 선택
2. 다시 "New" → "Database" → **"Add Redis"** 선택
3. 이 둘은 추가하면 자동으로 백엔드 서비스와 연결되어, `DATABASE_URL`/`REDIS_URL`이라는 값을 자동으로 만들어줍니다 (직접 입력할 필요 없음).

### 2-4. 환경변수 입력
백엔드 서비스 카드 → "Variables" 탭에서 아래 값들을 하나씩 추가합니다 (Key/Value로 입력):

```
NODE_ENV=production
JWT_ACCESS_SECRET=아래 방법으로 생성한 랜덤 문자열
JWT_REFRESH_SECRET=위와 다른 랜덤 문자열 (반드시 다르게)
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USER=본인 이메일
MAIL_PASSWORD=이메일 앱 비밀번호
MAIL_FROM=devhub <no-reply@devhub.example.com>
SEED_ADMIN_EMAIL=본인 이메일
SEED_ADMIN_PASSWORD=원하는 관리자 비밀번호
```

**`JWT_ACCESS_SECRET`/`JWT_REFRESH_SECRET` 랜덤 문자열 만드는 법**: 터미널에 아래를 입력하면 랜덤 문자열이 출력됩니다. 이걸 복사해서 넣으면 됩니다 (두 번 실행해서 서로 다른 값 2개를 만드세요).
```bash
openssl rand -base64 48
```
(Windows에 openssl이 없으면, https://www.random.org/strings/ 같은 사이트에서 32자 이상 랜덤 문자열을 만들어 써도 됩니다.)

> **메일 발송 설정이 당장 없어도 괜찮습니다.** 잘못된 값이어도 서버 자체는 뜨고, 회원가입 시 인증메일 발송만 실패합니다 — 나중에 채워도 됩니다.

> S3/이미지 업로드 관련 값(`S3_*`)은 지금 생략해도 서버는 정상 기동됩니다. 프로필 이미지 업로드 기능만 안 될 뿐입니다.

### 2-5. 배포 확인
1. "Deployments" 탭에서 빌드 로그가 흘러가는 걸 지켜보세요 (2~5분 정도 걸립니다).
2. 완료되면 서비스 카드의 "Settings" → "Networking" → **"Generate Domain"** 버튼을 눌러 공개 URL을 받습니다. (예: `https://ai-dev-community-production.up.railway.app`)
3. 이 주소를 **꼭 메모해두세요** — 3단계에서 사용합니다.
4. 브라우저에서 `이_주소/v1/health`로 접속했을 때 `{"status":"ok", ...}` 비슷한 응답이 나오면 성공입니다.

### 2-6. 초기 데이터 넣기 (관리자 계정 등)
Railway 대시보드 → 서비스 → 우측 상단 "⋮"(더보기) 또는 커맨드 아이콘에서 셸(터미널)을 열 수 있는 옵션이 있습니다. 또는 로컬 컴퓨터에서:
```bash
npm install -g @railway/cli
railway login
railway link   # 방금 만든 프로젝트 선택
railway run npm run prisma:seed
```
이걸 실행해야 카테고리/게시판 샘플 데이터와 관리자 계정이 만들어집니다.

---

## 3단계. Vercel에 프론트엔드 배포하기

### 3-1. 프로젝트 생성
1. https://vercel.com 접속 → GitHub 계정으로 로그인
2. "Add New..." → "Project" 클릭
3. `ai-dev-community` 저장소 선택 → "Import"

### 3-2. Root Directory 설정 (중요)
"Configure Project" 화면에서:
1. "Root Directory" 옆의 "Edit" 클릭 → `apps/web` 선택
2. Framework Preset은 자동으로 "Next.js"로 잡힙니다 (그대로 두세요)

### 3-3. 환경변수 입력
같은 화면의 "Environment Variables"에 아래 1개를 추가합니다:
```
NEXT_PUBLIC_API_URL=<2-5단계에서 메모해둔 Railway 주소>
```
예: `NEXT_PUBLIC_API_URL=https://ai-dev-community-production.up.railway.app`

### 3-4. 배포
"Deploy" 버튼 클릭 → 1~2분 후 완료되면 `https://ai-dev-community-xxxx.vercel.app` 같은 링크가 발급됩니다.

**이 링크가 바로 사이트 주소입니다!**

---

## 4단계. 마지막 연결 (아주 중요 — 이거 안 하면 로그인이 안 됩니다)

지금까지는 백엔드가 "누가 나한테 요청해도 되는지" 모르는 상태입니다. Vercel 주소를 백엔드에 알려줘야 합니다.

1. Railway → 백엔드 서비스 → "Variables"로 돌아가서 아래 2개를 **추가**합니다:
   ```
   CORS_ORIGIN=https://ai-dev-community-xxxx.vercel.app
   FRONTEND_URL=https://ai-dev-community-xxxx.vercel.app
   ```
   (3-4단계에서 받은 실제 Vercel 주소로 바꿔서 입력)
2. 저장하면 Railway가 자동으로 재배포합니다 (1~2분 대기).

---

## 5단계. 확인해보기

1. Vercel 링크로 접속 → 홈 화면(게시판 목록 등)이 보이면 성공
2. 회원가입 → 로그인 → 새로고침해도 로그인이 유지되는지 확인
3. `2-6단계`에서 만든 관리자 계정(`SEED_ADMIN_EMAIL`/`SEED_ADMIN_PASSWORD`)으로 로그인 후 `/admin` 접속 시도

---

## 막히면 이렇게 알려주세요

- Railway "Deployments" 탭의 **빌드 로그 마지막 부분**을 복사해서 보여주세요
- Vercel도 마찬가지로 "Deployments" → 실패한 빌드 → 로그 확인
- 브라우저에서 사이트 접속했는데 화면이 하얗게 나오면, 브라우저 개발자도구(F12) → "Console" 탭의 빨간 에러 메시지를 보여주세요

어느 단계에서든 걸리는 부분이 있으면 그 화면 스크린샷이나 오류 메시지만 알려주셔도 바로 원인을 봐드릴 수 있습니다.
