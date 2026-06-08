-- ============================================================
-- Migration 004: profiles에 Baumann 코드 + 6대 피부 지표 컬럼 추가
-- Supabase SQL Editor에서 실행하세요.
-- ============================================================

-- 1. Baumann 피부타입 코드 (예: "DRNT", "OSPT" 등)
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS baumann_code TEXT;

-- 2. 6대 피부 지표 (0~100 점수, Focuskin 기준)
--    { 모공, 주름, 색소침착, UV색소침착, 탄력, 피부톤 }
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS skin_metrics JSONB;

-- 3. 속건조 여부 (Baumann D형이지만 표면은 유분 있는 경우)
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS skin_dehydration BOOLEAN DEFAULT FALSE;

-- 확인
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'profiles'
  AND column_name IN ('baumann_code', 'skin_metrics', 'skin_dehydration');
