-- =============================================
-- 026_backfill_empty_nicknames.sql
-- 초기 테스트 계정 닉네임 비어 있음(null / '') 보정
--
-- 자동 프로필 트리거로 만들어진 초기 계정은 nickname 이 비어 있어
-- 리포트·커뮤니티에서 이름 자리가 비어 보였다.
-- 앱 쪽은 lib/displayName.ts 로 폴백을 넣었고, 이 파일은 데이터 자체를 채운다.
--
-- ⚠️ 아직 적용하지 않았다. 아래 "미리보기" SELECT 로 대상부터 확인할 것.
-- =============================================

-- 미리보기 (적용 전 확인용)
-- SELECT id, user_id, nickname, created_at
-- FROM profiles
-- WHERE nickname IS NULL OR btrim(nickname) = '';

-- 이메일 앞부분이 있으면 그걸, 없으면 '회원' + id 앞 6자리.
-- 닉네임 중복확인(signup.tsx)과 부딪히지 않도록 id 조각을 붙인다.
UPDATE profiles p
SET nickname = COALESCE(
  NULLIF(split_part(u.email, '@', 1), '') || '_' || substr(p.id::text, 1, 4),
  '회원' || substr(p.id::text, 1, 6)
)
FROM auth.users u
WHERE u.id = p.user_id
  AND (p.nickname IS NULL OR btrim(p.nickname) = '');

-- auth.users 와 연결이 끊긴 프로필이 있을 때 대비
UPDATE profiles
SET nickname = '회원' || substr(id::text, 1, 6)
WHERE nickname IS NULL OR btrim(nickname) = '';
