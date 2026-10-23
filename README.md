# 픽디 (Pick D)

피부 시술과 홈케어 기기를 **나에게 맞는지** 기준으로 비교해 보는 앱입니다.
피부타입 분석 결과를 바탕으로 시술·기기의 궁합 점수를 보여주고, 최대 3개를 나란히 비교할 수 있습니다.

> **지금은 베타 테스트 준비 중입니다.** 화면·데이터가 자주 바뀌고, 일부 기능은 미완성입니다.
> 모바일 앱과 웹을 **같은 코드**로 내보냅니다 — 웹 배포본도 정식 타깃입니다.

## 주요 기능

| 기능 | 설명 |
|---|---|
| 피부타입 분석 | 8문항 퀴즈(Baumann 4축)로 피부타입·6대 지표(모공·주름·색소·UV색소·탄력·피부톤)를 추정. 카메라 분석도 있음 |
| 피부 리포트 | 추정 피부 나이·종합 점수, 강점/신경 쓸 지표 |
| 시술·기기 탐색 | 시술·기기 상세, 가격 제보, 사진, 리뷰 |
| 궁합 점수 | 내 피부타입·얼굴형과 시술·기기 카테고리의 궁합 |
| 비교함 | 시술·기기를 최대 3개까지 담아 비교·추천 |
| 커뮤니티 | 게시글·댓글, 광고 의심 글 필터 |
| 피부 관리 | 루틴, 피부 일기, 성분 분석, AI 상담 |
| 병원 찾기 | 카카오맵 기반 주변 병원·제휴 클리닉 |

## 스택

- **앱**: Expo 56 · Expo Router · React Native 0.85 · TypeScript
- **웹**: react-native-web 0.21 (Vercel 배포)
- **상태**: Zustand
- **백엔드**: Supabase (Postgres · Auth · Storage · Edge Functions/Deno)
- **결제**: 토스페이먼츠 (준비 중)
- **테스트**: jest-expo · React Native Testing Library

## 로컬에서 실행하기

필요한 것: Node 22, npm. 휴대폰에서 보려면 [Expo Go](https://expo.dev/go).

```bash
npm ci
cp .env.example .env      # Windows PowerShell: Copy-Item .env.example .env
# .env 에 값을 채운다 (아래 표 참고 — 값은 팀에 따로 요청)
npx expo start            # QR 을 Expo Go 로 스캔
npm run web               # 브라우저에서 웹 버전
```

### 환경변수

`.env.example` 이 기준입니다. **`.env` 는 커밋하지 않습니다.**

| 이름 | 어디에 | 설명 |
|---|---|---|
| `EXPO_PUBLIC_SUPABASE_URL` | 앱 `.env` | Supabase 프로젝트 URL |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | 앱 `.env` | Supabase anon(공개) 키 |
| `EXPO_PUBLIC_TOSS_CLIENT_KEY` | 앱 `.env` | 토스페이먼츠 **클라이언트** 키 |
| `EXPO_PUBLIC_KAKAO_JS_KEY` | 앱 `.env` | 카카오맵 JavaScript 키 |
| `SUPABASE_SERVICE_ROLE_KEY`, `TOSS_SECRET_KEY`, `ANTHROPIC_API_KEY`, `GOOGLE_VISION_API_KEY`, `AGENT_SECRET`, `GITHUB_TOKEN` | Edge Function 시크릿 | `npx supabase secrets set` 으로만 넣는다 |

`EXPO_PUBLIC_` 이 붙은 값은 앱 번들에 그대로 들어가 누구나 볼 수 있습니다.
시크릿 키(서비스 롤·토스 시크릿·AI 키)는 **절대** `EXPO_PUBLIC_` 으로 두지 않습니다.

## 자주 쓰는 명령

```bash
npm test              # 단위 테스트 (jest-expo)
npm run typecheck     # tsc --noEmit — 커밋 전 필수
npm run lint          # eslint (현재 기존 위반이 남아 있어 CI 에서는 경고만)
npm run format:check  # prettier 검사 (기존 코드는 아직 일괄 포맷 전)
npm run build:web     # 웹 빌드 → dist/
```

PR 을 올리면 GitHub Actions(`.github/workflows/check.yml`)가 타입 검사·테스트·린트를 돌립니다.

## 폴더 구조

```
app/              화면 (Expo Router 파일 기반 라우팅)
  (auth)/         로그인·회원가입·온보딩
  (tabs)/         홈 / 커뮤니티 / 검색 / 비교 / 마이페이지
  device/ treatment/ post/   상세 화면
components/       공용 컴포넌트
hooks/            Zustand 스토어 (useAuth, useCompare, ...)
lib/              순수 로직·클라이언트 (supabase, 낙관적 쓰기, 피부 퀴즈·리포트 계산)
constants/ types/ 색상·공통 타입
__tests__/        단위 테스트
supabase/         migrations · seed · Edge Functions(Deno)
docs/             내부 문서
```

## 배포

- **웹**: `main` 에 push 하면 Vercel 이 자동 배포합니다 (`vercel.json`).
- **모바일 베타**: `eas.json` 에 development / preview / production 프로필이 있습니다.
  처음 한 번은 `npx eas-cli login` → `npx eas-cli build:configure` 로 프로젝트를 연결해야 합니다.

> `HANDOFF.md` 에는 배포가 Netlify 로 적혀 있지만 예전 정보입니다. 지금은 Vercel 입니다.

## 베타 피드백

<!-- TODO: 베타 피드백 채널을 정하면 여기에 적는다 (예: 구글 폼 링크, 오픈채팅, GitHub Issues) -->
- 버그·불편한 점: _(피드백 채널 준비 중)_
- 보안 취약점은 공개 이슈로 올리지 말고 [SECURITY.md](SECURITY.md) 의 방법으로 제보해 주세요.

## 협업자에게

작업 전에 [AGENTS.md](AGENTS.md) 를 먼저 읽어 주세요. 웹에서 `Alert.alert` 이 빈 함수인 문제,
낙관적 쓰기 규칙(`lib/mutate.ts`), 패키지 추가 전 점검 같은 이미 밟은 함정이 정리돼 있습니다.
