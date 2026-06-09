-- Atomic point-earning RPC used by missions.
-- Uses FOR UPDATE lock to prevent concurrent duplicate awards.

CREATE OR REPLACE FUNCTION add_points(
  p_user_id UUID,
  p_amount  INTEGER,
  p_reason  TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_points INTEGER;
BEGIN
  IF auth.uid() != p_user_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'unauthorized');
  END IF;

  SELECT points INTO v_current_points
  FROM profiles
  WHERE user_id = p_user_id
  FOR UPDATE;

  IF v_current_points IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'profile_not_found');
  END IF;

  INSERT INTO point_logs (user_id, amount, reason)
  VALUES (p_user_id, p_amount, p_reason);

  UPDATE profiles
  SET points = points + p_amount
  WHERE user_id = p_user_id;

  RETURN jsonb_build_object('success', true, 'new_points', v_current_points + p_amount);
END;
$$;

REVOKE ALL ON FUNCTION add_points(UUID, INTEGER, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION add_points(UUID, INTEGER, TEXT) TO authenticated;
