-- ================================================================
-- 013_fix_point_logs_fk.sql
-- point_logs.user_id FK 수정: profiles(id) → auth.users(id)
-- 멱등성 보장 (재실행 안전)
-- ================================================================

-- 기존 잘못된 FK 제거 (이름이 다를 수 있으므로 이름 없이 컬럼 기준 삭제)
DO $$
DECLARE
  constraint_name TEXT;
BEGIN
  SELECT tc.constraint_name INTO constraint_name
  FROM information_schema.table_constraints tc
  JOIN information_schema.key_column_usage kcu
    ON tc.constraint_name = kcu.constraint_name
  WHERE tc.table_name = 'point_logs'
    AND tc.constraint_type = 'FOREIGN KEY'
    AND kcu.column_name = 'user_id'
  LIMIT 1;

  IF constraint_name IS NOT NULL THEN
    EXECUTE 'ALTER TABLE point_logs DROP CONSTRAINT ' || quote_ident(constraint_name);
  END IF;
END;
$$;

-- 올바른 FK 추가
ALTER TABLE point_logs
  ADD CONSTRAINT point_logs_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- NOT NULL 보장
ALTER TABLE point_logs
  ALTER COLUMN user_id SET NOT NULL;
