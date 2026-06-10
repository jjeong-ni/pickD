-- ================================================================
-- 021_seed_reviews.sql  (2026-06-10)
-- 시술·기기 샘플 리뷰 데이터 (Before/After 이미지 포함)
--
-- DO 블록: profiles에 있는 첫 번째 실제 유저 ID를 사용
-- (가짜 UUID → FK 위반 방지)
-- ================================================================

DO $$
DECLARE
  v_uid UUID;
BEGIN
  -- 1) auth.users에 있는 첫 번째 실제 유저 사용
  SELECT au.id INTO v_uid
  FROM auth.users au
  INNER JOIN profiles p ON p.user_id = au.id
  ORDER BY au.created_at
  LIMIT 1;

  -- 2) profiles.user_id로도 시도 (auth.users 접근 불가 환경 대비)
  IF v_uid IS NULL THEN
    SELECT user_id INTO v_uid FROM profiles ORDER BY created_at LIMIT 1;
  END IF;

  IF v_uid IS NULL THEN
    RAISE NOTICE '유효한 가입 유저가 없어 시드 리뷰를 건너뜁니다. 가입 후 다시 실행하세요.';
    RETURN;
  END IF;

  RAISE NOTICE '시드 리뷰 삽입 시도 (user_id: %)', v_uid;

  -- 3) FK 오류 등 어떤 오류든 시드 데이터는 gracefully skip
  BEGIN

  INSERT INTO reviews (user_id, item_id, item_type, rating, body, image_url, created_at) VALUES

  -- 써마지 FLX
  (v_uid, 'ccbbbbbb-0000-0000-0000-000000000001', 'treatment', 5,
   '써마지 FLX 받고 정말 만족해요. 시술 후 3개월 지나니까 피부가 확실히 탄탄해진 느낌이에요. 볼살이 위로 올라오고 팔자주름도 많이 옅어졌어요. 다운타임 없이 바로 일상 복귀할 수 있었던 게 제일 좋았어요.',
   'https://picsum.photos/seed/review_thermage_after1/400/300', NOW() - INTERVAL '10 days'),

  (v_uid, 'ccbbbbbb-0000-0000-0000-000000000001', 'treatment', 4,
   '써마지 처음 받아봤는데 생각보다 아프지 않았어요. 시술 중에 시원하고 따뜻한 느낌이 번갈아 가면서 나서 참을 만했어요. 효과는 아직 1개월이라 기대 중이에요!',
   'https://picsum.photos/seed/review_thermage_after2/400/300', NOW() - INTERVAL '5 days'),

  -- 울쎄라
  (v_uid, 'ccbbbbbb-0000-0000-0000-000000000007', 'treatment', 5,
   '울쎄라 2번째 시술이에요. 1회 때 효과가 너무 좋아서 1년 후 다시 받으러 왔어요. 얼굴형이 확실히 달라 보인다고 주변에서 뭐 했냐고 물어봐요. 통증이 강하지만 그만한 효과가 있어요.',
   'https://picsum.photos/seed/review_ulthera_after/400/300', NOW() - INTERVAL '7 days'),

  (v_uid, 'ccbbbbbb-0000-0000-0000-000000000007', 'treatment', 4,
   '울쎄라 받고 한 달이 지났어요. 초반에 저림 증상이 약간 있었지만 금방 사라졌어요. 확실히 턱선이 올라오는 느낌이고 브이라인이 살아났어요.',
   'https://picsum.photos/seed/review_ulthera_after2/400/300', NOW() - INTERVAL '3 days'),

  -- 보톡스 (교근)
  (v_uid, 'ccbbbbbb-0000-0000-0000-000000000008', 'treatment', 5,
   '교근 보톡스 맞은 지 4주 됐는데 진짜 효과 실화예요. 하안면이 확연히 갸름해지고 얼굴이 작아 보여요. 가격 대비 효과 최고입니다.',
   'https://picsum.photos/seed/review_botox_jaw/400/300', NOW() - INTERVAL '14 days'),

  -- 이마 보톡스
  (v_uid, 'ccbbbbbb-0000-0000-0000-000000000009', 'treatment', 4,
   '미간 주름 때문에 받았는데 확실히 펴졌어요. 표정이 훨씬 부드러워 보인다고 해요. 3~4개월에 한 번씩 받을 것 같아요.',
   'https://picsum.photos/seed/review_botox_forehead/400/300', NOW() - INTERVAL '8 days'),

  -- 리쥬란 힐러
  (v_uid, 'ccbbbbbb-0000-0000-0000-000000000013', 'treatment', 5,
   '리쥬란 힐러 4회 코스 완료했어요. 피부 결이 굉장히 고와지고 화장이 잘 먹어요. 모공도 작아지고 피부가 쫀쫀해진 느낌. 가격이 조금 있지만 확실히 투자 가치 있어요.',
   'https://picsum.photos/seed/review_rejuran_after/400/300', NOW() - INTERVAL '20 days'),

  -- 피코레이저
  (v_uid, 'ccbbbbbb-0000-0000-0000-000000000024', 'treatment', 5,
   '기미 치료 목적으로 피코레이저 5회 받았어요. 확실히 기미가 많이 옅어졌고 피부톤이 균일해졌어요. 아직 2번 더 받을 예정인데 기대가 돼요!',
   'https://picsum.photos/seed/review_pico_after/400/300', NOW() - INTERVAL '12 days'),

  -- 아쿠아필
  (v_uid, 'ccbbbbbb-0000-0000-0000-000000000022', 'treatment', 4,
   '점심 시간에 잠깐 받고 왔어요. 시술 후 피부가 환해지고 모공이 깨끗해진 느낌이에요. 다운타임 없이 바로 복귀할 수 있어서 직장인에게 완벽해요.',
   'https://picsum.photos/seed/review_aquapeel_after/400/300', NOW() - INTERVAL '4 days'),

  -- 포텐자 레이저
  (v_uid, 'ccbbbbbb-0000-0000-0000-000000000004', 'treatment', 5,
   '모공 때문에 고민이 많았는데 포텐자 3회 받고 진짜 달라졌어요. 특히 코 주변 모공이 눈에 띄게 줄었고 피부결이 매끄러워졌어요. 추천합니다!',
   'https://picsum.photos/seed/review_potenza_after/400/300', NOW() - INTERVAL '6 days'),

  -- 실리프팅
  (v_uid, 'ccbbbbbb-0000-0000-0000-000000000015', 'treatment', 4,
   '40대에 실리프팅 처음 받았는데 이걸 왜 이제 알았을까 싶어요. 시술 직후에는 붓기가 좀 있었지만 2주 지나니까 확실히 리프팅되면서 자연스러운 결과가 나왔어요.',
   'https://picsum.photos/seed/review_thread_after/400/300', NOW() - INTERVAL '18 days'),

  -- IPL 광치료
  (v_uid, 'ccbbbbbb-0000-0000-0000-000000000027', 'treatment', 4,
   '홍조 + 기미 둘 다 있어서 IPL 받기 시작했어요. 4회 후 확실히 홍조가 많이 가라앉았고 기미도 옅어지는 중이에요. 통증은 찰깍찰깍 따끔한 정도예요.',
   'https://picsum.photos/seed/review_ipl_after/400/300', NOW() - INTERVAL '9 days'),

  -- 볼·턱 필러
  (v_uid, 'ccbbbbbb-0000-0000-0000-000000000029', 'treatment', 5,
   '팔자주름 때문에 필러 받았어요. 시술 직후에는 약간 붉었지만 다음날 바로 자연스러워졌어요. 법령선이 확실히 채워지고 어려 보인다는 말 들어요.',
   'https://picsum.photos/seed/review_filler_after/400/300', NOW() - INTERVAL '11 days'),

  -- 스킨부스터
  (v_uid, 'ccbbbbbb-0000-0000-0000-000000000012', 'treatment', 5,
   '물광주사 2회 받고 피부에 윤기가 생겼어요. 화장이 잘 먹고 피부가 속부터 촉촉해진 느낌이에요. 다운타임이 거의 없어서 바로 화장 가능했어요.',
   'https://picsum.photos/seed/review_booster_after/400/300', NOW() - INTERVAL '15 days'),

  -- 프락셀
  (v_uid, 'ccbbbbbb-0000-0000-0000-000000000023', 'treatment', 4,
   '여드름 흉터 때문에 프락셀 2회 받았어요. 1회 후 딱지가 약간 생겼지만 1주일 안에 다 떨어졌고 피부결이 눈에 띄게 좋아졌어요. 3회 후 더 기대돼요.',
   'https://picsum.photos/seed/review_fraxel_after/400/300', NOW() - INTERVAL '22 days'),

  -- 메디큐브 AGE-R 울트라 튠
  (v_uid, 'ddbbbbbb-0000-0000-0000-000000000001', 'device', 5,
   '메디큐브 써마지 주파수 기기 사용 3개월 됐어요. 주 3회 꾸준히 사용하니까 볼살이 확실히 올라오고 탄력이 생겼어요. 홈케어 기기 중에 효과 제일 좋은 것 같아요.',
   'https://picsum.photos/seed/review_medicube_rf/400/300', NOW() - INTERVAL '8 days'),

  (v_uid, 'ddbbbbbb-0000-0000-0000-000000000001', 'device', 4,
   '친구 추천으로 샀는데 진짜 좋아요. 처음에는 뭔가 효과가 있나 싶었는데 2개월부터 피부 탄력이 달라진 걸 느꼈어요. 가격이 있지만 투자할 만해요.',
   'https://picsum.photos/seed/review_medicube_rf2/400/300', NOW() - INTERVAL '3 days'),

  -- LG 프라엘 인텐시브 EMS
  (v_uid, 'ddbbbbbb-0000-0000-0000-000000000002', 'device', 5,
   'LG 프라엘 EMS 6개월 사용 후기예요. 매일 10분씩 꾸준히 했더니 볼살이 위로 올라가고 얼굴선이 정리됐어요. 특히 교근 부분이 이완되면서 하안면이 갸름해진 것 같아요.',
   'https://picsum.photos/seed/review_praell_ems/400/300', NOW() - INTERVAL '14 days'),

  -- 듀얼소닉 맥시멈
  (v_uid, 'ddbbbbbb-0000-0000-0000-000000000008', 'device', 4,
   '집속 초음파 기기 처음 써봤어요. 처음에는 약간 따가운 느낌이 있었지만 적응되면서 편해졌어요. 4개월 사용하니 리프팅 효과가 확실히 느껴져요.',
   'https://picsum.photos/seed/review_dualsonic/400/300', NOW() - INTERVAL '6 days'),

  -- 메디큐브 AGE-R 부스터 프로
  (v_uid, 'ddbbbbbb-0000-0000-0000-000000000014', 'device', 5,
   '이온 도입 기기라 스킨케어 흡수율이 확실히 달라요. 같은 앰플인데 이 기기 사용하고부터 피부가 훨씬 촉촉해졌어요. 수분 측정기로 재보면 수치도 올라가 있어요.',
   'https://picsum.photos/seed/review_medicube_booster/400/300', NOW() - INTERVAL '10 days'),

  -- 파나소닉 이온에프티
  (v_uid, 'ddbbbbbb-0000-0000-0000-000000000016', 'device', 4,
   '클렌징 목적으로 구매했는데 대만족이에요. 모공이 확실히 깨끗해지고 스킨케어 흡수도 잘 되는 것 같아요. 사용 후 피부가 매끈매끈해요.',
   'https://picsum.photos/seed/review_panasonic_ion/400/300', NOW() - INTERVAL '7 days'),

  -- LED 마스크
  (v_uid, 'ddbbbbbb-0000-0000-0000-000000000020', 'device', 5,
   'LED 마스크 2개월 사용 중이에요. 여드름 트러블이 많이 줄었고 피부톤이 밝아졌어요. 매일 10~15분씩 쓰는데 점점 피부가 건강해지는 느낌이에요.',
   'https://picsum.photos/seed/review_led_mask/400/300', NOW() - INTERVAL '5 days'),

  -- 이노픽스 피부 분석기
  (v_uid, 'ddbbbbbb-0000-0000-0000-000000000025', 'device', 4,
   '피부 상태 추적하려고 구매했어요. 수분, 피지, 탄력 등 여러 지표를 집에서 바로 확인할 수 있어서 관리하기 편해요. 앱 연동도 잘 돼요.',
   'https://picsum.photos/seed/review_skin_analyzer/400/300', NOW() - INTERVAL '9 days'),

  -- 홈IPL 제모기
  (v_uid, 'ddbbbbbb-0000-0000-0000-000000000028', 'device', 5,
   '6개월 사용 후 확실히 털이 많이 줄었어요. 처음에는 좀 따가웠지만 에너지 낮은 레벨부터 시작해서 적응했어요. 피부과 제모보다 훨씬 저렴하고 집에서 편하게 할 수 있어서 좋아요.',
   'https://picsum.photos/seed/review_ipl_device/400/300', NOW() - INTERVAL '13 days'),

  -- LG 프라엘 토탈리프트업
  (v_uid, 'ddbbbbbb-0000-0000-0000-000000000013', 'device', 4,
   '30대 후반부터 리프팅 관리 시작했어요. 3개월 사용 후 볼살이 처지지 않고 탄력이 유지되는 느낌이에요. 앱으로 사용 이력 관리되는 것도 편해요.',
   'https://picsum.photos/seed/review_pra_lift/400/300', NOW() - INTERVAL '16 days'),

  -- 루킨스 고주파 하이푸
  (v_uid, 'ddbbbbbb-0000-0000-0000-000000000007', 'device', 5,
   'RF+HIFU 복합 기기인데 효과가 확실해요. 주 2~3회 꾸준히 했더니 턱선이 날카로워지고 피부가 탱탱해졌어요. 이 가격에 이 효과면 대박이에요.',
   'https://picsum.photos/seed/review_rookins_hifu/400/300', NOW() - INTERVAL '11 days'),

  -- 메디큐브 AGE-R 리프팅 EMS
  (v_uid, 'ddbbbbbb-0000-0000-0000-000000000003', 'device', 4,
   'EMS 기기로 매일 아침 5분씩 사용 중이에요. 얼굴 근육이 자극되는 느낌이 좋고 2개월 후부터 피부가 쫀쫀해졌어요. 눈가 리프팅에 특히 효과적인 것 같아요.',
   'https://picsum.photos/seed/review_medicube_ems/400/300', NOW() - INTERVAL '4 days'),

  -- 미리포레 진동 클렌저
  (v_uid, 'ddbbbbbb-0000-0000-0000-000000000023', 'device', 5,
   '세안 습관이 완전히 바뀌었어요. 이 클렌저 쓰고 나서 모공 속 노폐물이 확실히 더 잘 빠지고 피부가 깨끗해요. 스킨케어 흡수도 훨씬 잘 되는 것 같아요.',
   'https://picsum.photos/seed/review_cleanser_vibra/400/300', NOW() - INTERVAL '2 days'),

  -- 센텔리안24 이온도입기
  (v_uid, 'ddbbbbbb-0000-0000-0000-000000000015', 'device', 4,
   '건성 피부라 수분 관리에 신경 많이 쓰는데 이 기기 사용 후 피부가 훨씬 촉촉해졌어요. 앰플이 잘 흡수되는 느낌이고 다음날 아침에도 수분이 유지돼요.',
   'https://picsum.photos/seed/review_centellian_ion/400/300', NOW() - INTERVAL '19 days'),

  -- 달바 올쎄라 더블샷
  (v_uid, 'ddbbbbbb-0000-0000-0000-000000000011', 'device', 4,
   '코스메틱 브랜드 기기라 기대를 안 했는데 의외로 효과가 있어요. 전용 세럼이랑 같이 쓰면 흡수가 훨씬 잘 되는 것 같고 3개월 후 피부 탄력이 개선됐어요.',
   'https://picsum.photos/seed/review_dalba_hifu/400/300', NOW() - INTERVAL '17 days')

  ON CONFLICT DO NOTHING;

  RAISE NOTICE '시드 리뷰 삽입 완료 (user_id: %)', v_uid;

  EXCEPTION
    WHEN foreign_key_violation THEN
      RAISE NOTICE 'FK 위반 발생 (user_id: %) — 시드 리뷰를 건너뜁니다. reviews.user_id FK 설정을 확인하세요.', v_uid;
    WHEN OTHERS THEN
      RAISE NOTICE '시드 리뷰 오류 발생 (user_id: %, 오류: %) — 건너뜁니다.', v_uid, SQLERRM;
  END;
END;
$$;
