# Expo HAS CHANGED

Read the exact versioned docs at https://docs.expo.dev/versions/v56.0.0/ before writing any code.

---

# 픽디 — 작업 전에 알아야 할 것

## 한 줄

시술·기기 비교 앱. **모바일과 웹을 같은 코드로 내보낸다.** 베타테스트 준비 중, 2인 팀.

| | |
|---|---|
| 스택 | Expo 56 · Expo Router · Supabase · Zustand · TypeScript |
| 웹 | `react-native-web` 0.21.2 — **부차 타깃이 아니라 실제 배포본** |
| 배포 | `vercel.json` + `deploy.ps1` → push 하면 Vercel 자동 배포 |
| 테스트 | **없다.** 현재 검증 수단은 `tsc --noEmit` 와 직접 띄워보기뿐 |

> `HANDOFF.md` 에는 배포가 Netlify 로 적혀 있다. `web/_redirects` 도 Netlify 유물이다.
> 지금 실제로 도는 건 Vercel 이다. 둘이 어긋나 있으니 HANDOFF 쪽을 믿지 마라.

## 명령

```bash
npm run web          # 개발 서버 (웹)
npm start            # Expo 개발 서버
npx tsc --noEmit     # 타입 검사 — 커밋 전 필수
npm run build:web    # 웹 빌드
.\deploy.ps1 "메시지"  # 빌드 + add -A + 커밋 + push (→ Vercel)
```

`deploy.ps1` 은 `git add -A` 를 한다. **작업 중인 다른 변경까지 쓸어 담는다.**
부분 커밋을 하려면 직접 `git add <경로>` 하라.

## 🔴 패키지를 추가하기 전에 — 네 줄 점검

라이브러리 하나가 네이티브 의존 두 개를 끌고 오면, 그때부터 Expo Go 로 못 돌리고
웹 빌드도 깨진다. 추가하기 **전에** 네 가지를 확인한다.

1. **웹에서 도는가.** `react-native-web` 지원 여부를 확인한다.
   "Expo 호환"은 합격선이 아니다. Expo 는 되는데 웹에서 안 되는 라이브러리가 흔하다.
2. **dev build 를 강요하는가.** 네이티브 모듈이 있으면 Expo Go 로 못 돌린다.
   지금 흐름(Expo Go + 웹)을 포기할 만한 값인지 적을 수 있어야 한다.
3. **살아 있는가.** 마지막 푸시가 1년 넘었으면 의존성이 아니라 **참고용**으로만 본다.
   (전수 조사상 star 1k~10k 레포의 **44.5%** 가 1년 넘게 방치돼 있다.
   공식 archived 표시는 8%뿐이라 표시만 믿으면 속는다.)
4. **라이선스가 명시돼 있는가.** `NOASSERTION` 이면 코드 복사 금지.

도구: https://reactnative.directory — 신아키텍처·플랫폼 지원을 한눈에 본다.

**가장 싼 선택지를 먼저 보라.** 구조·패턴만 가져오면 의존성이 0이다.
위 네 줄은 **코드를 설치할 때만** 적용된다.

## 이미 밟은 함정

### `Alert.alert` 은 웹에서 아무 일도 안 한다

```js
// react-native-web@0.21.2 — 구현 전체
class Alert { static alert() {} }
```

import 는 성공하고 호출도 되는데 **빈 함수다.** 웹 배포본에서는 조용하다.
새 코드에서 사용자에게 뭔가 알려야 하면 `lib/mutate.ts` 의 `reportMutationError()`
를 써라 — 네이티브는 Alert, 웹은 DOM 토스트로 알아서 갈라진다.

> 교훈: 크로스 플랫폼에서 **존재한다 ≠ 동작한다.** 빈 껍데기 구현이 흔하다.
> 기존 `Alert.alert` 호출부 40여 곳은 아직 안 고쳤다 (화면마다 맥락이 달라 일괄 치환은 위험).

### 쓰기는 `lib/mutate.ts` 를 통과시킨다

규칙 세 줄: ① 화면을 먼저 바꾼다 ② 실패하면 되돌린다 ③ **되돌렸다고 말한다.**
③ 이 빠지면 사용자 눈에는 "지운 게 혼자 되살아난" 것으로 보인다.
낙관적 삽입을 할 때는 `reconcile` 로 **임시 id 를 서버 id 로 바꿔 끼워야** 한다.
안 그러면 다음 삭제가 `delete().eq('id','tmp-...')` 로 0행 삭제되어 **조용히 성공**한다.

### 루트 레이아웃이 경로를 가로챈다

`app/_layout.tsx` 는 세션이 없으면 `welcome` 으로, `SIGNED_IN` 이면 `(tabs)` 로
`router.replace` 한다. **로그아웃 상태로 들어와야 하는 화면**(비밀번호 재설정 등)은
여기서 두 번 쫓겨난다. `isRecoveryPath` 처럼 예외를 명시해야 한다.

그리고 `onAuthStateChange` 구독 콜백은 **마운트 시점 값에 묶인다.**
콜백 안에서 현재 경로를 보려면 `useRef` 로 따로 들고 가야 한다.

### Supabase 조인은 FK 가 무엇을 가리키는지부터 본다

`posts/comments/reviews.user_id` 는 `auth.users.id` 가 아니라 **`profiles.id`** 를 가리킨다.
체인이 어긋나면 PostgREST 가 자동 조인을 못 해 2단계 조회를 써야 한다.

## 건드릴 때

- 커밋 전 `npx tsc --noEmit`. 남아 있는 오류는 `supabase/functions/**`(Deno 런타임) 뿐이다 —
  그 외 파일에서 오류가 나면 내가 낸 것이다.
- 웹에서 한 번 띄워보고 커밋한다. 타입만으로는 위의 '빈 껍데기' 류를 못 잡는다.
- 비밀 키는 `.env` 와 Edge Function 에만. 토스 **시크릿** 키를 앱 번들에 넣지 마라.
