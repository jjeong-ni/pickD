-- 피부 분석 히스토리 테이블 생성
CREATE TABLE IF NOT EXISTS skin_analysis_history (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  skin_type     TEXT NOT NULL,
  baumann_code  TEXT NOT NULL,
  skin_metrics  JSONB,
  skin_dehydration BOOLEAN DEFAULT FALSE,
  analyzed_at   TIMESTAMPTZ DEFAULT NOW()
);

-- RLS 활성화
ALTER TABLE skin_analysis_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own skin history"
  ON skin_analysis_history FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own skin history"
  ON skin_analysis_history FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- 인덱스 (user_id + analyzed_at 정렬용)
CREATE INDEX IF NOT EXISTS idx_skin_analysis_history_user_date
  ON skin_analysis_history (user_id, analyzed_at DESC);
