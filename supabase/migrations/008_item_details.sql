-- ============================================================
-- Migration 008: 시술·기기 상세 정보 및 태그 업데이트
-- Supabase SQL Editor에서 실행하세요.
-- ============================================================

-- ── 시술 상세 정보 업데이트 ──────────────────────────────────────────────────────

UPDATE treatments SET pain_level='중간', downtime='1~3일', duration='1~2년', sessions='1~2회', side_effects='멍, 붓기 (일시적), 실 돌출 (드물게)', contraindications='임신, 수유, 피부 염증, 감염 부위' WHERE name='실리프팅';
UPDATE treatments SET pain_level='높음', downtime='1~3일', duration='6개월~1년', sessions='1~2회/년', side_effects='붓기, 멍, 신경 자극 (드물게)', contraindications='임신, 금속 임플란트, 심박조율기, 피부 염증' WHERE name='울쎄라';
UPDATE treatments SET pain_level='중간', downtime='없음', duration='6개월~2년', sessions='1회/년', side_effects='붓기, 홍조 (일시적)', contraindications='임신, 금속 임플란트, 심박조율기' WHERE name='써마지 FLX';
UPDATE treatments SET pain_level='낮음~중간', downtime='1~2일', duration='6~12개월', sessions='2~4회/년', side_effects='붓기, 붉어짐 (일시적)', contraindications='임신, 피부 염증, 금속 임플란트' WHERE name='슈링크 유니버스';
UPDATE treatments SET pain_level='중간~높음', downtime='3~5일', duration='6~12개월', sessions='1~3회', side_effects='붓기, 멍, 피부 열감', contraindications='임신, 금속 임플란트, 심박조율기' WHERE name='인모드 리프팅';
UPDATE treatments SET pain_level='낮음~중간', downtime='없음~1일', duration='6~12개월', sessions='2~4회/년', side_effects='붉어짐 (일시적)', contraindications='임신, 피부 염증, 금속 임플란트' WHERE name='올리지오';
UPDATE treatments SET pain_level='낮음', downtime='1~2일', duration='6~12개월', sessions='1~2회', side_effects='멍, 붓기 (약간)', contraindications='임신, 피부 염증, 감염 부위' WHERE name='실밥 리프팅';
UPDATE treatments SET pain_level='낮음', downtime='없음', duration='4~6개월', sessions='2~3회/년', side_effects='멍, 눈꺼풀 처짐 (드물게)', contraindications='임신, 수유, 신경근 질환, 근이완제 복용 중' WHERE name='이마 보톡스';
UPDATE treatments SET pain_level='낮음', downtime='없음', duration='6개월', sessions='2회/년', side_effects='초기 씹기 불편함 (일시적)', contraindications='임신, 수유, 신경근 질환' WHERE name='사각턱 보톡스';
UPDATE treatments SET pain_level='낮음', downtime='없음', duration='4~6개월', sessions='2~3회/년', side_effects='멍, 눈꺼풀 처짐 (드물게)', contraindications='임신, 수유, 눈 질환' WHERE name='눈가 보톡스';
UPDATE treatments SET pain_level='낮음~중간', downtime='1~3일', duration='12~18개월', sessions='1~2회/년', side_effects='붓기, 멍, 비대칭 (드물게)', contraindications='임신, 수유, 혈액응고 장애' WHERE name='볼·팔자 필러';
UPDATE treatments SET pain_level='낮음~중간', downtime='1~3일', duration='6~12개월', sessions='1~2회/년', side_effects='붓기, 멍, 혈관 압박 (드물게, 위험)', contraindications='임신, 수유, 혈액응고 장애' WHERE name='코 필러';
UPDATE treatments SET pain_level='낮음~중간', downtime='1~3일', duration='6~12개월', sessions='1~2회/년', side_effects='붓기, 멍, 비대칭', contraindications='임신, 수유, 입 주변 헤르페스 활성기' WHERE name='입술 필러';
UPDATE treatments SET pain_level='낮음', downtime='없음', duration='꾸준한 관리 필요', sessions='5~10회 / 1~2주 간격', side_effects='약간의 홍조 (일시적)', contraindications='임신, 일광화상, 활성 피부 염증' WHERE name='레이저 토닝';
UPDATE treatments SET pain_level='낮음~중간', downtime='1~3일 (가피)', duration='회수에 따라 다름', sessions='1~5회 / 4주 간격', side_effects='가피, 홍조, 과색소침착 (드물게)', contraindications='임신, 일광화상, 켈로이드 체질' WHERE name='피코레이저';
UPDATE treatments SET pain_level='낮음', downtime='없음~1일', duration='꾸준한 관리 권장', sessions='3~5회 / 3~4주 간격', side_effects='홍조, 갈색 반점 (일시적)', contraindications='임신, 일광화상, 태닝 직후' WHERE name='IPL 광치료';
UPDATE treatments SET pain_level='중간~높음', downtime='5~7일', duration='6~12개월 (흉터 영구)', sessions='1~3회', side_effects='붓기, 홍조, 가피', contraindications='임신, 일광화상, 켈로이드 체질, 피부 감염' WHERE name='프락셀 리페어';
UPDATE treatments SET pain_level='낮음~중간', downtime='없음~1일', duration='3~6개월', sessions='3~5회 / 4~6주 간격', side_effects='홍조, 경미한 부기', contraindications='임신, 일광화상, 활성 피부 염증' WHERE name='클라리티 레이저';
UPDATE treatments SET pain_level='없음', downtime='없음', duration='2~4주', sessions='매월 1~2회', side_effects='약간의 홍조 (드물게)', contraindications='활성 여드름, 피부 상처' WHERE name='아쿠아필';
UPDATE treatments SET pain_level='낮음~중간', downtime='1~3일', duration='3~6개월', sessions='3~4회 / 2~4주 간격', side_effects='멍, 붓기, 가려움 (일시적)', contraindications='임신, 수유, 연어 알레르기' WHERE name='리쥬란 힐러';
UPDATE treatments SET pain_level='낮음', downtime='없음~1일', duration='2~4주', sessions='4~8주 간격', side_effects='멍, 붓기 (경미, 일시적)', contraindications='임신, 수유, 히알루론산 알레르기' WHERE name='물광주사';
UPDATE treatments SET pain_level='낮음', downtime='없음~1일', duration='2~4개월', sessions='3~4개월 간격', side_effects='멍, 붓기 (경미)', contraindications='임신, 수유' WHERE name='스킨보톡스';
UPDATE treatments SET pain_level='없음', downtime='없음', duration='꾸준한 관리 필요', sessions='주 1회~격주 1회', side_effects='혈관 자극 (일부)', contraindications='임신, 수유, 신장 질환' WHERE name='미백주사';
UPDATE treatments SET pain_level='낮음~중간', downtime='1~2일', duration='6~12개월', sessions='3회 / 4~6주 간격', side_effects='붓기, 멍 (일시적)', contraindications='혈액응고 장애, 피부 감염' WHERE name='PRP 피부재생';
UPDATE treatments SET pain_level='낮음', downtime='없음~1일', duration='4~8주', sessions='6~10회 / 주 1~2회', side_effects='시술 중 이상한 느낌, 멍 (경미)', contraindications='임신, 심폐 질환, 피부 감염' WHERE name='카복시 테라피';

-- ── 시술 태그 업데이트 (피부고민 키워드 추가) ────────────────────────────────────

UPDATE treatments SET tags = ARRAY['리프팅','탄력','콜라겐','안티에이징','V라인','주름'] WHERE name='실리프팅';
UPDATE treatments SET tags = ARRAY['리프팅','초음파','HIFU','안티에이징','탄력','주름'] WHERE name='울쎄라';
UPDATE treatments SET tags = ARRAY['RF','리프팅','탄력','고주파','피부타이트닝','주름'] WHERE name='써마지 FLX';
UPDATE treatments SET tags = ARRAY['리프팅','초음파','모공','탄력','리주브'] WHERE name='슈링크 유니버스';
UPDATE treatments SET tags = ARRAY['RF','리프팅','지방감소','윤곽','마이크로니들','탄력'] WHERE name='인모드 리프팅';
UPDATE treatments SET tags = ARRAY['RF','리프팅','V라인','탄력','윤곽'] WHERE name='올리지오';
UPDATE treatments SET tags = ARRAY['리프팅','실','콜라겐','안티에이징','탄력'] WHERE name='실밥 리프팅';
UPDATE treatments SET tags = ARRAY['보톡스','주름','이마','표정근육','안티에이징'] WHERE name='이마 보톡스';
UPDATE treatments SET tags = ARRAY['보톡스','V라인','사각턱','교근','윤곽','리프팅'] WHERE name='사각턱 보톡스';
UPDATE treatments SET tags = ARRAY['보톡스','눈가','주름','까마귀발','눈매'] WHERE name='눈가 보톡스';
UPDATE treatments SET tags = ARRAY['필러','볼륨','팔자','히알루론산','주름','탄력'] WHERE name='볼·팔자 필러';
UPDATE treatments SET tags = ARRAY['필러','코','콧대','비수술','히알루론산'] WHERE name='코 필러';
UPDATE treatments SET tags = ARRAY['필러','입술','볼륨','히알루론산','립필러'] WHERE name='입술 필러';
UPDATE treatments SET tags = ARRAY['레이저','미백','기미','피부톤','색소침착','홍조'] WHERE name='레이저 토닝';
UPDATE treatments SET tags = ARRAY['레이저','피코','색소침착','기미','잡티'] WHERE name='피코레이저';
UPDATE treatments SET tags = ARRAY['IPL','광치료','색소침착','홍조','기미','혈관'] WHERE name='IPL 광치료';
UPDATE treatments SET tags = ARRAY['레이저','프락셀','흉터','모공','재생','주름','색소침착'] WHERE name='프락셀 리페어';
UPDATE treatments SET tags = ARRAY['레이저','모공','클라리티','피부결','색소침착'] WHERE name='클라리티 레이저';
UPDATE treatments SET tags = ARRAY['스킨케어','모공','각질','수분','영양공급','트러블'] WHERE name='아쿠아필';
UPDATE treatments SET tags = ARRAY['주사','리쥬란','재생','탄력','PDRN','수분','주름'] WHERE name='리쥬란 힐러';
UPDATE treatments SET tags = ARRAY['주사','히알루론산','수분','광채','탄력','보습'] WHERE name='물광주사';
UPDATE treatments SET tags = ARRAY['보톡스','모공','피지','탄력','피부결'] WHERE name='스킨보톡스';
UPDATE treatments SET tags = ARRAY['미백','글루타치온','비타민C','항산화','색소침착','피부톤'] WHERE name='미백주사';
UPDATE treatments SET tags = ARRAY['PRP','재생','혈소판','탄력','흉터','주름'] WHERE name='PRP 피부재생';
UPDATE treatments SET tags = ARRAY['카복시','CO2','다크서클','혈액순환','탄력'] WHERE name='카복시 테라피';

-- ── 기기 상세 정보 업데이트 ──────────────────────────────────────────────────────

UPDATE devices SET usage_frequency='주 5~7회, 1회 20분', results_timeline='4~8주', side_effects='없음 (정상 사용 시)', contraindications='임신, 광민감성 약물 복용 중' WHERE name='셀리턴 플래티넘 LED 마스크';
UPDATE devices SET usage_frequency='주 3~5회, 1회 10분', results_timeline='4~8주', side_effects='약간의 열감 (일시적)', contraindications='임신, 금속 임플란트, 심박조율기' WHERE name='LG 프라엘 토탈리프트업 케어';
UPDATE devices SET usage_frequency='주 5~7회, 1회 10분', results_timeline='4~8주', side_effects='없음 (정상 사용 시)', contraindications='임신, 광민감성 약물 복용 중' WHERE name='LG 프라엘 더마 LED 마스크';
UPDATE devices SET usage_frequency='주 3~5회, 1회 5분', results_timeline='2~4주', side_effects='없음', contraindications='피부 상처, 염증 부위' WHERE name='테라바디 테라페이스';
UPDATE devices SET usage_frequency='주 3~5회, 1회 10분', results_timeline='4~6주', side_effects='약간의 열감·따뜻함', contraindications='임신, 금속 임플란트, 심박조율기' WHERE name='메디큐브 AGE-R 부스터 프로';
UPDATE devices SET usage_frequency='주 5~7회, 1회 10~15분', results_timeline='4~8주', side_effects='없음', contraindications='임신, 광민감성 약물 복용 중' WHERE name='메이크온 스킨 라이트 테라피 3';
UPDATE devices SET usage_frequency='주 3~5회, 1회 5~10분', results_timeline='4~8주', side_effects='약간의 열감', contraindications='임신, 금속 임플란트' WHERE name='야만 포토플러스';
UPDATE devices SET usage_frequency='2주 간격 4~5회 후 월 1회 유지', results_timeline='4~5회 사용 후', side_effects='피부 자극, 홍조 (일시적)', contraindications='임신, 태닝 직후, 문신 부위, 어두운 피부톤' WHERE name='필립스 루미아 IPL';
UPDATE devices SET usage_frequency='2주 간격, 총 12주', results_timeline='12주', side_effects='피부 자극 (일시적)', contraindications='임신, 태닝 직후, 문신 부위, 어두운 피부톤' WHERE name='브라운 실크에스퍼트 IPL';
UPDATE devices SET usage_frequency='매일 아침저녁 1분씩', results_timeline='2~4주', side_effects='없음', contraindications='개방 상처 부위 제외' WHERE name='포레오 루나 4';
UPDATE devices SET usage_frequency='주 1~2회', results_timeline='2~4주', side_effects='피부 민감성 증가 (과사용 시)', contraindications='활성 여드름, 개방 상처' WHERE name='오아 퍼펙트 필링기';
UPDATE devices SET usage_frequency='주 3~5회, 1회 10분', results_timeline='4~8주', side_effects='약간의 열감', contraindications='임신, 금속 임플란트, 심박조율기' WHERE name='뉴젠아이스 RF 리프팅기';
UPDATE devices SET usage_frequency='주 3~5회, 1회 5~10분', results_timeline='4~6주', side_effects='피부 자극 (과사용 시)', contraindications='임신, 금속 임플란트, 심박조율기' WHERE name='드레날린 V라인 케어기';
UPDATE devices SET usage_frequency='매일 또는 주 3~5회, 1회 5분', results_timeline='2~4주', side_effects='없음', contraindications='임신, 금속 임플란트' WHERE name='히타치 하다크리에 이온부스터';
UPDATE devices SET usage_frequency='매일 5분, 초기 60일 필수', results_timeline='60일 꾸준히 후', side_effects='경미한 따가움 (일시적)', contraindications='임신, 금속 임플란트, 심박조율기' WHERE name='누페이스 미니';
UPDATE devices SET usage_frequency='매일 또는 주 3~5회, 1회 5분', results_timeline='2~4주', side_effects='없음', contraindications='임신, 금속 임플란트' WHERE name='파나소닉 이온 에펙타';
UPDATE devices SET usage_frequency='주 3~5회, 1회 10분', results_timeline='4~8주', side_effects='약간의 따뜻함', contraindications='임신, 금속 임플란트' WHERE name='어라운드미 초음파 피부관리기';
UPDATE devices SET usage_frequency='주 3~5회, 1회 20분', results_timeline='2~4주', side_effects='약간의 따뜻함', contraindications='광민감성 약물 복용 중' WHERE name='블루라이트 여드름 치료기';
UPDATE devices SET usage_frequency='주 1~2회', results_timeline='즉각적 모공 클렌징', side_effects='멍, 모세혈관 손상 (과사용 시)', contraindications='민감성·모세혈관 확장 피부' WHERE name='모공 진공흡입 클렌저';
UPDATE devices SET usage_frequency='매일 5분', results_timeline='4~8주', side_effects='없음', contraindications='두피 상처, 피부 질환' WHERE name='필립스 두피 케어 마사지기';
UPDATE devices SET usage_frequency='매일 3분', results_timeline='4~6주', side_effects='없음', contraindications='임신, 금속 임플란트, 눈 질환' WHERE name='파나소닉 메디리프트 아이';
UPDATE devices SET usage_frequency='주 5~7회, 1회 5~10분', results_timeline='1~2주', side_effects='없음', contraindications='없음 (피부 트러블 부위 주의)' WHERE name='파나소닉 나노케어 스팀기';
UPDATE devices SET usage_frequency='주 5~7회, 1회 15~20분', results_timeline='4~8주', side_effects='없음', contraindications='임신, 광민감성 약물 복용 중' WHERE name='아이오닉 LED 테라피 마스크';
UPDATE devices SET usage_frequency='매일 아침저녁 1분', results_timeline='2~4주', side_effects='없음', contraindications='없음 (개방 상처 제외)' WHERE name='포레오 LUNA 미니 3';
UPDATE devices SET usage_frequency='주 3~5회, 1회 5분', results_timeline='2~4주', side_effects='없음', contraindications='피부 상처, 염증 부위' WHERE name='롤링 마사지 리프터';

-- ── 기기 태그 업데이트 (피부고민 키워드 추가) ────────────────────────────────────

UPDATE devices SET tags = ARRAY['LED','탄력','주름','피부결','의료기기'] WHERE name='셀리턴 플래티넘 LED 마스크';
UPDATE devices SET tags = ARRAY['RF','리프팅','탄력','콜라겐','고주파'] WHERE name='LG 프라엘 토탈리프트업 케어';
UPDATE devices SET tags = ARRAY['LED','마스크','피부결','수분','탄력'] WHERE name='LG 프라엘 더마 LED 마스크';
UPDATE devices SET tags = ARRAY['진동마사지','혈액순환','림프','리프팅','열기능'] WHERE name='테라바디 테라페이스';
UPDATE devices SET tags = ARRAY['RF','EMS','리프팅','탄력','메디큐브'] WHERE name='메디큐브 AGE-R 부스터 프로';
UPDATE devices SET tags = ARRAY['LED','피부재생','탄력','피부결','마스크형'] WHERE name='메이크온 스킨 라이트 테라피 3';
UPDATE devices SET tags = ARRAY['RF','LED','초음파','이온','복합기기','탄력','수분'] WHERE name='야만 포토플러스';
UPDATE devices SET tags = ARRAY['IPL','제모','영구제모','피부관리','자동감지'] WHERE name='필립스 루미아 IPL';
UPDATE devices SET tags = ARRAY['IPL','제모','영구제모','브라운','스마트센서'] WHERE name='브라운 실크에스퍼트 IPL';
UPDATE devices SET tags = ARRAY['클렌저','진동','모공','포레오','스마트앱','트러블'] WHERE name='포레오 루나 4';
UPDATE devices SET tags = ARRAY['필링','각질','모공','피부결','클렌징'] WHERE name='오아 퍼펙트 필링기';
UPDATE devices SET tags = ARRAY['RF','리프팅','콜라겐','EMS','가정용','탄력'] WHERE name='뉴젠아이스 RF 리프팅기';
UPDATE devices SET tags = ARRAY['EMS','미세전류','리프팅','V라인','부종'] WHERE name='드레날린 V라인 케어기';
UPDATE devices SET tags = ARRAY['이온도입','갈바닉','흡수','LED','수분'] WHERE name='히타치 하다크리에 이온부스터';
UPDATE devices SET tags = ARRAY['미세전류','리프팅','FDA','누페이스','근육자극','탄력'] WHERE name='누페이스 미니';
UPDATE devices SET tags = ARRAY['이온도입','갈바닉','수분','파나소닉','방수'] WHERE name='파나소닉 이온 에펙타';
UPDATE devices SET tags = ARRAY['초음파','이온도입','EMS','마사지','수분'] WHERE name='어라운드미 초음파 피부관리기';
UPDATE devices SET tags = ARRAY['LED','블루라이트','여드름','트러블','살균','염증진정'] WHERE name='블루라이트 여드름 치료기';
UPDATE devices SET tags = ARRAY['진공흡입','모공','블랙헤드','클렌징','노폐물'] WHERE name='모공 진공흡입 클렌저';
UPDATE devices SET tags = ARRAY['두피마사지','탈모예방','혈액순환','두피케어','전동'] WHERE name='필립스 두피 케어 마사지기';
UPDATE devices SET tags = ARRAY['EMS','눈가','눈꺼풀','리프팅','주름'] WHERE name='파나소닉 메디리프트 아이';
UPDATE devices SET tags = ARRAY['스팀','수분','나노스팀','모공','파나소닉','보습'] WHERE name='파나소닉 나노케어 스팀기';
UPDATE devices SET tags = ARRAY['LED','마스크','7색광','여드름','트러블','미백','색소침착'] WHERE name='아이오닉 LED 테라피 마스크';
UPDATE devices SET tags = ARRAY['클렌저','진동','모공','휴대용','방수','트러블'] WHERE name='포레오 LUNA 미니 3';
UPDATE devices SET tags = ARRAY['롤링','림프','혈액순환','부기','마사지','탄력'] WHERE name='롤링 마사지 리프터';

-- 확인
SELECT name, usage_frequency, results_timeline FROM devices LIMIT 5;
SELECT name, pain_level, downtime FROM treatments LIMIT 5;
