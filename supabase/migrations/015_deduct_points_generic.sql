-- ================================================================
-- 015_deduct_points_generic.sql
-- 범용 포인트 차감 RPC (payment.tsx에서 호출)
-- FOR UPDATE로 행 잠금 → 동시 요청에서 이중 차감 방지
-- ================================================================

CREATE OR REPLACE FUNCTION deduct_points(p_user_id uuid, p_amount integer, p_reason text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_points integer;
BEGIN
  SELECT points INTO v_points
  FROM profiles
  WHERE user_id = p_user_id
  FOR UPDATE;

  IF v_points IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'profile_not_found');
  END IF;

  IF v_points < p_amount THEN
    RETURN jsonb_build_object('success', false, 'error', 'insufficient_points', 'current_points', v_points);
  END IF;

  UPDATE profiles SET points = points - p_amount WHERE user_id = p_user_id;

  INSERT INTO point_logs (user_id, amount, reason)
  VALUES (p_user_id, -p_amount, p_reason);

  RETURN jsonb_build_object('success', true, 'new_points', v_points - p_amount);
END;
$$;
