-- ================================================================
-- 014_deduct_points_rpc.sql
-- 포인트 차감 + 로그 삽입을 단일 트랜잭션으로 처리하는 RPC
-- 동시 요청에서도 이중 차감/이중 구매 방지
-- ================================================================

CREATE OR REPLACE FUNCTION deduct_points_for_report(p_user_id uuid, p_cost integer)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_points integer;
BEGIN
  -- 이미 구매한 기록 확인 (비용이 드는 잠금 전에 먼저 체크)
  IF EXISTS (
    SELECT 1 FROM point_logs
    WHERE user_id = p_user_id AND reason = '맞춤 피부 분석 보고서'
    LIMIT 1
  ) THEN
    RETURN jsonb_build_object('status', 'already_purchased');
  END IF;

  -- profiles row를 FOR UPDATE로 잠금 → 동시 요청 직렬화
  SELECT points INTO v_points
  FROM profiles
  WHERE user_id = p_user_id
  FOR UPDATE;

  IF v_points IS NULL THEN
    RETURN jsonb_build_object('status', 'profile_not_found');
  END IF;

  IF v_points < p_cost THEN
    RETURN jsonb_build_object('status', 'insufficient_points', 'current_points', v_points);
  END IF;

  -- 포인트 차감 + 로그 삽입 (같은 트랜잭션, 원자적)
  UPDATE profiles SET points = points - p_cost WHERE user_id = p_user_id;

  INSERT INTO point_logs (user_id, amount, reason)
  VALUES (p_user_id, -p_cost, '맞춤 피부 분석 보고서');

  RETURN jsonb_build_object('status', 'ok', 'new_points', v_points - p_cost);
END;
$$;
