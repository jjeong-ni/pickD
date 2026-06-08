-- 포인트 증가 함수
create or replace function increment_points(user_id_param uuid, points_param integer)
returns void as $$
  update profiles set points = points + points_param where user_id = user_id_param;
$$ language sql;
