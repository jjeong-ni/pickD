-- Atomic point deduction RPC to prevent race conditions.
-- Acquires a row-level lock on profiles before deducting, ensuring
-- concurrent requests cannot overdraw the balance.

CREATE OR REPLACE FUNCTION deduct_points(
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
  -- Caller must be the owner of the points
  IF auth.uid() != p_user_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'unauthorized');
  END IF;

  -- Lock the row so concurrent calls queue up rather than reading stale balance
  SELECT points INTO v_current_points
  FROM profiles
  WHERE user_id = p_user_id
  FOR UPDATE;

  IF v_current_points IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'profile_not_found');
  END IF;

  IF v_current_points < p_amount THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'insufficient_points',
      'current_points', v_current_points
    );
  END IF;

  UPDATE profiles
  SET points = points - p_amount
  WHERE user_id = p_user_id;

  INSERT INTO point_logs (user_id, amount, reason)
  VALUES (p_user_id, -p_amount, p_reason);

  RETURN jsonb_build_object('success', true, 'new_points', v_current_points - p_amount);
END;
$$;

-- Only authenticated users can call this function
REVOKE ALL ON FUNCTION deduct_points(UUID, INTEGER, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION deduct_points(UUID, INTEGER, TEXT) TO authenticated;
