CREATE TABLE IF NOT EXISTS quiz_votes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id uuid NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  option_index integer NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(post_id, user_id)
);
ALTER TABLE quiz_votes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read quiz_votes" ON quiz_votes FOR SELECT USING (true);
CREATE POLICY "Auth users can insert vote" ON quiz_votes FOR INSERT WITH CHECK (auth.uid() = user_id);
