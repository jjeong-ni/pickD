-- ================================================================
-- 023_posts_images_diary.sql
-- 1) posts 테이블에 image_url + before_image_url 추가 (B/A 슬라이더)
-- 2) skin_diary 테이블 생성 (피부 일기)
-- 3) profiles에 routine JSONB 컬럼 추가
-- ================================================================

-- ── 1. 게시물 이미지 컬럼 ─────────────────────────────────────────
ALTER TABLE posts ADD COLUMN IF NOT EXISTS image_url       TEXT;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS before_image_url TEXT;

-- ── 2. 피부 일기 ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS skin_diary (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  diary_date   DATE NOT NULL DEFAULT CURRENT_DATE,
  moisture     SMALLINT CHECK (moisture BETWEEN 1 AND 5),
  oiliness     SMALLINT CHECK (oiliness BETWEEN 1 AND 5),
  trouble      SMALLINT CHECK (trouble BETWEEN 1 AND 5),
  sensitivity  SMALLINT CHECK (sensitivity BETWEEN 1 AND 5),
  notes        TEXT,
  photo_url    TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, diary_date)
);

ALTER TABLE skin_diary ENABLE ROW LEVEL SECURITY;

CREATE POLICY "본인 일기 조회" ON skin_diary FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "본인 일기 작성" ON skin_diary FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "본인 일기 수정" ON skin_diary FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "본인 일기 삭제" ON skin_diary FOR DELETE USING (auth.uid() = user_id);

-- ── 3. 루틴 저장 ──────────────────────────────────────────────────
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS routine JSONB;

-- ── 4. 파트너 클리닉 ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS partner_clinics (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name         TEXT NOT NULL,
  address      TEXT NOT NULL,
  district     TEXT NOT NULL,  -- 강남, 홍대, 분당 등
  phone        TEXT,
  specialties  TEXT[] DEFAULT '{}',
  discount     TEXT,           -- '첫 방문 20%' 같은 할인 문구
  coupon_code  TEXT,
  description  TEXT,
  map_url      TEXT,
  image_url    TEXT,
  is_active    BOOLEAN DEFAULT TRUE,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE partner_clinics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "누구나 클리닉 조회" ON partner_clinics FOR SELECT USING (TRUE);

-- 제휴 클리닉 시드 데이터
INSERT INTO partner_clinics (name, address, district, phone, specialties, discount, coupon_code, description, image_url) VALUES
('리더스피부과 강남점', '서울 강남구 강남대로 396', '강남', '02-514-0100',
 ARRAY['리프팅','보톡스','레이저'],
 '픽디 회원 첫 방문 20% 할인', 'PICKD20',
 '강남 대표 피부과. 울쎄라·써마지 전문. 상담 후 맞춤 시술을 제안해드립니다.',
 'https://picsum.photos/seed/clinic_leaders/400/200'),

('아름다운나라피부과 신촌점', '서울 서대문구 신촌로 83', '신촌',  '02-393-3100',
 ARRAY['스킨케어','레이저','필러'],
 '픽디 회원 15% 할인 + 무료 상담', 'PICKD15',
 '신촌·홍대 인근 대표 피부과. 레이저 토닝·피코레이저 전문.',
 'https://picsum.photos/seed/clinic_aruna/400/200'),

('바노바기성형외과 압구정', '서울 강남구 압구정로 161', '압구정', '02-514-0404',
 ARRAY['리프팅','필러','윤곽'],
 '픽디 회원 레이저 시술 10% 할인', 'PICKD10',
 '압구정 프리미엄 피부과. 안티에이징 전문 클리닉.',
 'https://picsum.photos/seed/clinic_banobagi/400/200'),

('청담 JK성형외과', '서울 강남구 청담동 84-10', '청담', '02-511-0101',
 ARRAY['보톡스','필러','리프팅'],
 '픽디 회원 첫 시술 10% 할인', 'PICKD10JK',
 '청담 프리미엄 클리닉. 자연스러운 시술 결과로 유명.',
 'https://picsum.photos/seed/clinic_jk/400/200'),

('원진피부과 홍대점', '서울 마포구 양화로 141', '홍대', '02-326-0100',
 ARRAY['여드름','스킨케어','모공'],
 '픽디 회원 트러블 케어 20% 할인', 'PICKD20WJ',
 '홍대 인근 피부과. 여드름·모공·트러블 케어 전문.',
 'https://picsum.photos/seed/clinic_wonjin/400/200'),

('분당 차움피부과', '경기 성남시 분당구 판교역로 235', '분당', '031-881-7700',
 ARRAY['리프팅','스킨케어','안티에이징'],
 '픽디 회원 15% 할인', 'PICKD15BD',
 '분당·판교 대표 피부과. 안티에이징·리프팅 전문.',
 'https://picsum.photos/seed/clinic_bundang/400/200'),

('목동 연세에스피부과', '서울 양천구 목동동로 233', '목동', '02-2646-7800',
 ARRAY['레이저','보톡스','피부관리'],
 '픽디 회원 레이저 토닝 10% 할인', 'PICKD10YS',
 '목동 대표 피부과. 레이저 치료·피부 관리 전문.',
 'https://picsum.photos/seed/clinic_mokdong/400/200'),

('인천 네모피부과', '인천 남동구 인하로 489', '인천', '032-421-7582',
 ARRAY['스킨케어','여드름','레이저'],
 '픽디 회원 20% 할인', 'PICKD20IC',
 '인천 대표 피부과. 청소년·성인 여드름 치료 전문.',
 'https://picsum.photos/seed/clinic_incheon/400/200')

ON CONFLICT DO NOTHING;
