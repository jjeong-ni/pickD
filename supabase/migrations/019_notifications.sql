-- 인앱 알림 테이블
CREATE TABLE IF NOT EXISTS notifications (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type        TEXT NOT NULL, -- 'comment' | 'review' | 'point' | 'event'
  title       TEXT NOT NULL,
  body        TEXT NOT NULL,
  link        TEXT,          -- 딥링크 (예: /post/uuid)
  is_read     BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own notifications"
  ON notifications FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can insert notifications"
  ON notifications FOR INSERT
  TO service_role
  WITH CHECK (true);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_notifications_user_read
  ON notifications (user_id, is_read, created_at DESC);

-- ─── DB 트리거: 게시물에 댓글이 달리면 작성자에게 알림 ───────────────────────
CREATE OR REPLACE FUNCTION notify_on_comment()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  post_author UUID;
  post_title  TEXT;
  commenter_nick TEXT;
BEGIN
  -- 게시물 작성자 조회
  SELECT user_id, title INTO post_author, post_title
  FROM posts WHERE id = NEW.post_id;

  -- 자기 자신의 댓글에는 알림 안 보냄
  IF post_author IS NULL OR post_author = NEW.user_id THEN
    RETURN NEW;
  END IF;

  -- 댓글 작성자 닉네임
  SELECT nickname INTO commenter_nick
  FROM profiles WHERE user_id = NEW.user_id;

  INSERT INTO notifications (user_id, type, title, body, link)
  VALUES (
    post_author,
    'comment',
    '💬 새 댓글이 달렸어요',
    (COALESCE(commenter_nick, '누군가') || '님이 "' || LEFT(COALESCE(post_title, '내 글'), 15) || '"에 댓글을 남겼어요'),
    '/post/' || NEW.post_id::TEXT
  );

  RETURN NEW;
END;
$$;

-- comments 테이블에 트리거 등록 (이미 있으면 교체)
DROP TRIGGER IF EXISTS trg_notify_comment ON comments;
CREATE TRIGGER trg_notify_comment
  AFTER INSERT ON comments
  FOR EACH ROW EXECUTE FUNCTION notify_on_comment();
