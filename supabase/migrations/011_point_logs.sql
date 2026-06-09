-- ================================================================
-- 011_point_logs.sql
-- point_logs (포인트 내역) 테이블 생성
-- ================================================================

CREATE TABLE IF NOT EXISTS point_logs (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  amount     INTEGER NOT NULL,
  reason     TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE point_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "본인 포인트 내역 조회" ON point_logs;
DROP POLICY IF EXISTS "본인 포인트 내역 삽입" ON point_logs;

CREATE POLICY "본인 포인트 내역 조회" ON point_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "본인 포인트 내역 삽입" ON point_logs FOR INSERT WITH CHECK (auth.uid() = user_id);
