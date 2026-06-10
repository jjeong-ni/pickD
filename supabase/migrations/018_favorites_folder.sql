-- favorites 테이블에 folder 컬럼 추가
ALTER TABLE favorites
  ADD COLUMN IF NOT EXISTS folder TEXT NOT NULL DEFAULT '기본';

-- 인덱스 (user_id + folder 필터링용)
CREATE INDEX IF NOT EXISTS idx_favorites_user_folder
  ON favorites (user_id, folder);
