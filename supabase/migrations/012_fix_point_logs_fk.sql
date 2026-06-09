-- ================================================================
-- 012_fix_point_logs_fk.sql
-- 006_point_logs.sql의 잘못된 FK (profiles.id → auth.users.id) 수정
-- 006에서 잘못 입력된 데이터 및 잘못된 RLS 정책도 정리
-- ================================================================

-- 1. 잘못된 FK 제거
ALTER TABLE point_logs DROP CONSTRAINT IF EXISTS point_logs_user_id_fkey;

-- 2. 006의 잘못된 시드 데이터 삭제 (profiles.id 기반으로 잘못 삽입된 레코드)
DELETE FROM point_logs
WHERE user_id NOT IN (SELECT id FROM auth.users);

-- 3. 올바른 FK 추가 (auth.users.id 참조)
ALTER TABLE point_logs
  ADD CONSTRAINT point_logs_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- 4. RLS 정책 전부 초기화 후 재생성
DROP POLICY IF EXISTS "본인 로그만 조회" ON point_logs;
DROP POLICY IF EXISTS "본인 로그만 삽입" ON point_logs;
DROP POLICY IF EXISTS "본인 포인트 내역 조회" ON point_logs;
DROP POLICY IF EXISTS "본인 포인트 내역 삽입" ON point_logs;

CREATE POLICY "본인 포인트 내역 조회" ON point_logs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "본인 포인트 내역 삽입" ON point_logs
  FOR INSERT WITH CHECK (auth.uid() = user_id);
