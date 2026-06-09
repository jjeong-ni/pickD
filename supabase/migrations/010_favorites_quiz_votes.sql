-- ================================================================
-- 010_favorites_quiz_votes.sql
-- favorites (찜하기) + quiz_votes (퀴즈 투표) 테이블 생성
-- ================================================================

-- ── favorites ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS favorites (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  item_id    UUID NOT NULL,
  item_type  TEXT NOT NULL CHECK (item_type IN ('treatment', 'device')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, item_id, item_type)
);

ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "본인 찜 조회" ON favorites;
DROP POLICY IF EXISTS "본인 찜 추가" ON favorites;
DROP POLICY IF EXISTS "본인 찜 삭제" ON favorites;

CREATE POLICY "본인 찜 조회" ON favorites FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "본인 찜 추가" ON favorites FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "본인 찜 삭제" ON favorites FOR DELETE USING (auth.uid() = user_id);

-- ── quiz_votes ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS quiz_votes (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id      UUID REFERENCES posts(id) ON DELETE CASCADE NOT NULL,
  user_id      UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  option_index INTEGER NOT NULL CHECK (option_index IN (0, 1)),
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(post_id, user_id)
);

ALTER TABLE quiz_votes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "누구나 투표 조회" ON quiz_votes;
DROP POLICY IF EXISTS "본인 투표 삽입" ON quiz_votes;

CREATE POLICY "누구나 투표 조회" ON quiz_votes FOR SELECT USING (true);
CREATE POLICY "본인 투표 삽입" ON quiz_votes FOR INSERT WITH CHECK (auth.uid() = user_id);
