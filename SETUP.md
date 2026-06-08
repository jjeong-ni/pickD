# 픽디 셋업 가이드

## 1. Supabase 프로젝트 만들기
1. https://supabase.com 접속 → 새 프로젝트 생성
2. Project Settings → API에서 URL과 anon key 복사
3. `.env` 파일에 입력:
   ```
   EXPO_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
   EXPO_PUBLIC_TOSS_CLIENT_KEY=test_ck_...  ← 토스페이먼츠 대시보드에서 확인
   ```

## 2. DB 스키마 적용
Supabase 대시보드 → SQL Editor에서 순서대로 실행:
- `supabase/migrations/001_initial.sql`
- `supabase/migrations/002_functions.sql`

## 3. Edge Function 배포
```bash
npx supabase login
npx supabase link --project-ref your-project-ref
npx supabase functions deploy confirm-payment
```

## 4. 앱 실행
```bash
npm start
```
- iOS 시뮬레이터: `i` 키
- Android 에뮬레이터: `a` 키
- 실기기: Expo Go 앱으로 QR 스캔

## 5. 베타 배포 (EAS Build)
```bash
npm install -g eas-cli
eas login
eas build:configure
eas build --platform all --profile preview
```
- iOS: TestFlight로 배포
- Android: Google Play 내부 테스트 트랙

## 토스페이먼츠 클라이언트 키 확인
- 토스페이먼츠 개발자 센터(https://developers.tosspayments.com) 로그인
- 내 개발 정보 → 테스트 클라이언트 키 확인 (test_ck_... 형태)
- `.env`의 EXPO_PUBLIC_TOSS_CLIENT_KEY에 입력
