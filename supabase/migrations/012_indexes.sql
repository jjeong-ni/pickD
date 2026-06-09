-- ================================================================
-- 012_indexes.sql
-- 30명 동시 접속 대비 — 주요 테이블 인덱스 추가
-- ================================================================

-- profiles
CREATE INDEX IF NOT EXISTS idx_profiles_user_id     ON profiles(user_id);

-- posts
CREATE INDEX IF NOT EXISTS idx_posts_user_id         ON posts(user_id);
CREATE INDEX IF NOT EXISTS idx_posts_created_at      ON posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_category        ON posts(category);

-- comments
CREATE INDEX IF NOT EXISTS idx_comments_post_id      ON comments(post_id);
CREATE INDEX IF NOT EXISTS idx_comments_created_at   ON comments(created_at);

-- reviews
CREATE INDEX IF NOT EXISTS idx_reviews_user_id       ON reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_reviews_item          ON reviews(item_id, item_type);
CREATE INDEX IF NOT EXISTS idx_reviews_created_at    ON reviews(created_at DESC);

-- compare_items
CREATE INDEX IF NOT EXISTS idx_compare_items_user_id ON compare_items(user_id);

-- favorites
CREATE INDEX IF NOT EXISTS idx_favorites_user_id     ON favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_favorites_item        ON favorites(item_id, item_type);

-- quiz_votes
CREATE INDEX IF NOT EXISTS idx_quiz_votes_post_id    ON quiz_votes(post_id);
CREATE INDEX IF NOT EXISTS idx_quiz_votes_user_id    ON quiz_votes(user_id);

-- point_logs
CREATE INDEX IF NOT EXISTS idx_point_logs_user_id    ON point_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_point_logs_reason     ON point_logs(user_id, reason);

-- payments
CREATE INDEX IF NOT EXISTS idx_payments_user_id      ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_created_at   ON payments(created_at DESC);

-- treatments / devices (검색·추천 필터용)
CREATE INDEX IF NOT EXISTS idx_treatments_category   ON treatments(category);
CREATE INDEX IF NOT EXISTS idx_treatments_rating     ON treatments(rating DESC);
CREATE INDEX IF NOT EXISTS idx_devices_category      ON devices(category);
CREATE INDEX IF NOT EXISTS idx_devices_rating        ON devices(rating DESC);
