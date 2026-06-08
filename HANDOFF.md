# 픽디 핸드오프 문서

> 새 채팅에서 이어서 작업할 때 이 파일을 먼저 읽고 시작하세요.
> 마지막 업데이트: 2026-06-08 (2차)

---

## 프로젝트 기본 정보

| 항목 | 내용 |
|------|------|
| 앱명 | 픽디 (Pickdi) |
| 스택 | Expo 56 + Expo Router + Supabase + Zustand |
| 배포 | Netlify (React Native Web SPA) |
| 위치 | `C:\Users\jeong\OneDrive\Desktop\클로드\pickdi` |
| Supabase Project ID | `cnjykhdvbvewagfbbxwr` |
| Supabase Region | ap-southeast-1 (Singapore) |
| Supabase Instance ID | `9cc36b49-60b7-44d9-84ae-0bb531d0e4e6` |

---

## 완료된 작업 누적

### ✅ 시드 데이터 생성 및 실행
- `supabase/seed_data.sql` 생성 및 실행 완료
- 시술 25개, 기기 25개, 더미 리뷰어 20명, 리뷰 ~5000개

### ✅ DB 외래키(FK) 정리
```sql
posts.user_id → profiles.id
comments.user_id → profiles.id
reviews.user_id → profiles.id
```

### ✅ 자동 프로필 생성 트리거
- `auth.users` INSERT 시 자동으로 `profiles` 생성

### ✅ 스토리지 버킷 생성
- `item-images` (Public) 버킷 생성 완료

### ✅ signup.tsx 수정
- profiles upsert에 `id: loginData.session.user.id` 추가

### ✅ 홈화면 닉네임 버그 수정
- `app/(tabs)/index.tsx` — `??` → `||` 로 변경, 이메일 ID 폴백 추가
- mypage와 동일한 방식: `profile?.nickname || user?.email?.split('@')[0] || '사용자'`

### ✅ 커뮤니티 게시글 작성 후 미표시 버그 수정
- 원인: modal은 부모 화면 포커스를 빼앗지 않아 `useFocusEffect` 미실행
- 해결: `hooks/usePostStore.ts` (refreshKey/triggerRefresh) 생성
- `post/create.tsx` → 등록 후 `triggerRefresh()` 호출
- `community.tsx` → `useEffect([category, refreshKey])` 로 즉시 감지

### ✅ 커뮤니티 공지 3개 + 어뷰징 필터
- 공지: UI 하드코딩 (DB 변경 없음), 노란 배경, 탭하면 내용 펼침
- 어뷰징 필터: 키워드 감지 → 흐림 + "광고 의심" 오버레이 → 확인 버튼으로 해제
- 테스트 스팸 게시글 Supabase에 삽입 완료

### ✅ Netlify 재배포
- `npm run build:web` 완료, dist 폴더 업로드 완료

### ✅ 검색 카테고리 이모지 추가 (P0-2)
- `app/(tabs)/search.tsx`
- `CategoryOption { label, value }` 패턴으로 분리 — 표시(label)와 DB 쿼리(value)를 독립
- 시술: ✨ 리프팅, 💉 보톡스, 💫 필러, ⚡ 레이저, 🌿 스킨케어
- 기기: ✨ 리프팅, 🪄 제모, ⚡ RF, 💡 LED, 🌊 초음파
- `.eq('category', item.value)` 로 DB 쿼리하므로 이모지가 필터에 영향 없음

### ✅ 비교화면 AI 버튼 강화 + 결과 유지 (P0-3/4)
- `app/(tabs)/compare.tsx`
- `savedAiResult` 상태 추가 → 모달 닫은 후에도 AI 결과 메모리에 유지
- `displayResult = aiResult ?? savedAiResult` 계산 변수로 모달 렌더링
- `handleCloseAI()` — 닫기 전 `setSavedAiResult(aiResult)` 저장
- 핑크 배너(`aiResultBanner`) — 모달 닫힌 상태에서 결과 요약 + 탭하면 재오픈
- AI 버튼 전체 핑크 배경(Colors.primary), 아이콘 박스(불투명 흰색 25%) 디자인
- items useEffect에서 `setSavedAiResult(null)` → 비교 항목 바뀌면 자동 무효화

### ✅ 시술↔기기 연결 섹션 (P1-3)
- `app/treatment/[id].tsx` — "🏠 집에서도 비슷한 효과" 섹션 추가
  - 같은 카테고리의 `devices` 최대 4개 가로 스크롤
- `app/device/[id].tsx` — "💉 클리닉 시술로 더 강력하게" 섹션 추가
  - 같은 카테고리의 `treatments` 최대 4개 가로 스크롤
- 각 카드 탭 → 해당 상세 화면으로 이동

### ✅ 회원가입 9단계 → 3단계 단순화 (P1-4)
- `app/(auth)/signup.tsx` 완전 재작성
  - Step 1: 이메일 + 비밀번호(확인 포함)
  - Step 2: 닉네임
  - Step 3: 환영 카드 (🪙 +1,000 포인트 배지 표시)
  - profiles upsert 시 `points: 1000` 자동 지급
  - "이미 등록된 이메일" 한국어 안내 처리
- `app/profile-setup.tsx` 신규 생성 (피부 프로필은 별도 화면으로 분리)
  - skin_type(필수), age_group(선택), concerns(복수 선택)
  - `supabase.from('profiles').upsert(..., { onConflict: 'user_id' })`
  - 저장 후 `fetchProfile(user.id)` 호출 → Zustand 상태 즉시 갱신
  - "나중에 하기" 스킵 버튼 제공
- `app/_layout.tsx` — `purchases`, `profile-setup` 라우트 등록

### ✅ 홈화면 맞춤 추천 섹션 + 프로필 유도 (P1-5)
- `app/(tabs)/index.tsx`
  - `fetchRecommended()` — `profile.concerns[0]` 기반 `.contains('tags', [concern])` 쿼리
  - "OO 고민 맞춤 추천" 섹션 — 인기 시술 위에 표시 (추천 있을 때만)
  - `profilePrompt` 카드 — 로그인했지만 skin_type 없을 때 `/profile-setup` 유도
  - 배너 로직 수정: 로그인+프로필 없음 → profilePrompt만 표시 (중복 CTA 제거)

### ✅ 이미지 갤러리 + 동영상 + 쿠팡파트너스 + 반응형 (2026-06-08 2차)
- `components/MediaGallery.tsx` 신규 — 이미지 캐러셀 + YouTube WebView, 페이지 인디케이터
- `treatment/[id].tsx` — MediaGallery 교체, 시술 상세 정보 그리드(통증/다운타임/횟수/유지기간/부작용)
- `device/[id].tsx` — MediaGallery 교체, 기기 상세 그리드, 쿠팡파트너스 섹션(제휴 고지 포함), coupang_url 우선 → 검색 fallback
- `hooks/useResponsive.ts` 신규 — windowWidth 반응, cardColumns/cardWidth/hPad 반환
- `app/(tabs)/index.tsx` — useResponsive 적용, 카드 너비 동적 계산
- `types/index.ts` — Treatment/Device에 `images[]`, `video_url`, `coupang_url` 추가; Profile에 `baumann_code`, `skin_metrics`, `skin_dehydration` 추가; `SkinMetrics` 인터페이스 추가
- `supabase/migrations/004_profile_skin_metrics.sql` — baumann_code, skin_metrics, skin_dehydration 컬럼
- `supabase/migrations/005_items_gallery_coupang.sql` — treatments/devices에 images, video_url, coupang_url 등 컬럼

### ✅ analysis-report.tsx Focuskin 업그레이드 (2026-06-08 2차)
- Baumann 코드 배지 (리포트 헤더 + 피부타입 카드)
- Baumann 4축 분류 카드 (유분·수분 / 민감도 / 색소침착 / 탄력·주름)
- 6대 피부 지표 컬러바 (모공/주름/색소침착/UV색소침착/탄력/피부톤) + 양호/보통/주의 레벨 뱃지
- `skin-analysis.tsx` handleSave — baumann_code, skin_metrics, skin_dehydration 함께 저장

### ✅ 카카오맵 WebView — 근처 피부과 찾기 (2026-06-08)
- `app/clinic-map.tsx` 신규 생성
  - params: `treatmentName` (optional) — 시술명/카테고리 전달
  - `expo-location`으로 위치 권한 요청 → 현재 좌표 획득
  - `react-native-webview`로 카카오 지도 HTML 렌더링
  - 카카오맵 키워드 검색 API로 반경 5km 피부과 마커 표시
  - 마커 탭 → 병원명·주소·전화번호 InfoWindow + 카카오맵 외부 링크
  - 위치 권한 거부 시: 설정 이동 / 서울 강남 기본값 선택
  - 웹(Netlify) 환경: 카카오맵 웹사이트로 직접 연결
  - **⚠️ KAKAO_JS_KEY 설정 필요** — `app/clinic-map.tsx` 상단 참고
- `app/treatment/[id].tsx` — disclaimer 위에 "📍 근처 피부과 찾기" 배너 추가
- `app/device/[id].tsx` — "📍 전문가 시술 받으러 가기" 배너 추가
- `app/(tabs)/search.tsx` — 카테고리 필터 우측에 "📍" 지도 버튼 추가 (treatment 탭)
- `app/_layout.tsx` — `clinic-map` 라우트 등록

### ✅ 구매내역 화면 신규 구현 (P1-6)
- `app/purchases.tsx` 신규 생성
  - `payments` 테이블 조회 (user_id 기반, created_at DESC)
  - 상태 뱃지: 결제완료(초록), 대기(주황), 실패(빨강), 취소(회색)
  - 빈 상태: "시술·기기 둘러보기" 버튼으로 검색 화면 이동
- `app/(tabs)/mypage.tsx` — "구매 내역" 메뉴 `/purchases` 연결

---

## ⚠️ 미검증 항목 (브라우저에서 직접 확인 필요)

| 항목 | 확인 방법 |
|------|-----------|
| 홈화면 닉네임 표시 | 로그인 후 홈 → "OOO 님" 이메일 ID 표시 확인 |
| 커뮤니티 글 작성 후 즉시 표시 | 글쓰기 → 등록 후 목록에 즉시 노출 확인 |
| 공지 펼침/접힘 | 커뮤니티 상단 공지 탭 시 내용 토글 확인 |
| 스팸 필터 오버레이 | "링크 클릭하세요~" 게시글에 흐림+오버레이 표시 확인 |

---

## ⚠️ 사용자가 직접 실행해야 할 SQL

### P0-1: review_count 동기화 (현재 0으로 고정)
```sql
UPDATE treatments
SET review_count = (
  SELECT COUNT(*) FROM reviews
  WHERE item_id = treatments.id AND item_type = 'treatment'
);

UPDATE devices
SET review_count = (
  SELECT COUNT(*) FROM reviews
  WHERE item_id = devices.id AND item_type = 'device'
);
```

### P1-1: 포인트 내역 테이블 생성
```sql
CREATE TABLE IF NOT EXISTS point_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  amount INT NOT NULL,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 기존 회원 1000pt 지급 기록 삽입 (선택)
INSERT INTO point_logs (user_id, amount, reason)
SELECT id, 1000, '회원가입 축하 포인트'
FROM profiles
WHERE points = 1000;
```

---

## ❌ 미구현 기능

| 기능 | 상태 | 비고 |
|------|------|------|
| 카카오맵 API 키 설정 | ⚠️ 필요 | `app/clinic-map.tsx` 상단 KAKAO_JS_KEY 교체 필요 |
| SQL 004/005 실행 | ⚠️ 필요 | Supabase SQL Editor에서 004, 005 마이그레이션 실행 |
| 실제 상품 이미지 | ❌ 미완 | 이미지 파일 구해서 Supabase Storage 업로드 필요 |
| 쿠팡파트너스 URL | ❌ 미완 | 쿠팡파트너스 가입 후 device별 coupang_url DB 업데이트 |
| 포인트내역 화면 | ❌ 미구현 | P1-1 SQL 실행 후 구현 가능 |
| 알림설정 화면 | ❌ 미구현 | 기획 결정 필요 |
| 토스페이먼츠 실결제 | ❌ 미구현 | 클라이언트 키 필요 |
| EAS Build (앱스토어) | ❌ 미구현 | 웹 먼저 완성 후 |

---

## DB 스키마 핵심 사항

### profiles 테이블
```sql
id        UUID PRIMARY KEY   -- auth.users.id와 동일값
user_id   UUID UNIQUE NOT NULL  -- auth.users.id (fetchProfile에서 이걸로 조회)
nickname  TEXT NOT NULL
```

### Supabase Join 문법
```ts
supabase.from('posts').select('*, profile:profiles(nickname)')
```

### fetchProfile 동작 (`hooks/useAuth.ts`)
```ts
.from('profiles').select('*').eq('user_id', userId).single()
```

---

## 파일 구조 요약

```
pickdi/
├── app/
│   ├── _layout.tsx          ✅ clinic-map 라우트 추가
│   ├── clinic-map.tsx       ✅ 신규 — 카카오맵 근처 피부과 찾기
│   ├── purchases.tsx        ✅ 신규 — 구매내역 화면
│   ├── profile-setup.tsx    ✅ 신규 — 피부 프로필 설정 화면
│   ├── (auth)/
│   │   ├── login.tsx
│   │   └── signup.tsx       ✅ 3단계로 단순화, +1000pt 지급
│   ├── (tabs)/
│   │   ├── index.tsx        ✅ 맞춤추천 섹션, profilePrompt 카드
│   │   ├── community.tsx    ✅ 공지+어뷰징필터+새로고침 수정
│   │   ├── compare.tsx      ✅ savedAiResult, AI 버튼 강화
│   │   ├── search.tsx       ✅ 카테고리 이모지
│   │   └── mypage.tsx       ✅ profileSetupBanner, purchases 링크
│   ├── treatment/
│   │   └── [id].tsx         ✅ 관련 기기 섹션 추가
│   ├── device/
│   │   └── [id].tsx         ✅ 관련 시술 섹션 추가
│   └── post/
│       ├── create.tsx       ✅ triggerRefresh 추가
│       └── [id].tsx
├── hooks/
│   ├── useAuth.ts
│   ├── useCompare.ts
│   └── usePostStore.ts      ✅ 신규 생성
├── supabase/
│   ├── migrations/001_initial.sql
│   └── seed_data.sql        ✅ 실행 완료
└── HANDOFF.md
```

---

## 토스페이먼츠 연동 정보

- 시크릿 키: `test_sk_zXLkKEypNArWmo50nX3lmeaxYG5R` (Supabase Edge Function에만)
- 클라이언트 키: 미입력 → `.env`의 `EXPO_PUBLIC_TOSS_CLIENT_KEY`에 저장
- Edge Function 위치: `supabase/functions/confirm-payment/index.ts`

---

## 내가 제공해야 할 정보

1. **토스페이먼츠 클라이언트 키** → `.env` 파일에 추가
2. **실제 시술/기기 상품 이미지** → Supabase Storage 업로드
3. **구매내역/포인트/알림 화면 기획** → 동작 방식 결정

---

## 이미지 업로드 가이드 (준비 시 참고)

스토리지 URL 형식:
```
https://cnjykhdvbvewagfbbxwr.supabase.co/storage/v1/object/public/item-images/treatments/{파일명}
https://cnjykhdvbvewagfbbxwr.supabase.co/storage/v1/object/public/item-images/devices/{파일명}
```

이미지 업로드 후 DB 업데이트 SQL은 이전 HANDOFF 참고.
