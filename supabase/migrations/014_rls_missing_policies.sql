-- Add missing UPDATE / DELETE RLS policies for posts, comments, and reviews.
-- Without these, authenticated users could directly modify or delete any row
-- by calling the REST API (bypassing app-level guards).

-- posts
CREATE POLICY "본인 게시글 수정" ON posts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "본인 게시글 삭제" ON posts FOR DELETE USING (auth.uid() = user_id);

-- comments
CREATE POLICY "본인 댓글 수정" ON comments FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "본인 댓글 삭제" ON comments FOR DELETE USING (auth.uid() = user_id);

-- reviews
CREATE POLICY "본인 리뷰 수정" ON reviews FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "본인 리뷰 삭제" ON reviews FOR DELETE USING (auth.uid() = user_id);
