-- ============================================================
-- Migration 007: profiles에 사진 URL 컬럼 추가
-- Supabase SQL Editor에서 실행하세요.
-- ============================================================

-- 1. 회원가입 시 촬영한 얼굴 사진 URL (피부 분석 보고서용)
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS face_photo_url TEXT;

-- 2. 마이페이지 프로필 사진 URL
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- 확인
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'profiles'
  AND column_name IN ('face_photo_url', 'avatar_url');
