-- ================================================================
-- 024_add_website_url_and_new_products.sql  (2026-06-10)
-- website_url 컬럼 추가 + 마스터 v2 기준 누락 제품 INSERT
-- ================================================================

-- ── 컬럼 추가 ────────────────────────────────────────────────────
ALTER TABLE treatments ADD COLUMN IF NOT EXISTS website_url text;
ALTER TABLE devices    ADD COLUMN IF NOT EXISTS website_url text;


-- ================================================================
-- §1  기존 시술 website_url 업데이트
-- ================================================================

UPDATE treatments SET website_url = 'https://www.thermage.com'      WHERE id = 'ccbbbbbb-0000-0000-0000-000000000001';
UPDATE treatments SET website_url = 'https://www.wtlaser.com'        WHERE id = 'ccbbbbbb-0000-0000-0000-000000000002';
-- 텐써마: 제조사 확인 필요 (NULL)
UPDATE treatments SET website_url = 'https://cynosurelutronic.com'   WHERE id = 'ccbbbbbb-0000-0000-0000-000000000004';
UPDATE treatments SET website_url = 'https://classys.com'            WHERE id = 'ccbbbbbb-0000-0000-0000-000000000005';
UPDATE treatments SET website_url = 'https://hironic.com'            WHERE id = 'ccbbbbbb-0000-0000-0000-000000000006';
UPDATE treatments SET website_url = 'https://ultherapy.com'          WHERE id = 'ccbbbbbb-0000-0000-0000-000000000007';
UPDATE treatments SET website_url = 'https://classys.com'            WHERE id = 'ccbbbbbb-0000-0000-0000-000000000008';
UPDATE treatments SET website_url = 'https://www.jeisys.com'         WHERE id = 'ccbbbbbb-0000-0000-0000-000000000009';
UPDATE treatments SET website_url = 'https://alma-lasers.com'        WHERE id = 'ccbbbbbb-0000-0000-0000-000000000010';
UPDATE treatments SET website_url = 'https://inmodemd.com'           WHERE id = 'ccbbbbbb-0000-0000-0000-000000000011';
UPDATE treatments SET website_url = 'https://wellcomet.de'           WHERE id = 'ccbbbbbb-0000-0000-0000-000000000012';
UPDATE treatments SET website_url = 'https://www.pharmaresearch.com' WHERE id = 'ccbbbbbb-0000-0000-0000-000000000013';
UPDATE treatments SET website_url = 'https://vaimglobal.com'         WHERE id = 'ccbbbbbb-0000-0000-0000-000000000014';
-- 엑소좀: 병원별 상이 (NULL)
UPDATE treatments SET website_url = 'https://www.mirajet.com'        WHERE id = 'ccbbbbbb-0000-0000-0000-000000000017';
-- 물광주사: 병원별 상이 (NULL)
UPDATE treatments SET website_url = 'https://lumenis.com'            WHERE id = 'ccbbbbbb-0000-0000-0000-000000000027';
UPDATE treatments SET website_url = 'https://cynosurelutronic.com'   WHERE id = 'ccbbbbbb-0000-0000-0000-000000000028';


-- ================================================================
-- §2  기존 기기 website_url 업데이트
-- ================================================================

UPDATE devices SET website_url = 'https://medicube.us'         WHERE id = 'ddbbbbbb-0000-0000-0000-000000000001';
UPDATE devices SET website_url = 'https://silkn.com'           WHERE id = 'ddbbbbbb-0000-0000-0000-000000000002';
UPDATE devices SET website_url = 'https://www.ya-man.com'      WHERE id = 'ddbbbbbb-0000-0000-0000-000000000003';
UPDATE devices SET website_url = 'https://dualsonic.com'       WHERE id = 'ddbbbbbb-0000-0000-0000-000000000008';
UPDATE devices SET website_url = 'https://www.lge.co.kr'       WHERE id = 'ddbbbbbb-0000-0000-0000-000000000013';
UPDATE devices SET website_url = 'https://medicube.us'         WHERE id = 'ddbbbbbb-0000-0000-0000-000000000014';
UPDATE devices SET website_url = 'https://www.dkshop.co.kr'    WHERE id = 'ddbbbbbb-0000-0000-0000-000000000015';
UPDATE devices SET website_url = 'https://www.dkshop.co.kr'    WHERE id = 'ddbbbbbb-0000-0000-0000-000000000016';
UPDATE devices SET website_url = 'https://vanav.co.kr'         WHERE id = 'ddbbbbbb-0000-0000-0000-000000000017';
UPDATE devices SET website_url = 'https://www.mynuface.com'    WHERE id = 'ddbbbbbb-0000-0000-0000-000000000020';
UPDATE devices SET website_url = 'https://medicube.us'         WHERE id = 'ddbbbbbb-0000-0000-0000-000000000022';
UPDATE devices SET website_url = 'https://cellreturn.com'      WHERE id = 'ddbbbbbb-0000-0000-0000-000000000029';
UPDATE devices SET website_url = 'https://www.philips.com'     WHERE id = 'ddbbbbbb-0000-0000-0000-000000000030';


-- ================================================================
-- §3  누락 시술 INSERT  (Sculptra)
-- ================================================================

INSERT INTO treatments (id, name, category, description, price_min, price_max, duration_min, duration_max, tags, rating, review_count, pain_level, downtime, sessions, side_effects, contraindications, image_url, website_url) VALUES

('ccbbbbbb-0000-0000-0000-000000000030',
 'Sculptra (스컬트라)', '스킨부스터',
 '갈더마(Galderma)의 PLLA(폴리-L-락트산) 기반 콜라겐 바이오스티뮬레이터입니다. 히알루론산 필러와 달리 즉각적인 볼륨 충전이 아닌, 생체 내에서 PLLA가 서서히 분해되며 콜라겐 생성을 장기적으로 자극하는 방식입니다. 첫 시술 후 수개월에 걸쳐 효과가 서서히 나타나며 2년 이상 지속되는 장기 효과가 특징입니다. 광대 함몰·볼 처짐·얼굴 전체 볼륨 저하 개선에 탁월하며, 자연스러운 볼륨 회복을 원하는 분께 적합합니다.',
 400000, 900000, 30, 50,
 ARRAY['PLLA','콜라겐','볼륨','바이오스티뮬레이터','갈더마','장기효과'],
 4.4, 100, '중간', '없음~2일', '2~3회 (6주 간격)', '일시적 멍·부종·결절', '임신·수유·자가면역질환',
 'https://picsum.photos/seed/t_sculptra/400/300',
 'https://www.sculptrausa.com')

ON CONFLICT (id) DO NOTHING;


-- ================================================================
-- §4  누락 기기 INSERT  (14개)
-- ================================================================

INSERT INTO devices (id, name, brand, category, description, price, tags, rating, review_count, usage_frequency, results_timeline, side_effects, contraindications, image_url, website_url) VALUES

-- ── RF 디바이스 ──────────────────────────────────────────────────

('ddbbbbbb-0000-0000-0000-000000000031',
 'NEWA RF+', 'EndyMed', '고주파 RF',
 '이스라엘 의료 기기 전문 기업 EndyMed의 3DEEP™ RF 기술을 가정용으로 최적화한 리프팅 기기입니다. 독자적인 3DEEP RF 기술이 피부 표면의 열 손상 없이 진피층에 균일한 에너지를 전달해 콜라겐 수축·재생을 촉진합니다. 의료 기기 등급의 RF를 홈케어에서 안전하게 사용할 수 있도록 설계되었으며, 얼굴·목 리프팅과 탄력 개선에 효과적입니다.',
 350000,
 ARRAY['RF','고주파','리프팅','탄력','콜라겐','EndyMed'],
 4.2, 100, '주 3~4회', '6~10주', '드물게 일시적 홍조·열감', '임신·금속 삽입물',
 'https://picsum.photos/seed/d_newa/400/300',
 'https://newabeauty.com'),

('ddbbbbbb-0000-0000-0000-000000000032',
 'TriPollar Stop VX2', 'Pollogen', '고주파 RF',
 '이스라엘 미용 의료 기기 브랜드 Pollogen의 가정용 RF 리프팅·바디 케어 기기입니다. 특허받은 TriPollar™ 3극성 RF 기술로 피부 진피층에 균일한 열 에너지를 전달해 콜라겐 재생을 촉진하고 주름·처짐을 개선합니다. 얼굴 탄력 개선뿐 아니라 목·데콜테 등 바디 라인 케어에도 사용 가능하며, 5단계 에너지 조절로 피부 상태에 맞춘 맞춤 케어가 가능합니다.',
 420000,
 ARRAY['RF','고주파','리프팅','탄력','주름','TriPollar'],
 4.3, 100, '주 3~4회', '6~10주', '드물게 일시적 홍조·열감', '임신·금속 삽입물',
 'https://picsum.photos/seed/d_tripollar/400/300',
 'https://tripollar.com'),

-- ── HIFU 디바이스 ─────────────────────────────────────────────────

('ddbbbbbb-0000-0000-0000-000000000033',
 'AGE-R High Focus Shot Plus', '메디큐브', '집속 초음파',
 '메디큐브의 가정용 집속 초음파(HIFU) 전문 리프팅 기기입니다. 의료 기기 수준의 집속 초음파 에너지를 피부 진피층·SMAS층에 전달해 콜라겐 수축과 재생을 유도하는 AGE-R 라인의 HIFU 특화 모델입니다. 3단계 에너지 조절이 가능하며 전용 젤과 함께 사용 시 효과가 극대화됩니다. 비침습적으로 피부과 시술에 준하는 리프팅 효과를 홈에서 경험할 수 있습니다.',
 480000,
 ARRAY['HIFU','초음파','리프팅','탄력','콜라겐','메디큐브'],
 4.4, 100, '주 2~3회', '8~12주', '드물게 일시적 열감', '임신·금속 삽입물',
 'https://picsum.photos/seed/d_medicube_hifu/400/300',
 'https://medicube.us'),

-- ── EMS·미세전류 디바이스 ─────────────────────────────────────────

('ddbbbbbb-0000-0000-0000-000000000034',
 'FOREO Bear 2', 'FOREO', 'EMS·미세전류',
 '스웨덴 프리미엄 뷰티 테크 브랜드 FOREO의 2세대 미세전류 페이스 리프팅 기기입니다. T-Sonic™ 진동과 마이크로커런트를 결합해 얼굴 근육을 자극하고 자연스러운 리프팅 효과를 제공합니다. 스마트 뮤지컬 마이크로커런트 기술을 적용해 피부 적응력을 높인 2세대 모델이며, 전용 FOREO 앱 연동으로 AI 맞춤 루틴이 제공됩니다. 실리콘 소재로 위생적이며 방수 설계로 세안 시 함께 사용 가능합니다.',
 280000,
 ARRAY['EMS','미세전류','리프팅','탄력','FOREO','앱연동'],
 4.3, 100, '매일', '4~8주', '드물게 일시적 근육 수축감', '심장박동기·임신',
 'https://picsum.photos/seed/d_foreo/400/300',
 'https://foreo.com'),

('ddbbbbbb-0000-0000-0000-000000000035',
 'ZIIP Halo', 'ZIIP Beauty', '나노커런트',
 '미국 하이엔드 뷰티 테크 브랜드 ZIIP Beauty의 나노커런트 스킨케어 기기입니다. 독자적인 나노커런트 기술로 세포 수준의 미세 전기 자극을 전달해 ATP 생성을 촉진하고 피부 활력·탄력·광채를 높입니다. 전용 ZIIP 앱과 연동해 얼굴 부위별 맞춤 전류 처방을 제공하며, 할리우드 셀러브리티 미용사들이 애용하는 프로급 홈케어 기기입니다. 24K 골드 플레이팅 헤드로 미끄럼 없이 부드럽게 사용 가능합니다.',
 580000,
 ARRAY['나노커런트','미세전류','탄력','광채','앱연동','ZIIP'],
 4.3, 100, '주 4~5회', '4~8주', '드물게 일시적 근육 수축감', '심장박동기·임신',
 'https://picsum.photos/seed/d_ziip/400/300',
 'https://ziipbeauty.com'),

('ddbbbbbb-0000-0000-0000-000000000036',
 'FaceGym Pro', 'FaceGym', 'EMS',
 '런던에서 시작된 프리미엄 뷰티 브랜드 FaceGym의 EMS 전문 리프팅 기기입니다. 고강도 EMS 파형으로 얼굴 40개 이상의 근육을 집중 단련해 자연스러운 리프팅·윤곽 개선 효과를 제공합니다. 전용 앱 연동 맞춤 운동 프로그램으로 체계적인 페이스 트레이닝이 가능하며, FaceGym 스튜디오의 전문 페이스 워크아웃 기술을 집에서 경험할 수 있습니다.',
 320000,
 ARRAY['EMS','리프팅','윤곽','근육단련','앱연동','FaceGym'],
 4.1, 100, '주 4~5회', '6~8주', '드물게 일시적 근육통', '심장박동기·임신',
 'https://picsum.photos/seed/d_facegym/400/300',
 'https://facegym.com'),

('ddbbbbbb-0000-0000-0000-000000000037',
 'Dr.Arrivo Zeus II', 'Artistic & Co.', '복합 RF·EMS',
 '일본 프리미엄 뷰티 테크 브랜드 Artistic & Co.의 복합 페이스 케어 기기입니다. RF·EMS·LED·초음파·이온 도입 5가지 기능을 하나의 기기에 담아 종합적인 피부 관리가 가능합니다. RF로 진피층을 자극해 콜라겐을 재생하고 EMS로 얼굴 근육을 단련하며 LED로 피부 재생을 돕는 시너지 효과가 특징입니다. 일본에서 높은 인기를 자랑하는 Dr.Arrivo 시리즈의 최신 플래그십 모델입니다.',
 850000,
 ARRAY['RF','EMS','LED','초음파','이온도입','복합기기'],
 4.5, 100, '주 3~4회', '4~8주', '드물게 일시적 홍조·근육 수축감', '임신·금속 삽입물·심장박동기',
 'https://picsum.photos/seed/d_arrivo/400/300',
 'https://artistic.co.jp'),

('ddbbbbbb-0000-0000-0000-000000000038',
 'YA-MAN Medi Lift Eye', 'YA-MAN', 'EMS',
 '일본 뷰티 테크 브랜드 야만의 눈가 전용 EMS 리프팅 기기입니다. 안경 형태의 착용형 디자인으로 눈 주변 근육에 EMS 미세전류를 균일하게 전달합니다. 눈꺼풀 처짐·눈가 잔주름·눈밑 부기를 집중 케어하며 착용 중 손을 자유롭게 사용할 수 있어 편리합니다. 5단계 강도 조절로 처음 사용하는 분도 단계별로 적응이 가능합니다.',
 230000,
 ARRAY['EMS','눈가','눈꺼풀','잔주름','리프팅','야만'],
 4.2, 100, '주 4~5회', '4~8주', '드물게 일시적 근육 수축감', '심장박동기·임신·눈 질환',
 'https://picsum.photos/seed/d_yaman_eye/400/300',
 'https://www.ya-man.com'),

-- ── LED 디바이스 ──────────────────────────────────────────────────

('ddbbbbbb-0000-0000-0000-000000000039',
 'CurrentBody LED Mask Series 2', 'CurrentBody', 'LED',
 '영국 프리미엄 홈케어 기기 브랜드 CurrentBody의 2세대 LED 페이스 마스크입니다. FDA 승인·CE 인증을 받은 의료기기 등급의 LED 마스크로 적색광(633nm)·근적외선(830nm)을 조사해 콜라겐 생성을 촉진하고 피부 탄력·주름·피부결을 개선합니다. 유연한 소재로 얼굴에 밀착되어 에너지 전달 효율이 높으며, 10분의 짧은 사용 시간이 특징입니다.',
 390000,
 ARRAY['LED','마스크','탄력','주름','재생','FDA승인'],
 4.4, 100, '주 4~5회', '8~12주', '드물게 일시적 열감', '광과민성·임신',
 'https://picsum.photos/seed/d_currentbody_led/400/300',
 'https://currentbody.com'),

('ddbbbbbb-0000-0000-0000-000000000040',
 'CurrentBody Neck & Déc Perfector', 'CurrentBody', 'LED',
 '영국 프리미엄 홈케어 기기 브랜드 CurrentBody의 목·데콜테 전용 LED 디바이스입니다. 목과 데콜테의 처짐·주름·거칠어진 피부결을 집중 케어하기 위해 특별히 설계된 제품으로, 적색광·근적외선 LED로 콜라겐 생성을 촉진합니다. 목선 부위에 최적화된 굴곡 형태로 에너지를 밀착 전달하며, 자주 노출되지만 관리가 소홀해지기 쉬운 목·데콜테 안티에이징에 효과적입니다.',
 310000,
 ARRAY['LED','목','데콜테','주름','탄력','안티에이징'],
 4.2, 100, '주 4~5회', '8~12주', '드물게 일시적 열감', '광과민성·임신',
 'https://picsum.photos/seed/d_currentbody_neck/400/300',
 'https://currentbody.com'),

('ddbbbbbb-0000-0000-0000-000000000041',
 'Omnilux Contour Face', 'Omnilux', 'LED',
 '미국 프리미엄 의료용 LED 브랜드 Omnilux의 가정용 LED 페이스 마스크입니다. 임상적으로 검증된 633nm 적색광·830nm 근적외선 LED로 피부 콜라겐 생성을 자극하고 탄력·주름·피부결을 개선합니다. 의료기기 등급의 높은 LED 밀도로 단시간에 효과적인 광선 치료가 가능하며, 유연한 실리콘 소재로 얼굴에 완벽하게 밀착됩니다. 미국 피부과 전문의들이 추천하는 제품입니다.',
 590000,
 ARRAY['LED','마스크','탄력','주름','피부결','의료기기'],
 4.5, 100, '주 4~5회', '8~12주', '드물게 일시적 열감', '광과민성·임신',
 'https://picsum.photos/seed/d_omnilux/400/300',
 'https://omniluxleds.com'),

-- ── 냉각·온열 디바이스 ────────────────────────────────────────────

('ddbbbbbb-0000-0000-0000-000000000042',
 'TheraFace Depuffing Wand', 'Therabody', '냉각·온열',
 '미국 프리미엄 리커버리 테크 브랜드 Therabody의 페이스 케어 전용 냉각·온열 기기입니다. 냉각 모드(-5°C)와 온열 모드(40°C)를 전환하며 얼굴 부기를 빠르게 가라앉히고 혈액 순환을 촉진합니다. 아침 붓기 해소·스킨케어 흡수 촉진·근육 이완에 활용하기 좋으며, 컴팩트한 디자인으로 출장·여행 시에도 간편하게 사용 가능합니다.',
 180000,
 ARRAY['냉각','온열','부기','혈액순환','흡수촉진','Therabody'],
 4.1, 100, '매일', '즉각 효과', '거의 없음', '로사시아·피부 극도 민감',
 'https://picsum.photos/seed/d_theraface/400/300',
 'https://www.therabody.com'),

-- ── 두피 케어 디바이스 ────────────────────────────────────────────

('ddbbbbbb-0000-0000-0000-000000000043',
 'HairMax LaserBand 82', 'HairMax', 'LLLT 두피',
 '미국 저출력 레이저(LLLT) 두피 케어 전문 브랜드 HairMax의 레이저밴드 기기입니다. FDA 승인을 받은 82개의 저출력 레이저 다이오드로 두피를 자극해 탈모를 억제하고 발모를 촉진합니다. 임상적으로 검증된 광생물조절(Photobiomodulation) 기술을 적용하며, 90초의 짧은 사용 시간으로 편리하게 두피 케어가 가능합니다. 밴드 형태로 착용이 간편합니다.',
 580000,
 ARRAY['LLLT','레이저','두피','탈모','발모','FDA승인'],
 4.3, 100, '주 3회 (격일)', '12~26주', '드물게 일시적 두피 자극', '광과민성·임신',
 'https://picsum.photos/seed/d_hairmax/400/300',
 'https://hairmax.com'),

('ddbbbbbb-0000-0000-0000-000000000044',
 'Cellreturn Hair Alpha-Ray', 'Cellreturn', 'LED 두피',
 '국내 1위 LED 마스크 브랜드 셀리턴의 두피 전용 LED 케어 기기입니다. 근적외선 LED로 두피와 모발 뿌리를 자극해 두피 혈액 순환을 개선하고 탈모를 예방하며 모발 성장을 촉진합니다. 의료기기 인증을 받은 안전한 LED 기술로 두피 건강 개선과 모발 활력 회복에 효과적입니다. 편안한 착용감의 헬멧 형태로 셀리턴 LED 기술력이 두피 케어에 집약된 제품입니다.',
 790000,
 ARRAY['LED','두피','탈모','모발','근적외선','의료기기'],
 4.4, 100, '주 4~5회', '8~16주', '드물게 일시적 두피 열감', '광과민성·임신',
 'https://picsum.photos/seed/d_cellreturn_hair/400/300',
 'https://cellreturn.com')

ON CONFLICT (id) DO NOTHING;


-- ================================================================
-- §5  신규 항목 리뷰 생성 (각 100개)
-- ================================================================

DO $$
DECLARE
  r           RECORD;
  i           INT;
  cur_count   INT;
  need_count  INT;
  reviewer_ids UUID[] := ARRAY[
    'bbaaaaaa-0000-0000-0000-000000000001','bbaaaaaa-0000-0000-0000-000000000002',
    'bbaaaaaa-0000-0000-0000-000000000003','bbaaaaaa-0000-0000-0000-000000000004',
    'bbaaaaaa-0000-0000-0000-000000000005','bbaaaaaa-0000-0000-0000-000000000006',
    'bbaaaaaa-0000-0000-0000-000000000007','bbaaaaaa-0000-0000-0000-000000000008',
    'bbaaaaaa-0000-0000-0000-000000000009','bbaaaaaa-0000-0000-0000-000000000010',
    'bbaaaaaa-0000-0000-0000-000000000011','bbaaaaaa-0000-0000-0000-000000000012',
    'bbaaaaaa-0000-0000-0000-000000000013','bbaaaaaa-0000-0000-0000-000000000014',
    'bbaaaaaa-0000-0000-0000-000000000015','bbaaaaaa-0000-0000-0000-000000000016',
    'bbaaaaaa-0000-0000-0000-000000000017','bbaaaaaa-0000-0000-0000-000000000018',
    'bbaaaaaa-0000-0000-0000-000000000019','bbaaaaaa-0000-0000-0000-000000000020'
  ];
  treatment_reviews TEXT[] := ARRAY[
    '시술 후 피부가 눈에 띄게 탄탄해졌어요. 결과에 매우 만족합니다.',
    '전문 의료진이 꼼꼼하게 설명해줘서 안심하고 받을 수 있었어요.',
    '처음 받아봤는데 생각보다 통증이 적고 효과가 빠르네요.',
    '몇 회 받았더니 피부 톤이 훨씬 밝아지고 탄력도 좋아졌어요.',
    '의원 분위기도 깔끔하고 직원분들도 친절해서 좋았어요.',
    '처진 볼이 확실히 올라간 느낌이에요. 지인에게 추천했어요.',
    '피부과 선생님이 피부 상태에 맞게 맞춤 시술해줘서 좋았습니다.',
    '시술 후 일주일 지나니까 효과가 더 선명하게 보여요.',
    '반복 시술 중인데 매번 결과가 좋아서 계속 다니게 되네요.',
    '피부가 훨씬 광택있고 촉촉해진 느낌이에요. 재방문 의사 있어요.'
  ];
  device_reviews TEXT[] := ARRAY[
    '집에서 편하게 사용할 수 있어서 좋아요. 피부가 서서히 개선되는 느낌이에요.',
    '처음엔 반신반의했는데 꾸준히 쓰니까 탄력이 생겼어요.',
    '사용법이 간단하고 휴대도 편리해요. 만족도 높습니다.',
    '가격 대비 효과가 좋아서 가성비 최고예요. 강력 추천합니다.',
    '피부과 시술 사이 홈케어로 사용하기 딱 좋아요.',
    '꾸준히 사용하면 피부 탄력이 확실히 달라져요.',
    '처음 한 달은 미미했는데 두 달 되니까 차이가 나요.',
    '제품 품질도 좋고 AS 서비스도 친절해서 만족합니다.',
    '3개월째 사용 중인데 피부가 많이 좋아졌어요. 추천합니다.',
    '선물로 받았는데 이제 없으면 아쉬울 것 같아요. 잘 쓰고 있습니다.'
  ];
  new_treatment_ids UUID[] := ARRAY[
    'ccbbbbbb-0000-0000-0000-000000000030'::UUID
  ];
  new_device_ids UUID[] := ARRAY[
    'ddbbbbbb-0000-0000-0000-000000000031'::UUID,
    'ddbbbbbb-0000-0000-0000-000000000032'::UUID,
    'ddbbbbbb-0000-0000-0000-000000000033'::UUID,
    'ddbbbbbb-0000-0000-0000-000000000034'::UUID,
    'ddbbbbbb-0000-0000-0000-000000000035'::UUID,
    'ddbbbbbb-0000-0000-0000-000000000036'::UUID,
    'ddbbbbbb-0000-0000-0000-000000000037'::UUID,
    'ddbbbbbb-0000-0000-0000-000000000038'::UUID,
    'ddbbbbbb-0000-0000-0000-000000000039'::UUID,
    'ddbbbbbb-0000-0000-0000-000000000040'::UUID,
    'ddbbbbbb-0000-0000-0000-000000000041'::UUID,
    'ddbbbbbb-0000-0000-0000-000000000042'::UUID,
    'ddbbbbbb-0000-0000-0000-000000000043'::UUID,
    'ddbbbbbb-0000-0000-0000-000000000044'::UUID
  ];
  base_rating NUMERIC;
  jitter_val  NUMERIC;
  review_body TEXT;
  item_id_val UUID;
BEGIN
  -- 신규 시술 리뷰
  FOREACH item_id_val IN ARRAY new_treatment_ids LOOP
    SELECT COUNT(*) INTO cur_count FROM reviews WHERE item_id = item_id_val;
    need_count := 100 - cur_count;
    FOR i IN 1..need_count LOOP
      base_rating := 4.4;
      jitter_val  := (random() * 2 - 1) * 0.5;
      base_rating := GREATEST(1, LEAST(5, ROUND((base_rating + jitter_val)::numeric, 1)));
      review_body := treatment_reviews[1 + MOD(i - 1, array_length(treatment_reviews, 1))];
      INSERT INTO reviews (id, user_id, item_id, item_type, rating, body, created_at)
      VALUES (
        gen_random_uuid(),
        reviewer_ids[1 + MOD(i - 1, array_length(reviewer_ids, 1))],
        item_id_val, 'treatment', base_rating, review_body,
        NOW() - (random() * INTERVAL '180 days')
      ) ON CONFLICT DO NOTHING;
    END LOOP;
  END LOOP;

  -- 신규 기기 리뷰
  FOREACH item_id_val IN ARRAY new_device_ids LOOP
    SELECT COUNT(*) INTO cur_count FROM reviews WHERE item_id = item_id_val;
    need_count := 100 - cur_count;
    FOR i IN 1..need_count LOOP
      base_rating := 4.3;
      jitter_val  := (random() * 2 - 1) * 0.5;
      base_rating := GREATEST(1, LEAST(5, ROUND((base_rating + jitter_val)::numeric, 1)));
      review_body := device_reviews[1 + MOD(i - 1, array_length(device_reviews, 1))];
      INSERT INTO reviews (id, user_id, item_id, item_type, rating, body, created_at)
      VALUES (
        gen_random_uuid(),
        reviewer_ids[1 + MOD(i - 1, array_length(reviewer_ids, 1))],
        item_id_val, 'device', base_rating, review_body,
        NOW() - (random() * INTERVAL '180 days')
      ) ON CONFLICT DO NOTHING;
    END LOOP;
  END LOOP;
END $$;
