-- ============================================================
-- Migration 005: 이미지 갤러리 + 쿠팡URL + 기기 상세 컬럼 추가
-- Supabase SQL Editor에서 실행하세요.
-- ============================================================

-- treatments: 이미지 배열, 동영상, 상세 정보 컬럼
ALTER TABLE treatments
  ADD COLUMN IF NOT EXISTS images       TEXT[]  DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS video_url    TEXT,
  ADD COLUMN IF NOT EXISTS pain_level   TEXT,
  ADD COLUMN IF NOT EXISTS downtime     TEXT,
  ADD COLUMN IF NOT EXISTS duration     TEXT,
  ADD COLUMN IF NOT EXISTS sessions     TEXT,
  ADD COLUMN IF NOT EXISTS side_effects TEXT,
  ADD COLUMN IF NOT EXISTS contraindications TEXT;

-- devices: 이미지 배열, 동영상, 쿠팡URL, 상세 컬럼
ALTER TABLE devices
  ADD COLUMN IF NOT EXISTS images       TEXT[]  DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS video_url    TEXT,
  ADD COLUMN IF NOT EXISTS coupang_url  TEXT,
  ADD COLUMN IF NOT EXISTS usage_frequency  TEXT,
  ADD COLUMN IF NOT EXISTS results_timeline TEXT,
  ADD COLUMN IF NOT EXISTS side_effects TEXT,
  ADD COLUMN IF NOT EXISTS contraindications TEXT;

-- 확인
SELECT column_name FROM information_schema.columns
WHERE table_name IN ('treatments','devices')
  AND column_name IN ('images','video_url','coupang_url','pain_level','downtime')
ORDER BY table_name, column_name;
