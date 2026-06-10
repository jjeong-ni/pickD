-- ================================================================
-- 022_referral_rpc.sql
-- 친구 초대 레퍼럴 처리 SECURITY DEFINER RPC
-- add_points는 auth.uid() 체크가 있어 타인에게 지급 불가 →
-- 이 함수는 SECURITY DEFINER로 RLS를 우회해 양쪽에 지급
-- ================================================================

CREATE OR REPLACE FUNCTION process_referral(
  p_new_user_id UUID,
  p_ref_code    TEXT
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_referrer_id UUID;
BEGIN
  -- 호출자 본인 확인
  IF auth.uid() != p_new_user_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'unauthorized');
  END IF;

  -- 중복 수신 방지
  IF EXISTS (
    SELECT 1 FROM point_logs
    WHERE user_id = p_new_user_id AND reason = '친구 초대 수신'
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'already_used');
  END IF;

  -- ref_code 앞 8자리로 초대자 탐색
  SELECT user_id INTO v_referrer_id
  FROM profiles
  WHERE user_id::text LIKE p_ref_code || '%'
    AND user_id != p_new_user_id
  LIMIT 1;

  IF v_referrer_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'referrer_not_found');
  END IF;

  -- 신규 가입자 +500pt
  INSERT INTO point_logs (user_id, amount, reason) VALUES (p_new_user_id, 500, '친구 초대 수신');
  UPDATE profiles SET points = points + 500 WHERE user_id = p_new_user_id;

  -- 초대자 +500pt
  INSERT INTO point_logs (user_id, amount, reason) VALUES (v_referrer_id, 500, '친구 초대 발신');
  UPDATE profiles SET points = points + 500 WHERE user_id = v_referrer_id;

  RETURN jsonb_build_object('success', true, 'referrer_id', v_referrer_id::text);
END;
$$;

REVOKE ALL ON FUNCTION process_referral(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION process_referral(UUID, TEXT) TO authenticated;
