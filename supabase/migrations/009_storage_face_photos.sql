-- ============================================================
-- Migration 009: face-photos Storage 버킷 설정
-- Supabase SQL Editor에서 실행하세요.
-- ============================================================

-- 1. face-photos 버킷 생성 (이미 있으면 public=true 로 업데이트)
INSERT INTO storage.buckets (id, name, public)
VALUES ('face-photos', 'face-photos', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 2. 기존 정책 삭제 (멱등성 보장)
DROP POLICY IF EXISTS "auth users upload face photo" ON storage.objects;
DROP POLICY IF EXISTS "public read face photos" ON storage.objects;
DROP POLICY IF EXISTS "auth users update face photo" ON storage.objects;

-- 3. 인증된 사용자: 업로드 허용
CREATE POLICY "auth users upload face photo"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'face-photos');

-- 4. 전체 공개: 읽기 허용 (skin report에서 getPublicUrl 로 접근)
CREATE POLICY "public read face photos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'face-photos');

-- 5. 인증된 사용자: 덮어쓰기 허용 (upsert:true 대응)
CREATE POLICY "auth users update face photo"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'face-photos');
