-- =============================================
-- 003_review_images.sql
-- 리뷰 이미지 업로드 지원
-- =============================================

-- 1) reviews 테이블에 image_url 컬럼 추가
ALTER TABLE reviews
  ADD COLUMN IF NOT EXISTS image_url TEXT DEFAULT NULL;

-- 2) Supabase Storage: review-images 버킷 생성
INSERT INTO storage.buckets (id, name, public)
VALUES ('review-images', 'review-images', true)
ON CONFLICT (id) DO NOTHING;

-- 3) Storage 정책: 인증된 사용자만 업로드 가능
CREATE POLICY "Authenticated users can upload review images"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'review-images');

-- 4) Storage 정책: 모든 사용자 공개 읽기 가능
CREATE POLICY "Public read access for review images"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'review-images');

-- 5) Storage 정책: 본인 파일만 삭제 가능
CREATE POLICY "Users can delete their own review images"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'review-images' AND owner = auth.uid());
