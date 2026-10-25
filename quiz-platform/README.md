# 퀴즈공방 — 직접 만들고 함께 푸는 퀴즈 플랫폼

회원가입 없이 퀴즈를 만들고, 퀴즈마다 생기는 **고유 링크(`/quiz/고유ID`)**를 보내면 다른 사람이 휴대폰·컴퓨터에서 바로 풀 수 있는 웹사이트입니다.

- 프런트엔드: HTML + CSS + Vanilla JavaScript (ES Modules), 개발 서버 Vite
- 백엔드: Firebase (Cloud Firestore, 익명 인증, Storage, Hosting)
- 샘플 퀴즈 41세트 × 50문제(총 2,050문제) 포함
- 카테고리 12개 + 세부 분류(장르) 74개 + 자유 태그로 분류하고, "노래"·"게임"·"발라드"처럼 분류 이름으로도 검색
- 어느 화면에서든 오른쪽 아래 **"직접 만들기"** 버튼으로 바로 퀴즈 제작

> 📌 이 문서의 모든 명령어는 **`quiz-platform` 폴더 안에서** 실행합니다.
> 터미널에서 `cd quiz-platform` 으로 먼저 이동하세요. (저장소 최상위 폴더가 아닙니다)

---

## 목차

1. [필요한 프로그램 설치](#1-필요한-프로그램-설치)
2. [빠르게 체험하기 (데모 모드)](#2-빠르게-체험하기-데모-모드)
3. [Firebase 프로젝트 만들기](#3-firebase-프로젝트-만들기-직접-해야-하는-작업)
4. [환경변수(.env) 입력](#4-환경변수env-입력)
5. [보안 규칙·색인 배포](#5-보안-규칙색인-배포)
6. [실제 Firebase 로 실행하기](#6-실제-firebase-로-실행하기)
7. [다른 사람에게 공개하기 (배포)](#7-다른-사람에게-공개하기-firebase-hosting-배포)
8. [테스트 실행 방법](#8-테스트-실행-방법)
9. [자주 발생하는 오류와 해결 방법](#9-자주-발생하는-오류와-해결-방법)
10. [구조와 동작 원리](#10-구조와-동작-원리)
11. [보안 설계와 한계](#11-보안-설계와-한계)
12. [아직 구현하지 않은 기능](#12-아직-구현하지-않은-기능)

---

## 1. 필요한 프로그램 설치

| 프로그램 | 용도 | 필수 여부 |
|---|---|---|
| [Node.js](https://nodejs.org/ko) **20 이상 (LTS 권장)** | 개발 서버, 빌드, 테스트 | 필수 |
| [Git](https://git-scm.com/) | 버전 관리 | 권장 |
| [VS Code](https://code.visualstudio.com/) | 코드 편집기 | 권장 |
| [Java](https://adoptium.net/) **11 이상** | Firebase Emulator(보안 규칙 테스트) | 테스트할 때만 |

1. Node.js 홈페이지에서 **LTS** 버전을 내려받아 설치합니다.
2. 터미널(Windows: PowerShell, Mac: 터미널)을 새로 열고 설치를 확인합니다.
   ```bash
   node -v   # v20 이상이면 OK
   npm -v
   ```
3. 이 프로젝트 폴더로 이동해 필요한 패키지를 설치합니다. (처음 한 번만, 몇 분 걸릴 수 있음)
   ```bash
   cd quiz-platform
   npm install
   ```

---

## 2. 빠르게 체험하기 (데모 모드)

Firebase 설정 없이 화면과 기능을 체험할 수 있습니다.

```bash
# quiz-platform 폴더에서
npm run dev:demo
```

브라우저에서 **http://localhost:5173** 을 엽니다. 끄려면 터미널에서 `Ctrl + C`.

> ⚠️ **데모 모드는 실제 공유가 아닙니다.** 퀴즈가 *지금 쓰는 브라우저의 localStorage* 에만 저장됩니다.
> 공유 링크를 다른 브라우저·기기·시크릿 창에서 열면 "퀴즈를 찾을 수 없어요"가 나옵니다.
> 화면 위의 노란 "데모 모드" 띠로 언제든 구분할 수 있습니다.
> 데모 모드에는 샘플 퀴즈 41세트가 처음부터 들어 있습니다(플레이 수 0에서 시작).

---

## 3. Firebase 프로젝트 만들기 (직접 해야 하는 작업)

> 🧑‍💻 이 단계는 **Google 계정 로그인이 필요해서 직접 해야 합니다.** 코드는 이미 준비되어 있습니다.

### 3-1. 프로젝트 생성
1. https://console.firebase.google.com 에 Google 계정으로 로그인합니다.
2. **프로젝트 추가(만들기)** → 프로젝트 이름 입력(예: `quizbang`) → Google 애널리틱스는 꺼도 됩니다 → **프로젝트 만들기**.
3. 만들어진 **프로젝트 ID**(예: `quizbang-1a2b3`)를 메모합니다.

### 3-2. 웹 앱 등록
1. 프로젝트 개요 화면에서 **웹(`</>`) 아이콘**을 누릅니다.
2. 앱 닉네임 입력(예: `quizbang-web`) → "Firebase 호스팅도 설정" 체크는 선택 → **앱 등록**.
3. 화면에 나오는 `firebaseConfig` 값(apiKey, authDomain, projectId, storageBucket, messagingSenderId, appId)을 복사해 둡니다. → [4단계](#4-환경변수env-입력)에서 사용합니다.
   - 나중에 다시 보려면: ⚙️ **프로젝트 설정 → 일반 → 내 앱 → SDK 설정 및 구성**

### 3-3. 익명 인증 켜기
1. 왼쪽 메뉴 **빌드 → Authentication → 시작하기**.
2. **로그인 방법(Sign-in method)** 탭 → **익명(Anonymous)** → **사용 설정** → 저장.
3. **설정 → 승인된 도메인** 에 `localhost` 가 있는지 확인합니다. (배포 후 도메인은 자동 추가됩니다. 직접 구입한 도메인을 쓰면 여기에 추가하세요)

### 3-4. Firestore 데이터베이스 만들기
1. 왼쪽 메뉴 **빌드 → Firestore Database → 데이터베이스 만들기**.
2. 위치: **`asia-northeast3 (서울)`** 권장 (한 번 정하면 바꿀 수 없습니다).
3. 보안 규칙 시작 모드: **프로덕션 모드(잠금 모드)** 를 고릅니다.
   - ❌ "테스트 모드"는 누구나 읽고 쓸 수 있으니 고르지 마세요. 우리 규칙은 [5단계](#5-보안-규칙색인-배포)에서 배포합니다.

### 3-5. Storage 설정 (선택 — 이미지 업로드용)
- **2024년 10월 이후 새로 만드는 Firebase 프로젝트는 Cloud Storage 버킷을 쓰려면 Blaze(종량제) 요금제가 필요할 수 있습니다.** Blaze 도 무료 사용량이 있지만 결제 수단 등록이 필요합니다. 콘솔의 **Storage → 시작하기** 화면에서 현재 조건을 꼭 확인하세요.
- **Storage 없이도 사이트는 정상 동작합니다.** 이미지 대신 카테고리별 기본 썸네일이 나옵니다. 이 경우 `.env` 에서 `VITE_ENABLE_STORAGE=false` 로 두면 이미지 업로드 버튼이 숨겨집니다.
- Storage 를 쓰려면:
  1. **빌드 → Storage → 시작하기** → 프로덕션 모드 → 위치 선택.
  2. `.env` 에 `VITE_ENABLE_STORAGE=true` 로 설정하고, `VITE_FIREBASE_STORAGE_BUCKET` 값을 채웁니다.
  3. [5단계](#5-보안-규칙색인-배포)에서 Storage 규칙도 함께 배포합니다.

### 3-6. (권장) API 키 사용 제한
Firebase 웹 설정값(apiKey 등)은 **비밀번호가 아니라 공개되는 값**입니다. 대신 아래처럼 사용처를 제한하고, 실제 보호는 보안 규칙으로 합니다.
1. https://console.cloud.google.com/apis/credentials 에서 같은 프로젝트를 고릅니다.
2. "Browser key (auto created by Firebase)" → **애플리케이션 제한사항: 웹사이트** →
   `http://localhost:5173/*`, `https://프로젝트ID.web.app/*`, `https://프로젝트ID.firebaseapp.com/*` 를 추가 → 저장.
3. (선택) **App Check**: Firebase 콘솔 → App Check 에서 reCAPTCHA v3 로 웹 앱을 등록하고 사이트 키를 `.env` 의 `VITE_RECAPTCHA_SITE_KEY` 에 넣으면 앱이 App Check 를 켭니다. 강제(Enforce)는 정상 동작을 확인한 뒤 켜세요. *(이 기능은 실제 프로젝트에서 아직 검증하지 못했습니다)*

---

## 4. 환경변수(.env) 입력

1. `quiz-platform` 폴더에서 예시 파일을 복사합니다.
   ```bash
   # Mac / Linux / Git Bash
   cp .env.example .env
   # Windows PowerShell
   Copy-Item .env.example .env
   ```
2. VS Code 로 `.env` 를 열고 3-2 단계에서 복사한 값을 붙여 넣습니다.
   ```ini
   VITE_DATA_MODE=firebase
   VITE_FIREBASE_API_KEY=AIza...
   VITE_FIREBASE_AUTH_DOMAIN=quizbang-1a2b3.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=quizbang-1a2b3
   VITE_FIREBASE_STORAGE_BUCKET=quizbang-1a2b3.firebasestorage.app
   VITE_FIREBASE_MESSAGING_SENDER_ID=1234567890
   VITE_FIREBASE_APP_ID=1:1234567890:web:abcdef
   VITE_ENABLE_STORAGE=false
   ```
3. `.env` 는 `.gitignore` 에 등록되어 있어 Git 에 올라가지 않습니다. **서비스 계정 키(JSON) 파일은 이 프로젝트에 필요 없으니 절대 넣지 마세요.**

---

## 5. 보안 규칙·색인 배포

> 🧑‍💻 Firebase 로그인이 필요해서 직접 실행해야 합니다.

```bash
# 모두 quiz-platform 폴더에서
npx firebase login                 # 브라우저가 열리면 Google 계정으로 로그인
npx firebase use --add             # 3-1 에서 만든 프로젝트 선택 → 별칭은 default 입력
npm run deploy:rules               # Firestore 규칙 + 색인 + Storage 규칙 배포
```

- Storage 를 쓰지 않으면 `npx firebase deploy --only firestore:rules,firestore:indexes` 로 Firestore 만 배포하세요.
- 색인(index)은 만들어지는 데 **몇 분** 걸립니다. 그동안 검색·정렬에서 "색인이 아직 없습니다" 안내가 나올 수 있습니다. 콘솔의 Firestore → 색인 탭에서 상태가 "사용 설정됨"이 되면 정상입니다.

---

## 6. 실제 Firebase 로 실행하기

```bash
# quiz-platform 폴더에서
npm run dev
```

1. 브라우저에서 http://localhost:5173 을 엽니다. (노란 "데모 모드" 띠가 없어야 정상)
2. **퀴즈 만들기** → 저장하면 `/quiz/고유ID` 링크가 생깁니다.
3. **시크릿 창이나 다른 브라우저**에서 그 링크를 열어 같은 퀴즈가 보이는지 확인하세요.
   - 개발 서버는 보안을 위해 **내 컴퓨터에서만** 열립니다. 같은 와이파이의 휴대폰으로 확인하려면 잠깐 `npm run dev:lan` 으로 실행해 터미널의 `Network: http://192.168.x.x:5173` 주소를 쓰고(3-3 의 승인된 도메인에 그 IP 추가 필요), 확인이 끝나면 바로 끄세요. 카페 등 공용 와이파이에서는 쓰지 마세요. 보통은 7단계 배포 후 확인하는 편이 쉽습니다.
4. **내 퀴즈** → "샘플 퀴즈 추가하기"에서 샘플 41세트(각 50문제)를 내 퀴즈로 추가할 수 있습니다. (공개로 저장되며 언제든 수정·삭제 가능)

---

## 7. 다른 사람에게 공개하기 (Firebase Hosting 배포)

Firebase Hosting 은 무료(Spark) 요금제에서도 사용할 수 있습니다.

```bash
# quiz-platform 폴더에서 (5단계의 로그인·프로젝트 선택이 끝난 상태)
npm run deploy        # = npm run build && firebase deploy --only hosting
```

1. 완료되면 `Hosting URL: https://프로젝트ID.web.app` 이 표시됩니다. 이 주소가 실제 서비스 주소입니다.
2. 공유 링크는 `https://프로젝트ID.web.app/quiz/고유ID` 형태가 됩니다. `firebase.json` 의 rewrites 설정 덕분에 이 주소를 직접 열거나 새로고침해도 정상 동작합니다.
3. 배포 후 확인할 것:
   - [ ] 다른 기기(휴대폰 LTE 등)에서 공개 퀴즈 링크가 열리는지
   - [ ] 비공개 퀴즈 링크가 다른 기기에서 "볼 수 없는 퀴즈예요"로 나오는지
   - [ ] 3-6 의 API 키 제한에 배포 도메인을 추가했는지

---

## 8. 테스트 실행 방법

모두 `quiz-platform` 폴더에서 실행합니다.

| 명령어 | 내용 | 필요 조건 |
|---|---|---|
| `npm test` | 단위 테스트: 입력 검증, 채점, 검색 토큰, 라우팅, 잘못된 ID, 데모 저장소, **샘플 1,000문제 무결성** | 없음 |
| `npm run build` | 문법 검사 + 배포용 빌드(`dist/`) | 없음 |
| `npm run test:rules` | Firestore/Storage **보안 규칙** 테스트 (에뮬레이터에서 실행) | Java 11+ |
| `npm run test:e2e` | 실제 브라우저(Chromium) 테스트: 데모 모드 전체 흐름 + 샘플 41세트 끝까지 풀기(전부 정답·전부 오답·반반) + 설정 누락 화면 | Playwright |
| `npm run test:e2e:emulator` | 실제 Firebase SDK + 보안 규칙 + 에뮬레이터에서 **서로 다른 두 사용자** 간 공유·권한·이미지 업로드 검사 | Java 11+, Playwright |
| `npm run test:e2e:hosting` | 실제 배포와 같은 Hosting 에뮬레이터(보안 헤더·CSP·새로고침 처리 적용)에서 전체 흐름 검사 | Java 11+, Playwright |

- Playwright 가 없다면: `npm install -D playwright` 후 `npx playwright install chromium`
- 에뮬레이터를 켜 두고 직접 눌러 보려면 터미널 두 개에서:
  ```bash
  npm run emulators        # 터미널 1: Auth/Firestore/Storage 에뮬레이터
  npm run dev:emulator     # 터미널 2: 에뮬레이터에 연결된 개발 서버 (파란 "로컬 에뮬레이터 모드" 띠)
  ```
  `.env.emulator` 의 값은 **에뮬레이터 전용 가짜 값**이며 실제 Firebase 와 연결되지 않습니다.

---

## 9. 자주 발생하는 오류와 해결 방법

| 화면/메시지 | 원인 | 해결 |
|---|---|---|
| "Firebase 설정이 필요해요" | `.env` 가 없거나 값이 비어 있음 | 4단계를 따라 `.env` 작성 후 **개발 서버를 껐다 켜기** (`Ctrl+C` → `npm run dev`) |
| "Firebase 익명 로그인이 꺼져 있습니다" | 익명 인증 미설정 | 3-3 단계 |
| "Firebase 설정값(API 키 등)이 올바르지 않습니다" | `.env` 값 오타, 따옴표/공백 포함 | 콘솔의 값을 다시 복사. 값 앞뒤에 따옴표를 넣지 마세요 |
| "이 도메인은 Firebase 에서 허용되지 않았습니다" | 승인된 도메인 / API 키 제한 | 3-3 의 승인된 도메인, 3-6 의 웹사이트 제한에 주소 추가 |
| "이 작업을 할 권한이 없습니다" | 보안 규칙 미배포 또는 남의 퀴즈 | 5단계 규칙 배포. 브라우저 데이터를 지웠다면 새 사용자로 인식됨(11장 참고) |
| "필요한 Firestore 색인이 아직 없습니다" | 색인 미배포/생성 중 | 5단계 후 몇 분 기다리기 |
| "네트워크에 연결할 수 없습니다" | 인터넷 끊김, 방화벽 | 연결 확인 후 "다시 시도" |
| `npm` 을 찾을 수 없음 | Node.js 미설치 / 터미널 재시작 안 함 | 1단계, 터미널 새로 열기 |
| `Port 5173 is in use` | 이미 다른 개발 서버가 켜져 있음 | 기존 터미널에서 `Ctrl+C`, 또는 표시된 다른 포트 사용 |
| 에뮬레이터 실행 시 Java 오류 | Java 미설치/버전 낮음 | Java 11 이상 설치 |
| 이미지 업로드 버튼이 안 보임 | `VITE_ENABLE_STORAGE=false` | 3-5 단계 |
| 수정 후 화면이 그대로 | `.env` 변경은 재시작 필요 | 개발 서버 재시작 |

---

## 10. 구조와 동작 원리

### 10-1. 폴더 구조
```
quiz-platform/
├── index.html               # 페이지 뼈대 (헤더/본문/푸터)
├── package.json             # 명령어와 패키지 목록
├── vite.config.js           # 개발 서버 설정
├── firebase.json            # Hosting(새로고침 대응 rewrites)·에뮬레이터 설정
├── firestore.rules          # Firestore 보안 규칙
├── firestore.indexes.json   # 검색·정렬용 복합 색인
├── storage.rules            # Storage 보안 규칙
├── .env.example             # 환경변수 예시 (실제 값은 .env 에)
├── .env.demo / .env.emulator# 데모·에뮬레이터 전용 설정 (비밀 값 없음)
├── public/favicon.svg
├── src/
│   ├── main.js              # 시작점: 라우터 연결
│   ├── styles/main.css      # 전체 스타일 (색상 변수, 반응형)
│   ├── pages/               # 화면 단위 (home, editor, play, result, myQuizzes, notFound, configError)
│   ├── components/          # 재사용 UI (헤더, 퀴즈 카드, 공유 상자, 확인창, 알림, 오류 화면)
│   ├── services/
│   │   ├── config.js        # .env 읽기, 데모/Firebase 모드 결정
│   │   ├── firebase.js      # Firebase 초기화 (필요할 때만 불러옴)
│   │   ├── auth.js          # 익명 인증
│   │   ├── quizService.js   # 화면이 쓰는 유일한 데이터 창구
│   │   ├── firestoreRepo.js # 실제 Firestore 읽기/쓰기
│   │   ├── demoRepo.js      # 데모 모드 저장소 (localStorage)
│   │   ├── storageService.js# 이미지 업로드
│   │   └── quizModel.js     # 저장 형식 정리
│   ├── utils/               # validation, grading, router, search, dom, clipboard, errors ...
│   └── data/samples/        # 샘플 퀴즈 41세트 (세트당 50문제)
└── tests/
    ├── unit/                # Vitest 단위 테스트
    ├── rules/               # 보안 규칙 테스트
    └── e2e/                 # Playwright 브라우저 테스트
```

### 10-2. 화면(주소)
| 주소 | 화면 |
|---|---|
| `/` | 홈 (소개, 검색, 카테고리, 최신순/인기순, 더 보기) |
| `/create` | 퀴즈 만들기 |
| `/edit/고유ID` | 퀴즈 수정 (본인만) |
| `/quiz/고유ID` | 퀴즈 소개·풀기 (공유 링크) |
| `/quiz/고유ID/result` | 결과 |
| `/my` | 내 퀴즈 (수정·삭제·링크 복사·샘플 추가) |
| 그 밖 | 404 |

### 10-3. Firestore 데이터 모델

`quizzes/{quizId}` — 퀴즈 1개 = 문서 1개 (문제는 문서 안 배열)

| 필드 | 형식 | 설명 |
|---|---|---|
| title | string (1~100자) | 제목 |
| description | string (≤500자) | 설명 |
| category | string | `general, history, music, idol, movie, anime, game, sports, science, geography, language, etc` |
| subcategory | string | 세부 분류 키 (예: `ballad`). 없으면 `''`. 목록은 `src/utils/constants.js` 의 `CATEGORIES[].subs` |
| tags | array (≤5개, 각 ≤15자) | 만든 사람이 붙이는 자유 태그 |
| imageUrl | string | 썸네일 URL (없으면 `''`) |
| isPublic | boolean | 공개 여부 |
| status | `'active'` | 관리용 예약 필드 (관리자가 콘솔에서 `hidden` 으로 바꾸면 공개 목록에서 숨김) |
| questions | array (1~100개) | `{ id, type: 'text'|'choice', question, answer, altAnswers[], options[], imageUrl, order }` |
| questionCount | number | 문제 수 (목록에서 배열을 세지 않도록) |
| searchTokens | array (≤300개) | 검색용 토큰: 제목·카테고리 이름/별칭·세부 분류·태그 단어의 접두사 + 세부 분류 필터용 `#sub:키` |
| ownerUid | string | 만든 사람 (익명 인증 uid) |
| playCount | number | 끝까지 푼 횟수 |
| createdAt / updatedAt | timestamp | 서버 시간 |

`deletedQuizzes/{quizId}` — `{ deletedAt }` 삭제 표시. "없는 퀴즈"와 "삭제된 퀴즈"를 구분해 안내하려고 사용합니다.

- **문제를 하위 컬렉션이 아닌 배열로 둔 이유:** 퀴즈를 열 때 문서 1번만 읽으면 되고(비용·속도), 50문제 세트도 수십 KB 로 문서 한도(1MB)에 한참 못 미칩니다. 문제 수 상한은 100개입니다.
- **고유 ID:** Firestore 자동 ID(영숫자 20자, 62²⁰ 가지)를 사용합니다. 형식이 맞지 않는 주소는 DB 조회 없이 바로 "찾을 수 없음"을 보여줍니다.

### 10-4. 검색·정렬 구현 방식 (Firestore 제약)
- Firestore 는 **부분 문자열 검색을 지원하지 않습니다.** 그래서 제목·분류·태그를 단어로 나누고 각 단어의 **앞부분(접두사)** 을 `searchTokens` 에 저장해 `array-contains` 로 찾습니다.
- **분류로 검색:** 카테고리 이름과 별칭(예: 음악 = "노래", "가요", "음악"), 세부 분류 이름(예: "발라드"), 태그가 모두 검색 토큰에 들어갑니다. 그래서 "노래"로 검색하면 음악·아이돌 퀴즈가, "발라드"로 검색하면 발라드로 분류된 퀴즈가 나옵니다. 별칭은 `src/utils/constants.js` 의 `aliases` 에서 바꿀 수 있습니다.
- 제목에 그 단어가 들어간 다른 분류 퀴즈도 함께 나오므로(예: "게임" → 「오징어 게임」 드라마 퀴즈), 검색어가 분류 이름과 같으면 **"🎮 게임만 보기"** 버튼을 보여 줘 정확한 분류로 좁힐 수 있습니다.
- **세부 분류 버튼:** 홈에서 카테고리를 고르면 세부 분류 버튼이 나옵니다. 이때는 `#sub:키` 토큰으로 정확히 거르고, 검색어는 받아온 결과에서 다시 거릅니다.
- ⚠️ 이 기능 이전에 저장된 퀴즈는 세부 분류·태그 토큰이 없어서, 한 번 수정·저장해야 분류 검색에 걸립니다.
  - "한국사 기초" → `한, 한국, 한국사, 기, 기초` → "한국"·"기초" 로는 찾히지만 "국사"(단어 중간)로는 안 찾힙니다.
  - 검색어가 여러 단어면 첫 단어는 DB 에서, 나머지 단어는 받아온 결과에서 다시 거릅니다. (그래서 한 페이지에 12개보다 적게 보일 수 있습니다)
- 설명(description) 내용은 검색하지 않습니다. 본격적인 검색이 필요하면 Algolia·Typesense 같은 검색 서비스 연동이 필요합니다.
- 정렬: **최신순**(`createdAt`), **인기순**(`playCount` = 실제로 끝까지 푼 횟수, 가짜 수치 없음).
- 목록은 **12개씩 페이지네이션**(“더 보기”)하고, 내 퀴즈는 최대 100개까지 불러옵니다. 전체 데이터를 한꺼번에 내려받지 않습니다.
- 카테고리 × 검색 × 정렬 조합에 필요한 복합 색인 9개가 `firestore.indexes.json` 에 들어 있습니다.

### 10-5. 공유 링크가 동작하는 방식
1. 저장할 때 Firestore 가 만든 고유 ID 로 문서를 저장합니다.
2. `/quiz/고유ID` 를 열면 주소에서 ID 를 꺼내 **DB 에서 직접 조회**합니다. 브라우저의 로컬 데이터나 로그인 상태에 의존하지 않습니다.
3. Hosting(`firebase.json`)과 Vite 모두 모든 주소를 `index.html` 로 돌려주므로 새로고침·직접 접속이 됩니다.
4. 푸는 중 상태와 결과는 **sessionStorage(이 탭)** 에만 저장해 새로고침해도 이어서 풀 수 있습니다. 퀴즈가 수정되면 이전 진행 상태는 자동으로 버립니다.

### 10-6. 채점 규칙
- 주관식: 띄어쓰기·대소문자·전각/반각 차이를 무시합니다. (`서울 특별시` = `서울특별시`, `BTS` = `bts`) "다른 인정 답안"도 정답 처리합니다.
- 객관식: 고른 보기와 정답 보기가 같으면 정답.
- 건너뛴 문제는 오답으로 계산합니다. 점수 = 정답 수 ÷ 전체 × 100 (반올림), 정답률은 소수 첫째 자리까지.

---

## 11. 보안 설계와 한계

### 11-1. 보안 규칙으로 막는 것 (`firestore.rules`, `storage.rules`, 테스트 32개로 검증)
- 비로그인 방문자는 **공개 + active** 퀴즈만 읽기 가능. 비공개 퀴즈는 소유자만.
- 생성·수정·삭제는 로그인(익명 포함)한 **소유자만**. `ownerUid` 는 클라이언트가 보낸 값을 믿지 않고 `request.auth.uid` 와 같아야 저장됩니다.
- 허용된 필드만 저장, 제목 1~100자, 설명 ≤500자, 카테고리 목록, 문제 1~100개, `questionCount` 일치, 이미지 URL 형식(https), 생성 시 `playCount = 0`, 시간은 서버 시간만.
- 소유자도 `ownerUid / status / playCount / createdAt` 은 바꿀 수 없습니다.
- 플레이 수는 로그인 사용자 누구나 **정확히 +1** 만 가능.
- Storage: 본인 폴더(`quiz-images/{uid}/...`)에만, JPG/PNG/WEBP/GIF(SVG 불가), 2MB 미만, 정해진 파일명 형식만 업로드. 목록 조회·삭제는 본인만.
- 썸네일(과 첫 문제) 이미지 주소는 **본인의, 그 퀴즈 폴더에 올린 Firebase Storage 주소만** 허용합니다. (다른 퀴즈 폴더 이미지를 가리키면, 그 퀴즈를 지울 때 이미지가 함께 사라지므로 막음) 외부 서버 주소를 넣어 방문자의 IP 를 수집하거나(추적 픽셀) `localhost` 로 요청을 보내게 하는 것을 막습니다.
- 그 밖의 모든 경로는 읽기/쓰기 차단 (공개 읽기/쓰기 상태로 배포하지 않음).

### 11-1-1. 화면(브라우저) 쪽 방어
- 사용자 입력은 항상 `textContent` 로 넣고 `innerHTML` 을 쓰지 않습니다(스크립트 삽입 방지).
- DB 에서 읽은 데이터는 "믿지 않고" 형식을 다시 정리합니다(`services/quizModel.js` 의 `fromStored`). 규칙이 검사하지 못하는 2번째 이후 문제의 잘못된 형식·외부 이미지 주소는 이 단계에서 걸러져 표시되지 않습니다(`utils/safeUrl.js`).
- 글자 수는 보안 규칙과 같은 방식으로 셉니다(이모지 = 2글자). 기준이 달라 "저장할 때만 실패"하는 일을 막습니다.
- 배포 시 `firebase.json` 이 보안 헤더를 붙입니다: **CSP**(허용된 곳의 스크립트·이미지·통신만), 다른 사이트에 끼워 넣기 금지(`frame-ancestors 'none'`, `X-Frame-Options`), `nosniff`, `Referrer-Policy`, `Permissions-Policy`(카메라·마이크·위치 차단).
  - CSP 는 Hosting 에뮬레이터에서 데모 빌드로 검증했지만, **실제 Firebase 서버와 통신하는 상태로는 검증하지 못했습니다.** 배포 후 화면이 비거나 브라우저 콘솔(F12)에 `Refused to connect` 오류가 보이면 `firebase.json` 의 `Content-Security-Policy` 에서 해당 주소를 `connect-src` 에 추가하세요.
- 개발 서버는 기본적으로 내 컴퓨터에서만 열립니다(`npm run dev:lan` 일 때만 같은 네트워크에 공개).

### 11-2. 클라이언트 검증만으로는 안전하지 않습니다
화면의 입력 검증은 사용자 편의를 위한 것입니다. 실제 방어는 보안 규칙이 하지만, 규칙만으로 **할 수 없는** 것이 있습니다. 필요하면 Cloud Functions 같은 서버 코드가 있어야 합니다.

| 한계 | 이유 | 해결 방법(미구현) |
|---|---|---|
| 문제 배열 **각 항목**의 내용(빈 문제, 객관식 정답이 보기에 있는지 등)은 첫 문제만 검사 | 보안 규칙에는 반복문이 없음 | Cloud Functions 로 저장 시 검증 |
| **정답이 퀴즈 문서에 함께 들어 있어** 개발자 도구로 볼 수 있음 | 서버 없이 브라우저에서 채점하므로 | 정답을 별도 비공개 컬렉션에 두고 Functions 로 채점 |
| 플레이 수를 반복 호출로 부풀릴 수 있음(+1 씩) | 규칙은 호출 빈도를 셀 수 없음 | Functions + 사용자별 기록, App Check |
| 익명 계정을 계속 새로 만들어 스팸 퀴즈 생성 가능 | 익명 인증 특성 | App Check, 신고·관리 기능, 로그인 도입 |
| `getDownloadURL` 로 받은 이미지 URL 은 규칙과 무관하게 누구나 열 수 있음 | Storage 토큰 URL 의 특성 | 비공개 퀴즈에 민감한 이미지를 올리지 않기 / 서명 URL 사용 |
| 퀴즈에 쓰지 않는 이미지도 본인 폴더에 계속 올릴 수 있음(저장 용량·비용 남용). 정상 사용 중 생기는 남는 파일(수정으로 빠진 이미지, 실패한 저장 시도)은 저장할 때마다 그 퀴즈 폴더에서 자동 정리 | 업로드는 퀴즈 저장보다 먼저 일어나 규칙이 연결 여부를 알 수 없음 | Functions 로 주기적 정리, Storage 예산 알림 설정 |
| `searchTokens` 에 제목과 무관한 단어를 넣어 검색 결과에 끼어들 수 있음 | 규칙은 배열 항목을 하나하나 검사 불가 | Functions 로 저장 시 토큰 재계산 |
| 존재하지만 비공개인 ID 와 없는 ID 를 구분할 수 있음 | "없음"과 "권한 없음" 응답이 다름 | ID 가 무작위 20자라 추측은 사실상 불가능해 허용 |
| 익명 계정이 계속 쌓임 | 방문자가 퀴즈를 끝까지 풀면 플레이 수 기록을 위해 익명 로그인 | Identity Platform 으로 업그레이드 후 익명 계정 자동 삭제 설정 |
| 임시 저장본은 이 브라우저(localStorage)에 남음 | 기기 공유 시 다른 사람이 볼 수 있음 | 공용 PC 에서는 "작성 취소"로 지우기 |

### 11-3. 익명 인증의 한계 (사용자 안내 포함)
- 회원가입 없이 **"이 브라우저"를 사용자로 인식**합니다. 브라우저 데이터를 지우거나 다른 기기·브라우저를 쓰면 **새 사용자**가 되어 기존 퀴즈를 수정·삭제할 수 없습니다. 기존 퀴즈가 새 사용자에게 자동으로 넘어가지 않습니다.
- 계정 연결·복구 기능이 아직 없어 **데이터 복구를 보장할 수 없습니다.** "내 퀴즈" 화면에도 이 안내를 표시합니다. (공개 퀴즈의 공유 링크는 계속 동작합니다)

---

## 12. 아직 구현하지 않은 기능

- ⬜ **음악(오디오) 퀴즈:** 오디오 업로드·재생은 구현하지 않았습니다. 문제 유형은 `src/utils/constants.js` 의 `QUESTION_TYPES` 에 등록하는 구조라서, `audio` 유형을 추가하고 `storage.rules` 에 오디오 MIME 형식을 허용한 뒤 편집기(`pages/editor.js`)·플레이 화면(`pages/play.js`)을 확장하면 됩니다. (노래 샘플 퀴즈는 오디오 없이 **가사 텍스트**로 맞히는 방식입니다)
- ⬜ 구글 로그인 등 계정 연결·데이터 복구 (익명 → 정식 계정 연결)
- ⬜ 서버 측 채점·정답 숨기기, 플레이 수 조작 방지 (11-2 참고)
- ⬜ 신고·관리자 숨김 화면 (`status` 필드만 예약해 둠)
- ⬜ 제목 중간 글자·설명 내용까지 찾는 전문 검색
- ⬜ App Check 는 코드에 연결했지만 실제 프로젝트에서 검증하지 못함

### 샘플 퀴즈 41세트 (각 50문제)
한국사 · 세계사 · 생활 상식 · 과학 · 세계 수도·지리 · 우리나라 지리 · 맞춤법 · 사자성어 · 기초 영어 · 노래 가사(민요·동요·세계 명곡) · 발라드 명곡(제목 보고 가수 맞히기) · 클래식 음악 · K-POP 아이돌 세대별 · 영화 · 한국 드라마 · 애니메이션 · 게임 · 축구 · 올림픽·스포츠 · 수학 · 동물·자연 · 한식·음식 · 속담 · 세계 국기 · 우주·천문 · 인체·건강 · 야구 · 브랜드·기업 · 넌센스 · 줄임말·신조어 · 세계 지리(산·강·명소) · 역사 인물 · 물리 · 화학 · 농구 · 팝송 명곡(가사 인용 없음) · 발명·발견 · 공룡·고생물 · 보드게임·전통 놀이 · 우리 문화유산·여행지 · 디즈니·픽사

- 노래 퀴즈의 가사는 **저작권 보호 기간이 끝난** 전래동요·민요·세계 고전 노래만 짧게 인용했습니다.
- 시간이 지나면 바뀔 수 있는 정보는 문제나 설명에 기준 시점을 적었습니다 (아이돌·야구·농구는 2025년, 축구·드라마는 2026년 10월 기준). 새 세트는 `src/data/samples/` 에 파일을 추가하고 `index.js` 에 등록하면 됩니다. 추가하면 `npm test` 가 50문제 여부, 정답 채점, 보기 중복 등을 자동 검사합니다.
