-- 픽디 초기 스키마 (IF NOT EXISTS 버전)

create table if not exists profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null unique,
  nickname text not null,
  skin_type text,
  face_shape text,
  concerns text[] default '{}',
  age_group text,
  gender text,
  points integer default 0,
  skin_age integer,
  moisture_score integer,
  oil_score integer,
  created_at timestamptz default now()
);

create table if not exists treatments (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null,
  description text not null default '',
  price_min integer not null default 0,
  price_max integer not null default 0,
  duration_min integer not null default 0,
  duration_max integer not null default 0,
  tags text[] default '{}',
  image_url text,
  rating numeric(3,1) default 0,
  review_count integer default 0,
  created_at timestamptz default now()
);

create table if not exists devices (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  brand text not null,
  category text not null,
  description text not null default '',
  price integer not null default 0,
  tags text[] default '{}',
  image_url text,
  rating numeric(3,1) default 0,
  review_count integer default 0,
  created_at timestamptz default now()
);

create table if not exists reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  item_id uuid not null,
  item_type text not null check (item_type in ('treatment', 'device')),
  rating integer not null check (rating between 1 and 5),
  body text not null,
  created_at timestamptz default now()
);

create table if not exists compare_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  item_id uuid not null,
  item_type text not null check (item_type in ('treatment', 'device')),
  created_at timestamptz default now(),
  unique(user_id, item_id)
);

create table if not exists posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  title text not null,
  body text not null,
  category text not null default '전체',
  likes integer default 0,
  comment_count integer default 0,
  created_at timestamptz default now()
);

create table if not exists comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid references posts(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  body text not null,
  created_at timestamptz default now()
);

create table if not exists payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  order_id text not null unique,
  order_name text not null,
  amount integer not null,
  status text not null default 'pending' check (status in ('pending', 'done', 'failed', 'canceled')),
  toss_payment_key text,
  created_at timestamptz default now()
);

-- RLS 활성화
alter table profiles enable row level security;
alter table treatments enable row level security;
alter table devices enable row level security;
alter table reviews enable row level security;
alter table compare_items enable row level security;
alter table posts enable row level security;
alter table comments enable row level security;
alter table payments enable row level security;

-- RLS 정책 (이미 존재하면 무시)
do $$ begin
  create policy "본인만 프로필 조회" on profiles for select using (auth.uid() = user_id);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "본인만 프로필 수정" on profiles for update using (auth.uid() = user_id);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "가입시 프로필 생성" on profiles for insert with check (auth.uid() = user_id);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "본인 비교함 조회" on compare_items for select using (auth.uid() = user_id);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "본인 비교함 추가" on compare_items for insert with check (auth.uid() = user_id);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "본인 비교함 삭제" on compare_items for delete using (auth.uid() = user_id);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "누구나 시술 조회" on treatments for select using (true);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "누구나 기기 조회" on devices for select using (true);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "누구나 리뷰 조회" on reviews for select using (true);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "본인 리뷰 작성" on reviews for insert with check (auth.uid() = user_id);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "누구나 게시글 조회" on posts for select using (true);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "본인 게시글 작성" on posts for insert with check (auth.uid() = user_id);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "누구나 댓글 조회" on comments for select using (true);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "본인 댓글 작성" on comments for insert with check (auth.uid() = user_id);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "본인 결제내역 조회" on payments for select using (auth.uid() = user_id);
exception when duplicate_object then null; end $$;

-- 포인트 증가 함수
create or replace function increment_points(user_id_param uuid, points_param integer)
returns void as $$
  update profiles set points = points + points_param where user_id = user_id_param;
$$ language sql;

-- 샘플 데이터 (없을 때만 삽입)
insert into treatments (name, category, description, price_min, price_max, duration_min, duration_max, tags, rating, review_count)
select * from (values
  ('울쎄라 리프팅', '리프팅', '초음파 에너지를 이용해 피부 깊은 층을 자극하여 탄력을 높이는 시술입니다.', 300000, 1500000, 40, 90, '{리프팅,탄력,비수술}'::text[], 4.5, 128),
  ('보톡스 (이마)', '보톡스', '보툴리눔 독소 주사로 이마 주름을 개선하는 시술입니다.', 50000, 200000, 10, 20, '{보톡스,주름,이마}'::text[], 4.7, 312),
  ('히알루론산 필러', '필러', '히알루론산을 이용해 볼륨을 채우거나 주름을 개선하는 시술입니다.', 150000, 500000, 20, 40, '{필러,볼륨,히알루론산}'::text[], 4.4, 245),
  ('레이저 토닝', '레이저', '피부 톤을 균일하게 개선하는 레이저 시술입니다.', 50000, 200000, 20, 30, '{레이저,색소,미백}'::text[], 4.3, 189),
  ('물광주사', '스킨케어', '히알루론산을 피부에 직접 주입하여 수분을 보충하는 시술입니다.', 100000, 300000, 30, 50, '{수분,광채,히알루론산}'::text[], 4.6, 201),
  ('더마 롤러 시술', '스킨케어', '미세 바늘로 피부에 자극을 주어 콜라겐 생성을 촉진하는 시술입니다.', 80000, 250000, 30, 60, '{모공,흉터,콜라겐}'::text[], 4.2, 96)
) as v(name, category, description, price_min, price_max, duration_min, duration_max, tags, rating, review_count)
where not exists (select 1 from treatments limit 1);

insert into devices (name, brand, category, description, price, tags, rating, review_count)
select * from (values
  ('슈링크 유니버스', 'Classys', '리프팅', '마이크로 포커스 초음파(MFU) 기술로 피부 처짐을 개선하는 프리미엄 리프팅 기기입니다.', 800000, '{리프팅,초음파,탄력}'::text[], 4.6, 158),
  ('인모드 (FX/RF)', 'InMode', 'RF', 'RF 에너지를 이용한 피부 타이트닝 기기입니다.', 600000, '{RF,타이트닝,리프팅}'::text[], 4.4, 87),
  ('LED 마스크 (프리미엄)', 'LG', 'LED', '적색광과 근적외선으로 피부 재생을 돕는 LED 마스크입니다.', 480000, '{LED,재생,홈케어}'::text[], 4.3, 234),
  ('제모 레이저 (다이오드)', 'Lumenis', '제모', '다이오드 레이저를 이용한 영구 제모 기기입니다.', 150000, '{제모,레이저,다이오드}'::text[], 4.5, 312),
  ('고주파 리프팅기', 'Thermage', '리프팅', '단극성 고주파(RF) 에너지로 피부 콜라겐을 자극하여 리프팅 효과를 주는 기기입니다.', 1200000, '{고주파,리프팅,콜라겐}'::text[], 4.7, 76)
) as v(name, brand, category, description, price, tags, rating, review_count)
where not exists (select 1 from devices limit 1);
