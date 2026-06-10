-- 커뮤니티 가격 제보 테이블
CREATE TABLE IF NOT EXISTS price_reports (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  item_id     UUID NOT NULL,
  item_type   TEXT NOT NULL CHECK (item_type IN ('treatment', 'device')),
  item_name   TEXT NOT NULL,
  clinic_name TEXT NOT NULL,
  region      TEXT NOT NULL,  -- 강남, 홍대, 신촌, 분당, 기타
  price       INTEGER NOT NULL CHECK (price > 0),
  visited_at  DATE NOT NULL,
  notes       TEXT,
  helpful     INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE price_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read price reports"
  ON price_reports FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert own price reports"
  ON price_reports FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own price reports"
  ON price_reports FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_price_reports_item
  ON price_reports (item_id, item_type, created_at DESC);
