-- point_logs 테이블 생성 (미션 & 포인트 시스템)
CREATE TABLE IF NOT EXISTS point_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  amount INT NOT NULL,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS 활성화
ALTER TABLE point_logs ENABLE ROW LEVEL SECURITY;

-- 본인 로그만 조회
CREATE POLICY "본인 로그만 조회" ON point_logs
  FOR SELECT USING (auth.uid() = user_id);

-- 본인 로그만 삽입
CREATE POLICY "본인 로그만 삽입" ON point_logs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 기존 가입 회원 1,000pt 지급 기록 (이미 points=1000인 프로필)
INSERT INTO point_logs (user_id, amount, reason)
SELECT id, 1000, '신규 가입'
FROM profiles
WHERE points = 1000
  AND id NOT IN (SELECT user_id FROM point_logs WHERE reason = '신규 가입');
