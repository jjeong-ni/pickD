import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, Share, Platform, Image, ActivityIndicator,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../hooks/useAuth';
import { Colors, HEADER_TOP } from '../constants/colors';

// ─── 얼굴형별 핵심 데이터 ──────────────────────────────────────────────────────

const FACE_REPORT: Record<string, {
  emoji: string; subtitle: string; ratio: string;
  keyConcerns: string[];
  topTreatments: { rank: number; name: string; reason: string; cost: string; duration: string; downtime: string }[];
  topDevices: { name: string; schedule: string; focus: string }[];
  styling: { hair: string; makeup: string; avoid: string };
  ageAdvice: Record<string, string>;
}> = {
  계란형: {
    emoji: '🥚', subtitle: '황금 기준형 — 균형 비율 유지',
    ratio: '이마 : 광대 : 턱 = 중간 : 중간 : 갸름',
    keyConcerns: ['노화 예방이 핵심', '볼 처짐·팔자주름 예방', '볼륨 + 리프팅 동시 관리'],
    topTreatments: [
      { rank: 1, name: '울쎄라 리프팅', reason: '현상 유지 + 노화 예방 최적', cost: '30~60만원', duration: '12~18개월', downtime: '없음' },
      { rank: 2, name: '스킨부스터 (리쥬란)', reason: '수분 공급·재생 예방적 관리', cost: '10~20만원', duration: '6개월', downtime: '2~3일' },
      { rank: 3, name: '실리프팅', reason: '볼~턱선 타이트닝', cost: '50~80만원', duration: '6~12개월', downtime: '1~3일' },
    ],
    topDevices: [
      { name: '고주파 (RF)', schedule: '주 2~3회 / 15~20분', focus: '콜라겐 생성·탄력 유지' },
      { name: 'LED 적색광', schedule: '매일 / 10~15분', focus: '피부 재생·노화 예방' },
    ],
    styling: {
      hair: '거의 모든 스타일 소화 가능. 센터·사이드 파팅 모두 잘 어울림',
      makeup: '이마·코끝·턱에 하이라이터로 자연스러운 입체감 연출',
      avoid: '지나친 양쪽 볼륨 헤어 — 가로 비율 무너뜨릴 수 있어요',
    },
    ageAdvice: {
      '20대': '예방적 스킨케어 + 가벼운 레이저토닝. 지나친 리프팅은 불필요',
      '30대': '스킨부스터로 수분 관리. 처짐 징조 시 울쎄라 시작',
      '40대': '복합 리프팅 + 필러 볼륨 보충. 연간 2회 집중 관리 권장',
    },
  },
  둥근형: {
    emoji: '⭕', subtitle: '볼살·짧은 턱선 — 슬리밍 관리',
    ratio: '가로 : 세로 ≈ 1:1 · 턱선 둥글고 짧음',
    keyConcerns: ['세로 길이감 늘리기', '교근 볼륨 축소로 하안면 슬리밍', '리프팅 + 지방 분해 병행'],
    topTreatments: [
      { rank: 1, name: '교근 보톡스', reason: '하악각 슬리밍 — 즉각 효과', cost: '5~10만원', duration: '4~6개월', downtime: '없음' },
      { rank: 2, name: '턱 필러', reason: 'V라인 길이감·윤곽 개선', cost: '15~30만원', duration: '12~18개월', downtime: '1~2일' },
      { rank: 3, name: 'HIFU 리프팅', reason: '볼·턱선 타이트닝 동시 효과', cost: '20~50만원', duration: '6~12개월', downtime: '없음~1일' },
    ],
    topDevices: [
      { name: 'EMS 근육전기자극', schedule: '주 3~5회 / 10~15분', focus: '교근 이완·슬리밍 보조' },
      { name: '고주파 (RF)', schedule: '주 2~3회 / 15분', focus: '볼·턱선 타이트닝' },
    ],
    styling: {
      hair: '세로 볼륨 레이어드컷·긴 웨이브. 사이드 가르마 + 앞머리 이마 일부 커버',
      makeup: '관자놀이~볼 음영 컨투어링, 턱 아래 하이라이터',
      avoid: '짧은 단발·귀밑 단발 — 가로를 더 강조함',
    },
    ageAdvice: {
      '20대': '교근 보톡스 시작. 슬리밍 + 청결한 피부 관리 병행',
      '30대': '교근 보톡스 정기 + 턱 필러로 V라인 유지',
      '40대': '복합 리프팅 + 교근 지속 관리',
    },
  },
  사각형: {
    emoji: '⬜', subtitle: '강한 각진 턱선 — 부드러운 윤곽',
    ratio: '이마:광대:턱 너비 거의 일정 · 하악각 뚜렷',
    keyConcerns: ['교근 볼륨 축소로 하악각 완화', '볼~광대 리프팅으로 역삼각형 방향 교정', '이마 볼륨으로 상하 균형'],
    topTreatments: [
      { rank: 1, name: '교근 보톡스', reason: '각진 하악각 완화 — 가장 효과적', cost: '7~15만원', duration: '4~6개월', downtime: '없음' },
      { rank: 2, name: '실리프팅', reason: '볼~광대 리프팅으로 역삼각 개선', cost: '50~80만원', duration: '6~12개월', downtime: '1~3일' },
      { rank: 3, name: '이마 필러', reason: '위아래 비율 균형 조절', cost: '15~30만원', duration: '12~18개월', downtime: '1~2일' },
    ],
    topDevices: [
      { name: 'EMS (교근 집중)', schedule: '주 3회 / 10분 교근 부위', focus: '교근 이완·하악각 완화 보조' },
      { name: '고주파 (RF)', schedule: '주 2~3회 / 15분', focus: '볼·광대 리프팅' },
    ],
    styling: {
      hair: '위로 볼륨 + 옆 납작한 세로형 헤어. 사이드 레이어·롱헤어 추천',
      makeup: '하악각 쉐이딩 필수. 이마~코 하이라이터로 세로 강조',
      avoid: '이어컷·단발·볼륨 사이드 헤어 — 각도를 강조함',
    },
    ageAdvice: {
      '20대': '교근 보톡스 조기 시작. 하악각 확장 예방',
      '30대': '보톡스 + 볼 리프팅 병행. 윤곽 교정 본격화',
      '40대': '복합 시술: 교근+리프팅+볼륨 동시 관리',
    },
  },
  하트형: {
    emoji: '❤️', subtitle: '넓은 이마·갸름한 턱선 — 볼 볼륨 유지',
    ratio: '이마 > 광대 > 턱 · 역삼각형 실루엣',
    keyConcerns: ['볼 꺼짐 예방 — 볼 볼륨 유지가 핵심', '이마 과다 시술 금지', '볼 부위 리프팅 집중'],
    topTreatments: [
      { rank: 1, name: '볼 필러', reason: '꺼진 볼 보완 → 비율 균형', cost: '20~40만원', duration: '6~12개월', downtime: '2~3일' },
      { rank: 2, name: '울쎄라 리프팅 (볼 집중)', reason: '볼~턱 탄력 유지', cost: '30~60만원', duration: '12~18개월', downtime: '없음' },
      { rank: 3, name: '레이저토닝', reason: '모공·피부톤 복합 개선', cost: '5~15만원', duration: '지속 관리형', downtime: '없음' },
    ],
    topDevices: [
      { name: 'RF 고주파 (볼 집중)', schedule: '주 2~3회 / 볼 집중 15분', focus: '볼 탄력·콜라겐 유지' },
      { name: 'LED 적색광', schedule: '매일 / 10~15분', focus: '피부 재생·노화 예방' },
    ],
    styling: {
      hair: '사이드뱅 또는 C컬로 이마 가리기. 볼륨 중~장발로 하관 채우기',
      makeup: '이마 쉐이딩으로 너비 줄이기. 볼 하이라이터로 입체감',
      avoid: '이마 하이라이터 과다 사용 — 이마를 더 강조함',
    },
    ageAdvice: {
      '20대': '볼 탄력 유지 + 레이저토닝. 이마 시술은 최소화',
      '30대': '볼 필러 시작. 처짐 관리를 볼 위주로',
      '40대': '볼 필러 + 울쎄라 복합. 볼 볼륨 집중 유지',
    },
  },
  긴형: {
    emoji: '📏', subtitle: '긴 세로 비율 — 가로 볼륨 관리',
    ratio: '세로:가로 ≈ 1.6 이상 · 이마·턱 모두 길고 좁음',
    keyConcerns: ['가로 너비감 늘리기', '이마·턱 볼륨 과도한 강조 금지', '볼·광대에 볼륨 집중'],
    topTreatments: [
      { rank: 1, name: '볼·광대 필러', reason: '가로 너비감 + 볼륨감 부여', cost: '20~40만원', duration: '6~12개월', downtime: '2~3일' },
      { rank: 2, name: '스킨부스터', reason: '전반적 피부 질감 개선', cost: '10~20만원', duration: '6개월', downtime: '2~3일' },
      { rank: 3, name: '레이저토닝', reason: '피부톤 균일화', cost: '5~15만원', duration: '지속 관리형', downtime: '없음' },
    ],
    topDevices: [
      { name: 'RF 고주파', schedule: '주 2~3회 / 15분', focus: '볼·광대 탄력 유지' },
      { name: 'LED 복합광', schedule: '주 3~4회 / 10~15분', focus: '피부 재생·톤 개선' },
    ],
    styling: {
      hair: '가로 볼륨 있는 웨이브 단발·미디엄. 앞머리로 이마 길이 커버',
      makeup: '볼·광대 하이라이터로 가로 볼륨. 이마~턱 쉐이딩으로 단축',
      avoid: '긴 직모 올림머리 — 세로를 더 강조함',
    },
    ageAdvice: {
      '20대': '가로 볼륨 헤어+메이크업 활용. 필러는 20대 중후반부터',
      '30대': '볼 필러로 가로 볼륨 보충. 리프팅 시작',
      '40대': '볼·광대 볼륨 유지 + 복합 리프팅',
    },
  },
  다이아몬드형: {
    emoji: '💎', subtitle: '광대 돌출 — 이마·턱 볼륨 균형',
    ratio: '광대 > 이마 > 턱 · 마름모 실루엣',
    keyConcerns: ['이마·턱 볼륨으로 상하 균형', '광대 과다 강조 금지', '부드러운 전체 윤곽'],
    topTreatments: [
      { rank: 1, name: '이마 필러', reason: '이마 볼륨으로 상부 균형', cost: '15~30만원', duration: '12~18개월', downtime: '1~2일' },
      { rank: 2, name: '턱 필러', reason: '턱선 볼륨으로 하부 균형', cost: '15~30만원', duration: '12~18개월', downtime: '1~2일' },
      { rank: 3, name: '울쎄라 (광대 배제)', reason: '볼·턱 탄력 유지', cost: '30~60만원', duration: '12~18개월', downtime: '없음' },
    ],
    topDevices: [
      { name: 'RF 고주파', schedule: '주 2~3회 / 15분', focus: '볼·턱 탄력 유지' },
      { name: 'LED 적색광', schedule: '주 3~4회 / 15분', focus: '피부 재생' },
    ],
    styling: {
      hair: '앞머리로 이마 볼륨 보완. 턱선 아래 볼륨 있는 헤어',
      makeup: '이마·턱 하이라이터. 광대 쉐이딩 (선택)',
      avoid: '광대 하이라이터 — 돌출 부위 더 강조됨',
    },
    ageAdvice: {
      '20대': '자연스러운 메이크업으로 비율 조절. 필러는 선택적',
      '30대': '이마·턱 필러로 비율 균형. 광대 관련 시술 주의',
      '40대': '복합 볼륨 관리. 광대 주변 처짐 관리',
    },
  },
};

// ─── 피부타입별 핵심 데이터 ──────────────────────────────────────────────────────

const SKIN_REPORT: Record<string, {
  emoji: string; typeLabel: string;
  keyChars: string[];
  morningRoutine: { step: string; product: string }[];
  eveningRoutine: { step: string; product: string }[];
  topTreatments: { name: string; effect: string; interval: string }[];
  topDevices: { name: string; schedule: string; focus: string }[];
  avoidIngredients: string[];
  mustIngredients: string[];
}> = {
  지성: {
    emoji: '💦', typeLabel: '지성 피부',
    keyChars: ['세안 후 빠른 유분감', '모공 확장·블랙헤드', '여드름·트러블 잦음', '화장 유지력 저하'],
    morningRoutine: [
      { step: '클렌징', product: '약산성 젤 폼 클렌저' },
      { step: '토너', product: '나이아신아마이드·BHA 토너' },
      { step: '세럼', product: '오일프리 수분 세럼' },
      { step: '크림', product: '오일프리 워터·젤 크림' },
      { step: '선크림', product: '가벼운 워터 선크림 SPF 50' },
    ],
    eveningRoutine: [
      { step: '클렌징', product: '약산성 젤 클렌저' },
      { step: '토너', product: 'BHA·AHA 각질 토너 (주 2~3회)' },
      { step: '세럼', product: '레티놀 세럼 (주 2~3회) / 히알루론산 세럼' },
      { step: '크림', product: '오일프리 수분 크림' },
      { step: '스팟케어', product: '살리실산 스팟 트리트먼트' },
    ],
    topTreatments: [
      { name: '아쿠아필링', effect: '모공 클렌징·각질 제거', interval: '1~2개월 간격' },
      { name: '레이저토닝', effect: '색소·피부톤 개선', interval: '지속 관리형' },
      { name: 'PDT 광역동치료', effect: '여드름균·피지 억제', interval: '4~6주 간격' },
    ],
    topDevices: [
      { name: 'LED 청색광 (415nm)', schedule: '주 3~5회 / 10~15분', focus: '여드름균 억제' },
      { name: '갈바닉 -극 클렌징', schedule: '주 1~2회 / 5분', focus: '모공 세정·피지 제거' },
    ],
    avoidIngredients: ['미네랄오일', '라놀린', '이소프로필미리스테이트', '코코넛오일'],
    mustIngredients: ['나이아신아마이드', '살리실산(BHA)', '히알루론산', '판테놀'],
  },
  건성: {
    emoji: '🌵', typeLabel: '건성 피부',
    keyChars: ['세안 후 심한 당김·건조', '미세 각질·박리', '잔주름 조기 발생', '자극에 민감·홍조'],
    morningRoutine: [
      { step: '클렌징', product: '저자극 크림·밀크 클렌저' },
      { step: '토너', product: '히알루론산·세라마이드 수분 토너' },
      { step: '세럼', product: '고농도 히알루론산·판테놀 세럼' },
      { step: '크림', product: '세라마이드·스쿠알란 리치 크림' },
      { step: '선크림', product: '보습형 크림 타입 선크림 SPF 30+' },
    ],
    eveningRoutine: [
      { step: '클렌징', product: '저자극 오일·밀크 클렌저' },
      { step: '토너', product: '세라마이드·나이아신아마이드 토너' },
      { step: '세럼', product: '레티놀 세럼 (주 1~2회) / 수분 세럼 레이어링' },
      { step: '크림', product: '리치 배리어 크림 (세라마이드 함유)' },
      { step: '수면팩', product: '히알루론산·알란토인 수면마스크 (주 2~3회)' },
    ],
    topTreatments: [
      { name: '스킨부스터 (리쥬란/PN)', effect: '수분·재생 집중 공급', interval: '6개월' },
      { name: '물광주사', effect: '진피층 수분 보충', interval: '3~4개월' },
      { name: '아쿠아셀 필링', effect: '수분 공급·각질 정리', interval: '1~2개월 간격' },
    ],
    topDevices: [
      { name: '초음파 흡수 기기', schedule: '주 3~5회 / 세럼 후 5~10분', focus: '성분 흡수 극대화' },
      { name: 'LED 적색광 (630nm)', schedule: '주 3~4회 / 15분', focus: '피부 재생·장벽 강화' },
    ],
    avoidIngredients: ['알코올(에탄올)', '멘톨', '향료', '강한 AHA·BHA'],
    mustIngredients: ['히알루론산', '세라마이드', '스쿠알란', '시어버터', '판테놀'],
  },
  중성: {
    emoji: '✨', typeLabel: '중성 피부',
    keyChars: ['트러블 적고 피부결 균일', '유·수분 균형 유지', '계절 변화 적응력 좋음', '현상 유지·안티에이징 핵심'],
    morningRoutine: [
      { step: '클렌징', product: '순한 폼 클렌저' },
      { step: '토너', product: '비타민C·나이아신아마이드 항산화 토너' },
      { step: '세럼', product: '레티놀·펩타이드 안티에이징 세럼' },
      { step: '크림', product: '가벼운 에멀전 또는 워터크림' },
      { step: '선크림', product: 'SPF 30~50 자외선 차단제' },
    ],
    eveningRoutine: [
      { step: '클렌징', product: '약산성 폼 클렌저' },
      { step: '토너', product: '항산화·수분 토너' },
      { step: '세럼', product: '레티놀 세럼 (주 3~4회)' },
      { step: '크림', product: '펩타이드 안티에이징 크림' },
      { step: '아이크림', product: '펩타이드·카페인 아이크림' },
    ],
    topTreatments: [
      { name: '레이저토닝', effect: '피부톤 균일·색소 관리', interval: '지속 관리형' },
      { name: '스킨부스터', effect: '예방적 수분·재생 관리', interval: '6개월' },
      { name: 'HIFU 리프팅', effect: '탄력·처짐 예방', interval: '12~18개월' },
    ],
    topDevices: [
      { name: 'RF 고주파', schedule: '주 1~2회 / 10분', focus: '콜라겐 생성·안티에이징' },
      { name: 'LED 복합광', schedule: '주 3~4회 / 10~15분', focus: '재생·트러블 복합 케어' },
    ],
    avoidIngredients: ['과한 알코올', '강한 향료·색소'],
    mustIngredients: ['레티놀', '비타민C', '펩타이드', '나이아신아마이드'],
  },
  복합성: {
    emoji: '🔀', typeLabel: '복합성 피부',
    keyChars: ['T존 번들·모공 확장', 'U존 건조·당김·각질', '계절·호르몬 변화에 예민', '부위별 다른 케어 필요'],
    morningRoutine: [
      { step: '클렌징', product: '약산성 젤 클렌저' },
      { step: '토너', product: '수분·진정 토너 (전체)' },
      { step: '세럼', product: 'T존: 나이아신아마이드 / U존: 히알루론산 (분리)' },
      { step: '크림', product: 'T존: 젤 크림 / U존: 리치 크림 (분리)' },
      { step: '선크림', product: '매트 선크림 SPF 30~50' },
    ],
    eveningRoutine: [
      { step: '클렌징', product: '약산성 젤 클렌저 (T존 거품 집중)' },
      { step: '토너', product: 'BHA 토너 T존 국소 + 수분 토너 전체' },
      { step: '세럼', product: 'U존 히알루론산 레이어링' },
      { step: '크림', product: 'T존 가볍게 / U존 리치하게' },
      { step: '스팟케어', product: 'T존 여드름 부위 스팟 트리트먼트' },
    ],
    topTreatments: [
      { name: '아쿠아필링', effect: 'T존 모공·피지 클렌징', interval: '1~2개월 간격' },
      { name: '스킨부스터 (U존)', effect: 'U존 수분·재생 공급', interval: '6개월' },
      { name: '복합 레이저', effect: '부위별 맞춤 처치', interval: '지속 관리형' },
    ],
    topDevices: [
      { name: 'LED 복합광 (T청색·U적색)', schedule: '주 3~4회 / 10~15분', focus: '부위별 분리 케어' },
      { name: '갈바닉 (T존-, U존+)', schedule: '주 1~2회 / 10분', focus: 'T존 세정·U존 흡수' },
    ],
    avoidIngredients: ['미네랄오일 (T존)', '강한 알코올 (U존)'],
    mustIngredients: ['나이아신아마이드', '히알루론산', 'BHA (T존)', '세라마이드 (U존)'],
  },
  민감성: {
    emoji: '🌸', typeLabel: '민감성 피부',
    keyChars: ['외부 자극에 즉각 반응·홍조', '피부 장벽 약화·얇은 각질층', '화장품 성분에 트러블·가려움', '온도·계절 변화에 민감'],
    morningRoutine: [
      { step: '클렌징', product: '무향·무알코올 저자극 크림 클렌저' },
      { step: '토너', product: '센텔라·판테놀 진정 토너' },
      { step: '세럼', product: '마데카소사이드·베타글루칸 장벽 세럼' },
      { step: '크림', product: '무향 세라마이드 진정 크림' },
      { step: '선크림', product: '무기자차 (물리적) 선크림 SPF 30+' },
    ],
    eveningRoutine: [
      { step: '클렌징', product: '저자극 오일·밀크 클렌저 (이중 세안 최소화)' },
      { step: '토너', product: '센텔라·시카 진정 토너' },
      { step: '세럼', product: '히알루론산·나이아신아마이드 수분 세럼' },
      { step: '크림', product: '세라마이드·알란토인 배리어 크림' },
      { step: '수면팩', product: '시카·병풀 수분 수면팩 (주 2~3회)' },
    ],
    topTreatments: [
      { name: 'IPL (저출력)', effect: '홍조·실핏줄 개선', interval: '1~2개월 간격' },
      { name: '스킨부스터 (리쥬란)', effect: '피부 장벽 강화·재생', interval: '6개월' },
      { name: '물광주사', effect: '수분 공급·진정 케어', interval: '3~4개월' },
    ],
    topDevices: [
      { name: 'LED 적색광 (630nm)', schedule: '주 3~4회 / 10~15분', focus: '진정·장벽 강화·재생' },
      { name: '초음파 미스트', schedule: '매일 / 5~10분', focus: '수분 공급·진정' },
    ],
    avoidIngredients: ['알코올(에탄올)', '향료·색소', 'AHA/BHA 강산성', '고농도 레티놀', '멘톨'],
    mustIngredients: ['센텔라아시아티카', '마데카소사이드', '세라마이드', '판테놀', '베타글루칸'],
  },
};

// ─── AI 분석 텍스트 ────────────────────────────────────────────────────────────

const FACE_ANALYSIS_TEXT: Record<string, { opening: string; detail: string }> = {
  계란형: {
    opening: '이마·광대·턱의 너비가 균형있게 분포되어 있으며, 세로 대 가로 비율이 약 1.3~1.5로 이상적인 황금 비율에 가깝게 측정되었습니다.',
    detail: '볼 중앙부터 턱선까지 부드럽게 좁아지는 실루엣이 관찰되며, 전반적으로 균형 잡힌 윤곽을 유지하고 있습니다. 현재 상태에서는 노화 예방과 탄력 유지가 핵심 관리 포인트입니다.',
  },
  둥근형: {
    opening: '광대 아래 볼 부위가 넓게 채워져 있고, 이마와 턱의 너비가 거의 유사하여 전반적으로 둥근 실루엣이 형성됩니다.',
    detail: '턱선이 짧고 부드럽게 마무리되어 가로 너비감이 강조되며, 하안면이 둥글게 도드라지는 특징이 확인됩니다. 세로 길이감을 늘리고 교근 볼륨을 축소하는 방향의 관리가 핵심입니다.',
  },
  사각형: {
    opening: '이마·광대·턱의 너비가 거의 동일하게 측정되었으며, 하악각(턱 모서리)이 뚜렷하게 각진 실루엣이 관찰됩니다.',
    detail: '하악각 부위에 교근(씹는 근육) 볼륨이 두드러지고, 전체적인 직사각형 실루엣이 강조됩니다. 교근 축소와 볼~광대 리프팅을 통해 역삼각형 방향으로 교정하는 관리가 적합합니다.',
  },
  하트형: {
    opening: '이마 너비가 광대·턱보다 넓고, 아래로 갈수록 좁아지는 역삼각형 실루엣이 뚜렷하게 측정되었습니다.',
    detail: '이마와 관자놀이 부위가 넓어 상반부가 강조되며, 갸름한 턱선이 특징입니다. 볼 꺼짐이 진행될 경우 비율이 무너질 수 있어 볼 볼륨 유지가 가장 중요한 관리 포인트입니다.',
  },
  긴형: {
    opening: '세로 대 가로 비율이 1.6 이상으로 측정되어, 이마부터 턱까지 전체적으로 세로가 긴 실루엣이 확인됩니다.',
    detail: '이마와 턱 모두 길고 좁아 세로감이 과도하게 강조됩니다. 볼·광대에 가로 볼륨을 부여하고 앞머리로 이마 길이를 커버하는 방향의 관리가 비율 개선에 효과적입니다.',
  },
  다이아몬드형: {
    opening: '광대뼈가 가장 넓고 이마·턱이 좁은 마름모형 실루엣이 측정되었습니다. 광대의 돌출감이 두드러지는 특징이 관찰됩니다.',
    detail: '광대 부위에 골격이 도드라지며, 이마와 턱 사이의 너비 차이로 인해 가운데가 강조됩니다. 이마·턱 볼륨으로 상하 균형을 맞추고 광대 과다 강조를 피하는 관리가 필요합니다.',
  },
};

const SKIN_ANALYSIS_TEXT: Record<string, { opening: string; detail: string }> = {
  지성: {
    opening: 'T존(이마·코 부위)을 중심으로 피지 분비가 활발하며, 모공이 확장되어 있는 지성 피부로 측정되었습니다.',
    detail: '이전 트러블 흔적이 색소로 침착된 부분이 볼·코 주변에 관찰되며, 피지 과다로 인해 피부톤 불균일이 나타납니다. 피지 조절과 색소침착 개선이 동시에 필요한 상태입니다.',
  },
  건성: {
    opening: '피지와 수분이 모두 부족한 건성 피부로 측정되었습니다. 세안 후 당김과 미세 각질이 반복적으로 나타납니다.',
    detail: '볼·이마 부위에 미세 각질과 건조선이 관찰되며, 피부 장벽 기능이 약화되어 외부 자극에 민감하게 반응합니다. 수분 공급과 피부 장벽 강화가 최우선 관리 목표입니다.',
  },
  중성: {
    opening: '유·수분 균형이 이상적으로 유지되는 중성 피부로 측정되었습니다. 전반적으로 안정적인 피부 상태가 관찰됩니다.',
    detail: '트러블·각질·번들거림 없이 피부결이 균일하게 유지되고 있습니다. 현재 상태를 유지하면서 노화 예방에 집중하는 안티에이징 관리가 적합합니다.',
  },
  복합성: {
    opening: 'T존은 피지 과다로 번들거리고 U존(볼·턱)은 건조한 복합성 피부로 측정되었습니다.',
    detail: 'T존 부위에서 모공 확장과 번들거림이 관찰되며, U존에서는 건조함과 가벼운 각질이 동시에 나타납니다. 부위별로 다른 케어를 적용하는 분리 관리가 필수입니다.',
  },
  민감성: {
    opening: '피부 장벽이 약화되어 외부 자극에 즉각적으로 반응하는 민감성 피부로 측정되었습니다. 홍조와 따가움이 잦게 나타납니다.',
    detail: '볼·이마 부위에서 홍조와 피부결 불균일이 관찰되며, 강한 성분이나 온도 변화에 예민하게 반응합니다. 피부 장벽 회복과 진정 케어가 최우선 목표입니다.',
  },
};

// ─── 얼굴 마킹 데이터 ──────────────────────────────────────────────────────────

type FaceMark = {
  x: number; y: number;        // % 위치 (face container 기준)
  size: number;                 // 마킹 크기 (px)
  type: 'circle' | 'dot' | 'zone';
  color: string;
  label?: string;
  labelSide?: 'left' | 'right';
};

const FACE_SHAPE_MARKS: Record<string, FaceMark[]> = {
  둥근형: [
    { x: 18, y: 50, size: 44, type: 'circle', color: '#FF6B9D', label: '볼 넓음', labelSide: 'left' },
    { x: 82, y: 50, size: 44, type: 'circle', color: '#FF6B9D', labelSide: 'right' },
    { x: 50, y: 85, size: 52, type: 'circle', color: '#D473E8', label: '짧은 턱선', labelSide: 'right' },
  ],
  계란형: [
    { x: 50, y: 20, size: 36, type: 'circle', color: '#9B6FE8', label: '균형 이마', labelSide: 'right' },
    { x: 50, y: 80, size: 32, type: 'circle', color: '#5B9BD5', label: '갸름한 턱', labelSide: 'right' },
  ],
  사각형: [
    { x: 18, y: 75, size: 40, type: 'circle', color: '#FF6B9D', label: '하악각', labelSide: 'left' },
    { x: 82, y: 75, size: 40, type: 'circle', color: '#FF6B9D', labelSide: 'right' },
    { x: 50, y: 20, size: 56, type: 'circle', color: '#D473E8', label: '넓은 이마', labelSide: 'right' },
  ],
  하트형: [
    { x: 50, y: 15, size: 64, type: 'circle', color: '#FF6B9D', label: '넓은 이마', labelSide: 'right' },
    { x: 22, y: 52, size: 34, type: 'circle', color: '#D473E8', label: '볼 꺼짐 주의', labelSide: 'left' },
    { x: 78, y: 52, size: 34, type: 'circle', color: '#D473E8', labelSide: 'right' },
  ],
  긴형: [
    { x: 50, y: 12, size: 42, type: 'circle', color: '#9B6FE8', label: '긴 이마', labelSide: 'right' },
    { x: 50, y: 88, size: 38, type: 'circle', color: '#9B6FE8', label: '긴 턱선', labelSide: 'right' },
  ],
  다이아몬드형: [
    { x: 16, y: 45, size: 44, type: 'circle', color: '#F5A623', label: '광대 돌출', labelSide: 'left' },
    { x: 84, y: 45, size: 44, type: 'circle', color: '#F5A623', labelSide: 'right' },
    { x: 50, y: 18, size: 34, type: 'circle', color: '#5B9BD5', label: '좁은 이마', labelSide: 'right' },
  ],
};

const SKIN_TYPE_MARKS: Record<string, FaceMark[]> = {
  지성: [
    { x: 50, y: 22, size: 50, type: 'zone', color: 'rgba(255,107,157,0.25)', label: 'T존 피지', labelSide: 'left' },
    { x: 50, y: 48, size: 28, type: 'zone', color: 'rgba(255,107,157,0.22)', label: '모공', labelSide: 'right' },
    { x: 28, y: 58, size: 22, type: 'dot', color: '#C0392B', label: '색소침착', labelSide: 'left' },
    { x: 72, y: 58, size: 22, type: 'dot', color: '#C0392B', labelSide: 'right' },
  ],
  건성: [
    { x: 28, y: 38, size: 30, type: 'zone', color: 'rgba(91,155,213,0.25)', label: '각질·건조', labelSide: 'left' },
    { x: 72, y: 38, size: 30, type: 'zone', color: 'rgba(91,155,213,0.25)', labelSide: 'right' },
    { x: 50, y: 70, size: 34, type: 'zone', color: 'rgba(91,155,213,0.2)', label: '당김', labelSide: 'right' },
  ],
  중성: [
    { x: 50, y: 45, size: 70, type: 'zone', color: 'rgba(39,174,96,0.12)', label: '균형 유지', labelSide: 'right' },
  ],
  복합성: [
    { x: 50, y: 22, size: 44, type: 'zone', color: 'rgba(255,107,157,0.25)', label: 'T존 지성', labelSide: 'left' },
    { x: 22, y: 58, size: 36, type: 'zone', color: 'rgba(91,155,213,0.25)', label: 'U존 건성', labelSide: 'left' },
    { x: 78, y: 58, size: 36, type: 'zone', color: 'rgba(91,155,213,0.25)', labelSide: 'right' },
  ],
  민감성: [
    { x: 28, y: 40, size: 32, type: 'zone', color: 'rgba(255,107,157,0.2)', label: '홍조', labelSide: 'left' },
    { x: 72, y: 40, size: 32, type: 'zone', color: 'rgba(255,107,157,0.2)', labelSide: 'right' },
    { x: 50, y: 55, size: 50, type: 'zone', color: 'rgba(212,115,232,0.15)', label: '민감 부위', labelSide: 'right' },
  ],
};

// ─── 빌드 로드맵 ────────────────────────────────────────────────────────────────


function buildRoadmap(
  faceShape: string, skinType: string, ageGroup: string, concerns: string[],
): { phase: string; timeline: string; icon: string; color: string; tasks: string[] }[] {
  const face = FACE_REPORT[faceShape];
  const skin = SKIN_REPORT[skinType];
  if (!face || !skin) return [];

  const firstDevice = skin.topDevices[0]?.name ?? '홈케어 기기';
  const firstTreatment = skin.topTreatments[0]?.name ?? '추천 시술';
  const faceTreatment = face.topTreatments[0]?.name ?? '얼굴형 시술';

  return [
    {
      phase: '지금 바로', timeline: '0~2주', icon: '🚀', color: '#5B9BD5',
      tasks: [
        '아침·저녁 스킨케어 루틴 확립',
        `${firstDevice} 구입 및 사용 시작`,
        `자외선 차단제 SPF 30+ 매일 사용`,
        '수분 충분히 섭취·충분한 수면',
      ],
    },
    {
      phase: '1개월차', timeline: '1개월', icon: '💉', color: Colors.primary,
      tasks: [
        `${firstTreatment} 1회 (피부타입 개선 시작)`,
        `${firstDevice} 주 ${skin.topDevices[0]?.schedule?.split('/')[0]?.trim() ?? '3회'} 루틴화`,
        '전·후 사진 촬영 (경과 기록)',
        '피부과 상담 예약',
      ],
    },
    {
      phase: '3개월차', timeline: '3개월', icon: '📊', color: '#9B6FE8',
      tasks: [
        '경과 사진 비교·효과 점검',
        `${skin.topTreatments[1]?.name ?? '2차 시술'} 검토`,
        `얼굴형 관련 — ${faceTreatment} 상담`,
        '보습·진정 루틴 시즌 조정',
      ],
    },
    {
      phase: '6개월차', timeline: '6개월', icon: '🏆', color: '#F5A623',
      tasks: [
        `${faceTreatment} 시술 (얼굴형 관리 본격화)`,
        '상반기 관리 결과 정리',
        '연간 관리 계획 수립',
        '필요 시 기기 업그레이드 검토',
      ],
    },
  ];
}

// ─── 보고서 화면 ────────────────────────────────────────────────────────────────

const DEMO_PROFILES: Record<string, { face_shape: string; skin_type: string; age_group: string; concerns: string[]; nickname: string }> = {
  '둥근형-지성': { face_shape: '둥근형', skin_type: '지성', age_group: '30대', concerns: ['색소침착', '모공', '리프팅'], nickname: '데모 회원' },
  '하트형-건성': { face_shape: '하트형', skin_type: '건성', age_group: '20대', concerns: ['수분', '리프팅'], nickname: '데모 회원' },
  '계란형-복합성': { face_shape: '계란형', skin_type: '복합성', age_group: '40대', concerns: ['주름', '탄력'], nickname: '데모 회원' },
};

const PAYMENT_URL = `/payment?itemName=${encodeURIComponent('맞춤 분석 보고서')}&amount=${REPORT_COST}&returnTo=skin-report`;

export default function SkinReportScreen() {
  const { user, profile, fetchProfile, loading: authLoading } = useAuth();
  const { demo } = useLocalSearchParams<{ demo?: string }>();

  // 최신 face_photo_url 확보: 회원가입 직후 race condition 보정
  useEffect(() => {
    if (!demo && user?.id) fetchProfile(user.id);
  }, [user?.id]);

  // 비로그인 + 데모 아닌 경우 → 결제 화면으로 리다이렉트
  // authLoading 중에는 redirect 금지 (iOS에서 auth 초기화 전 user=null로 잘못 redirect되는 문제 방지)
  useEffect(() => {
    if (!demo && !authLoading && !user) {
      router.replace(PAYMENT_URL as any);
    }
  }, [demo, user, authLoading]);

  const demoProfile = demo ? DEMO_PROFILES[demo] ?? DEMO_PROFILES['둥근형-지성'] : null;

  const faceShape = demoProfile?.face_shape ?? profile?.face_shape ?? '';
  const skinType = demoProfile?.skin_type ?? profile?.skin_type ?? '';
  const ageGroup = demoProfile?.age_group ?? profile?.age_group ?? '';
  const concerns: string[] = demoProfile?.concerns ?? profile?.concerns ?? [];
  const displayName = demoProfile?.nickname ?? profile?.nickname ?? user?.email?.split('@')[0] ?? '회원';
  const facePhotoUrl = demo ? null : (profile?.face_photo_url ?? profile?.avatar_url ?? null);
  const today = new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' });

  const face = FACE_REPORT[faceShape];
  const skin = SKIN_REPORT[skinType];
  const roadmap = buildRoadmap(faceShape, skinType, ageGroup, concerns);

  // 프로필 미완성 상태
  const isIncomplete = !faceShape || !skinType;

  const handleShare = async () => {
    try {
      await Share.share({
        message: `[픽디] ${displayName}님의 맞춤 피부 분석 보고서\n얼굴형: ${faceShape || '미완성'} | 피부타입: ${skinType || '미완성'}\n픽디 앱에서 내 맞춤 보고서를 확인해보세요!`,
      });
    } catch {}
  };

  if (loading && !demo) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.bg }}>
        <ActivityIndicator color={Colors.primary} size="large" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* ── 커버 헤더 ── */}
      <LinearGradient
        colors={['#FF6B9D', '#D473E8', '#9B6FE8']}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={styles.cover}
      >
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <View style={styles.coverOrb} />
        <Text style={styles.coverBrand}>PICKD</Text>
        <Text style={styles.coverTitle}>맞춤 피부 분석 보고서</Text>
        <Text style={styles.coverName}>{displayName}님</Text>
        <Text style={styles.coverDate}>{today}</Text>

        {/* 프로필 요약 칩 */}
        <View style={styles.coverChips}>
          {faceShape ? <CoverChip icon="scan-outline" label={`${face?.emoji ?? ''} ${faceShape}`} /> : <CoverChip icon="scan-outline" label="얼굴형 미설정" dim />}
          {skinType ? <CoverChip icon="water-outline" label={`${skin?.emoji ?? ''} ${skinType}`} /> : <CoverChip icon="water-outline" label="피부타입 미설정" dim />}
          {ageGroup ? <CoverChip icon="person-outline" label={ageGroup} /> : null}
        </View>

        {/* 공유 버튼 */}
        <TouchableOpacity style={styles.shareBtn} onPress={handleShare}>
          <Ionicons name="share-outline" size={16} color="rgba(255,255,255,0.9)" />
          <Text style={styles.shareBtnText}>공유</Text>
        </TouchableOpacity>
      </LinearGradient>

      {/* 미완성 안내 */}
      {isIncomplete && (
        <View style={styles.incompleteCard}>
          <Ionicons name="information-circle-outline" size={22} color={Colors.primary} />
          <View style={{ flex: 1 }}>
            <Text style={styles.incompleteTitle}>프로필을 완성하면 더 정확한 보고서를 받을 수 있어요</Text>
            <Text style={styles.incompleteDesc}>마이페이지 → 피부 프로필 수정에서 설정하세요</Text>
          </View>
          <TouchableOpacity onPress={() => router.push('/profile-setup' as any)}>
            <Text style={styles.incompleteBtn}>설정</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.content}>

        {/* ── AI 분석 종합 단락 ── */}
        {(face || skin) && (
          <AiAnalysisBlock
            faceShape={faceShape}
            skinType={skinType}
            ageGroup={ageGroup}
            concerns={concerns}
            displayName={displayName}
            facePhotoUrl={facePhotoUrl}
          />
        )}

        {/* ── SECTION 01: 내 프로필 요약 ── */}
        <SectionHeader num="01" title="내 피부 프로필" />
        <View style={styles.card}>
          <View style={styles.profileGrid}>
            <ProfileItem label="얼굴형" value={faceShape ? `${face?.emoji} ${faceShape}` : '미설정'} sub={face?.subtitle} />
            <ProfileItem label="피부타입" value={skinType ? `${skin?.emoji} ${skinType}` : '미설정'} sub={skin?.typeLabel} />
            <ProfileItem label="연령대" value={ageGroup || '미설정'} />
            <ProfileItem label="성별" value={profile?.gender || '미설정'} />
          </View>
          {concerns.length > 0 && (
            <View style={styles.concernSection}>
              <Text style={styles.concernLabel}>주요 피부 고민</Text>
              <View style={styles.concernRow}>
                {concerns.map((c: string) => (
                  <View key={c} style={styles.concernChip}>
                    <Text style={styles.concernText}>{c}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}
        </View>

        {/* ── SECTION 02: 얼굴형 상세 분석 ── */}
        {face && (
          <>
            <SectionHeader num="02" title="얼굴형 상세 분석" />
            <View style={styles.card}>
              <View style={styles.faceHeader}>
                <Text style={styles.faceEmoji}>{face.emoji}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.faceType}>{faceShape}형</Text>
                  <Text style={styles.faceSubtitle}>{face.subtitle}</Text>
                </View>
              </View>
              <LabelRow label="황금 비율" value={face.ratio} />
              <Divider />
              <Text style={styles.itemLabel}>관리 핵심 포인트</Text>
              {face.keyConcerns.map((c, i) => (
                <Bullet key={i} text={c} />
              ))}
              {ageGroup && face.ageAdvice[ageGroup.replace('초반', '').replace('후반', '')] && (
                <>
                  <Divider />
                  <View style={styles.ageNoteBox}>
                    <Text style={styles.ageNoteLabel}>📅 {ageGroup} 맞춤 조언</Text>
                    <Text style={styles.ageNoteText}>
                      {face.ageAdvice[Object.keys(face.ageAdvice).find(k => ageGroup.includes(k)) ?? ''] ?? ''}
                    </Text>
                  </View>
                </>
              )}
            </View>
          </>
        )}

        {/* ── SECTION 03: 피부타입 상세 ── */}
        {skin && (
          <>
            <SectionHeader num="03" title="피부타입 상세 분석" />
            <View style={styles.card}>
              <View style={styles.faceHeader}>
                <Text style={styles.faceEmoji}>{skin.emoji}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.faceType}>{skinType} 피부</Text>
                  <Text style={styles.faceSubtitle}>{skin.typeLabel}</Text>
                </View>
              </View>
              <Text style={styles.itemLabel}>주요 피부 특징</Text>
              {skin.keyChars.map((c, i) => <Bullet key={i} text={c} />)}
              <Divider />
              <Text style={styles.itemLabel}>피해야 할 성분</Text>
              <View style={styles.ingredientRow}>
                {skin.avoidIngredients.map((ing) => (
                  <View key={ing} style={styles.avoidChip}>
                    <Text style={styles.avoidChipText}>✕ {ing}</Text>
                  </View>
                ))}
              </View>
              <Text style={[styles.itemLabel, { marginTop: 8 }]}>꼭 써야 할 성분</Text>
              <View style={styles.ingredientRow}>
                {skin.mustIngredients.map((ing) => (
                  <View key={ing} style={styles.mustChip}>
                    <Text style={styles.mustChipText}>✓ {ing}</Text>
                  </View>
                ))}
              </View>
            </View>
          </>
        )}

        {/* ── SECTION 04: 맞춤 시술 추천 ── */}
        {(face || skin) && (
          <>
            <SectionHeader num="04" title="맞춤 시술 추천" />
            <View style={styles.card}>
              {face && (
                <>
                  <View style={styles.treatCategoryHeader}>
                    <View style={styles.treatCategoryBadge}>
                      <Text style={styles.treatCategoryText}>{face.emoji} 얼굴형 관련</Text>
                    </View>
                  </View>
                  {face.topTreatments.map((t) => (
                    <TreatRow key={t.name} rank={t.rank} name={t.name} reason={t.reason} cost={t.cost} duration={t.duration} downtime={t.downtime} />
                  ))}
                </>
              )}
              {skin && (
                <>
                  <View style={[styles.treatCategoryHeader, { marginTop: face ? 12 : 0 }]}>
                    <View style={[styles.treatCategoryBadge, { backgroundColor: '#F0ECFF' }]}>
                      <Text style={[styles.treatCategoryText, { color: '#6B4EFF' }]}>{skin.emoji} 피부타입 관련</Text>
                    </View>
                  </View>
                  {skin.topTreatments.map((t, i) => (
                    <TreatRow key={t.name} rank={i + 1} name={t.name} reason={t.effect} cost="클리닉 상담 후" duration={t.interval} downtime="상담 필요" />
                  ))}
                </>
              )}
            </View>
          </>
        )}

        {/* ── SECTION 05: 맞춤 홈케어 기기 ── */}
        {(face || skin) && (
          <>
            <SectionHeader num="05" title="맞춤 홈케어 기기" />
            <View style={styles.card}>
              {[...(face?.topDevices ?? []), ...(skin?.topDevices ?? [])].map((d, i) => (
                <View key={d.name} style={[styles.deviceRow, i > 0 && styles.rowBorder]}>
                  <View style={styles.deviceRankBadge}>
                    <Text style={styles.deviceRank}>{i + 1}</Text>
                  </View>
                  <View style={{ flex: 1, gap: 4 }}>
                    <Text style={styles.deviceName}>{d.name}</Text>
                    <Text style={styles.deviceFocus}>{d.focus}</Text>
                    <View style={styles.deviceScheduleChip}>
                      <Ionicons name="time-outline" size={11} color={Colors.primary} />
                      <Text style={styles.deviceScheduleText}>{d.schedule}</Text>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          </>
        )}

        {/* ── SECTION 06: 스킨케어 루틴 ── */}
        {skin && (
          <>
            <SectionHeader num="06" title="맞춤 스킨케어 루틴" />
            <View style={styles.card}>
              <Text style={styles.routineTitle}>☀️ 아침 루틴</Text>
              {skin.morningRoutine.map((r, i) => (
                <RoutineRow key={r.step} num={i + 1} step={r.step} product={r.product} />
              ))}
              <Divider />
              <Text style={[styles.routineTitle, { marginTop: 4 }]}>🌙 저녁 루틴</Text>
              {skin.eveningRoutine.map((r, i) => (
                <RoutineRow key={r.step} num={i + 1} step={r.step} product={r.product} />
              ))}
            </View>
          </>
        )}

        {/* ── SECTION 07: 6개월 관리 로드맵 ── */}
        {roadmap.length > 0 && (
          <>
            <SectionHeader num="07" title="6개월 맞춤 관리 로드맵" />
            <View style={styles.roadmapContainer}>
              {roadmap.map((phase, i) => (
                <View key={phase.phase} style={styles.roadmapRow}>
                  {/* 타임라인 선 */}
                  <View style={styles.roadmapTimeline}>
                    <View style={[styles.roadmapDot, { backgroundColor: phase.color }]}>
                      <Text style={styles.roadmapDotEmoji}>{phase.icon}</Text>
                    </View>
                    {i < roadmap.length - 1 && <View style={styles.roadmapLine} />}
                  </View>
                  {/* 내용 */}
                  <View style={styles.roadmapContent}>
                    <View style={styles.roadmapHeader}>
                      <Text style={[styles.roadmapPhase, { color: phase.color }]}>{phase.phase}</Text>
                      <View style={[styles.roadmapTimeBadge, { backgroundColor: `${phase.color}15` }]}>
                        <Text style={[styles.roadmapTimeText, { color: phase.color }]}>{phase.timeline}</Text>
                      </View>
                    </View>
                    {phase.tasks.map((task, ti) => (
                      <View key={ti} style={styles.roadmapTask}>
                        <View style={styles.roadmapTaskDot} />
                        <Text style={styles.roadmapTaskText}>{task}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              ))}
            </View>
          </>
        )}

        {/* ── SECTION 08: 스타일링 조언 ── */}
        {face && (
          <>
            <SectionHeader num="08" title="스타일링 조언" />
            <View style={styles.card}>
              <StyleRow icon="✂️" label="추천 헤어" text={face.styling.hair} positive />
              <Divider />
              <StyleRow icon="💄" label="추천 메이크업" text={face.styling.makeup} positive />
              <Divider />
              <StyleRow icon="⚠️" label="피해야 할 스타일" text={face.styling.avoid} positive={false} />
            </View>
          </>
        )}

        {/* ── 면책 안내 ── */}
        <View style={styles.disclaimer}>
          <Ionicons name="information-circle-outline" size={14} color={Colors.sub} />
          <Text style={styles.disclaimerText}>
            이 보고서는 자가진단 기반 참고용 자료입니다. 시술 전 반드시 전문 피부과 의사와 상담하세요. 개인 피부 상태에 따라 결과가 다를 수 있습니다.
          </Text>
        </View>

        <View style={{ height: 40 }} />
      </View>
    </ScrollView>
  );
}

// ─── AI 분석 블록 ──────────────────────────────────────────────────────────────

function AiAnalysisBlock({
  faceShape, skinType, ageGroup, concerns, displayName, facePhotoUrl,
}: { faceShape: string; skinType: string; ageGroup: string; concerns: string[]; displayName: string; facePhotoUrl: string | null }) {
  const faceText = FACE_ANALYSIS_TEXT[faceShape];
  const skinText = SKIN_ANALYSIS_TEXT[skinType];
  const faceMarks = FACE_SHAPE_MARKS[faceShape] ?? [];
  const skinMarks = SKIN_TYPE_MARKS[skinType] ?? [];
  const allMarks = [...faceMarks, ...skinMarks];

  const faceEmoji = FACE_REPORT[faceShape]?.emoji ?? '';
  const skinEmoji = SKIN_REPORT[skinType]?.emoji ?? '';

  if (!faceText && !skinText) return null;

  return (
    <View style={aiStyles.container}>
      {/* AI 배지 */}
      <View style={aiStyles.aiBadgeRow}>
        <LinearGradient colors={['#FF6B9D', '#9B6FE8']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={aiStyles.aiBadge}>
          <Ionicons name="sparkles" size={12} color="#fff" />
          <Text style={aiStyles.aiBadgeText}>AI 정밀분석 결과</Text>
        </LinearGradient>
        {facePhotoUrl && (
          <View style={aiStyles.photobadge}>
            <Ionicons name="camera" size={10} color="#27AE60" />
            <Text style={aiStyles.photobadgeText}>실제 사진 분석</Text>
          </View>
        )}
      </View>

      {/* 얼굴 마킹 + 분석 */}
      <View style={aiStyles.faceRow}>
        {/* 얼굴 일러스트 (사진 있으면 실제 사진) */}
        <FaceAnnotationView marks={allMarks} faceShape={faceShape} photoUrl={facePhotoUrl} />

        {/* 분석 텍스트 */}
        <View style={aiStyles.faceTextCol}>
          {faceText && (
            <>
              <View style={aiStyles.textBadge}>
                <Text style={aiStyles.textBadgeLabel}>{faceEmoji} 얼굴형</Text>
              </View>
              <Text style={aiStyles.analysisText}>{faceText.opening}</Text>
              <Text style={aiStyles.analysisDetail}>{faceText.detail}</Text>
            </>
          )}
          {skinText && (
            <View style={{ marginTop: faceText ? 10 : 0 }}>
              <View style={[aiStyles.textBadge, { backgroundColor: '#F0ECFF' }]}>
                <Text style={[aiStyles.textBadgeLabel, { color: '#6B4EFF' }]}>{skinEmoji} 피부타입</Text>
              </View>
              <Text style={aiStyles.analysisText}>{skinText.opening}</Text>
              <Text style={aiStyles.analysisDetail}>{skinText.detail}</Text>
            </View>
          )}
        </View>
      </View>

      {/* 마킹 범례 */}
      {allMarks.filter(m => m.label).length > 0 && (
        <View style={aiStyles.legendRow}>
          {allMarks.filter(m => m.label).map((m, i) => (
            <View key={i} style={aiStyles.legendItem}>
              <View style={[aiStyles.legendDot, { backgroundColor: m.color }]} />
              <Text style={aiStyles.legendLabel}>{m.label}</Text>
            </View>
          ))}
        </View>
      )}

      {/* 종합 결론 */}
      <LinearGradient
        colors={['rgba(255,107,157,0.08)', 'rgba(155,111,232,0.08)']}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
        style={aiStyles.conclusionBox}
      >
        <Ionicons name="checkmark-circle" size={18} color={Colors.primary} />
        <Text style={aiStyles.conclusionText}>
          따라서 {displayName}님은 픽디 AI 분석 기준{'\n'}
          <Text style={aiStyles.conclusionHighlight}>
            {faceShape && skinType ? `${faceShape}에 ${skinType} 피부` : faceShape || skinType}
          </Text>
          {concerns.length > 0 && (
            <Text>{'로, '}<Text style={aiStyles.concernHighlight}>{concerns.join('·')}</Text>{' 개선이 우선 과제'}</Text>
          )}
          로 측정되었습니다.{'\n'}아래 맞춤 솔루션으로 관리해드리겠습니다.
        </Text>
      </LinearGradient>
    </View>
  );
}

// ─── 얼굴 마킹 뷰 ──────────────────────────────────────────────────────────────

const FACE_W = 140;
const FACE_H = 180;

function FaceAnnotationView({ marks, faceShape, photoUrl }: { marks: FaceMark[]; faceShape: string; photoUrl?: string | null }) {
  const isRound = faceShape === '둥근형';
  const isLong = faceShape === '긴형';
  const isSq = faceShape === '사각형';
  const faceWidth = isRound ? 110 : isLong ? 80 : isSq ? 105 : 95;
  const faceHeight = isRound ? 120 : isLong ? 165 : isSq ? 130 : 140;
  const borderRadius = isRound ? 60 : isLong ? 50 : isSq ? 20 : 50;

  return (
    <View style={{ width: FACE_W, height: FACE_H, position: 'relative', flexShrink: 0 }}>
      {photoUrl ? (
        /* ── 실제 얼굴 사진 ── */
        <>
          <Image
            source={{ uri: photoUrl }}
            style={{ width: FACE_W, height: FACE_H, borderRadius: 16 }}
            resizeMode="cover"
          />
          {/* 사진 위 반투명 오버레이로 마킹 가시성 확보 */}
          <View style={{
            position: 'absolute', top: 0, left: 0, width: FACE_W, height: FACE_H,
            borderRadius: 16, backgroundColor: 'rgba(0,0,0,0.04)',
          }} />
        </>
      ) : (
        /* ── 설문 기반 일러스트 ── */
        <>
          <View style={[faceStyles.neck, {
            left: FACE_W / 2 - 14,
            top: (FACE_H - faceHeight) / 2 + faceHeight - 8,
          }]} />
          <View style={[faceStyles.faceOutline, {
            width: faceWidth, height: faceHeight,
            left: (FACE_W - faceWidth) / 2,
            top: (FACE_H - faceHeight) / 2,
            borderRadius,
            borderBottomLeftRadius: isSq ? 16 : borderRadius,
            borderBottomRightRadius: isSq ? 16 : borderRadius,
          }]}>
            <View style={[faceStyles.eye, { left: faceWidth * 0.22, top: faceHeight * 0.3 }]} />
            <View style={[faceStyles.eye, { left: faceWidth * 0.62, top: faceHeight * 0.3 }]} />
            <View style={[faceStyles.nose, { left: faceWidth * 0.42, top: faceHeight * 0.5 }]} />
            <View style={[faceStyles.mouth, { left: faceWidth * 0.28, top: faceHeight * 0.67 }]} />
          </View>
        </>
      )}

      {/* 마킹 오버레이 (사진/일러스트 공용) */}
      {marks.map((m, i) => {
        const px = (FACE_W * m.x) / 100 - m.size / 2;
        const py = (FACE_H * m.y) / 100 - m.size / 2;
        return (
          <View
            key={i}
            style={{
              position: 'absolute',
              left: px, top: py,
              width: m.size, height: m.size,
              borderRadius: m.size / 2,
              backgroundColor: m.type === 'zone' ? m.color : m.type === 'dot' ? m.color : 'transparent',
              borderWidth: m.type === 'circle' ? 2.5 : 0,
              borderColor: m.type === 'circle' ? m.color : 'transparent',
              borderStyle: 'dashed',
            }}
          />
        );
      })}
    </View>
  );
}

const faceStyles = StyleSheet.create({
  faceOutline: {
    position: 'absolute',
    borderWidth: 2, borderColor: '#C7C7CC',
    backgroundColor: '#FFF5F9',
    overflow: 'hidden',
  },
  neck: {
    position: 'absolute', width: 28, height: 24,
    backgroundColor: '#FFF5F9', borderWidth: 1.5, borderColor: '#C7C7CC',
    borderTopWidth: 0, zIndex: 0,
  },
  eye: {
    position: 'absolute', width: 16, height: 8, borderRadius: 4,
    backgroundColor: '#8E8E93',
  },
  nose: {
    position: 'absolute', width: 12, height: 10, borderRadius: 6,
    backgroundColor: 'rgba(142,142,147,0.4)',
    borderWidth: 1, borderColor: '#C7C7CC',
  },
  mouth: {
    position: 'absolute', width: 28, height: 8, borderRadius: 4,
    backgroundColor: 'rgba(255,107,157,0.3)',
  },
});

const aiStyles = StyleSheet.create({
  container: {
    backgroundColor: Colors.white, borderRadius: 20, marginBottom: 4,
    padding: 18, gap: 14,
    shadowColor: Colors.primary, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1, shadowRadius: 16, elevation: 4,
    borderWidth: 1.5, borderColor: Colors.primaryLight,
  },
  aiBadgeRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  photobadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#E8F8EF', paddingVertical: 4, paddingHorizontal: 10, borderRadius: 12,
  },
  photobadgeText: { fontSize: 10, fontWeight: '700', color: '#27AE60' },
  aiBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingVertical: 5, paddingHorizontal: 12, borderRadius: 20,
  },
  aiBadgeText: { fontSize: 11, fontWeight: '800', color: '#fff', letterSpacing: 0.5 },
  faceRow: { flexDirection: 'row', gap: 14, alignItems: 'flex-start' },
  faceTextCol: { flex: 1, gap: 6 },
  textBadge: {
    alignSelf: 'flex-start', backgroundColor: Colors.primaryLight,
    paddingVertical: 3, paddingHorizontal: 10, borderRadius: 12, marginBottom: 4,
  },
  textBadgeLabel: { fontSize: 11, fontWeight: '700', color: Colors.primary },
  analysisText: { fontSize: 12, fontWeight: '700', color: Colors.text, lineHeight: 18 },
  analysisDetail: { fontSize: 11, color: Colors.sub, lineHeight: 17, marginTop: 2 },
  legendRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendLabel: { fontSize: 11, color: Colors.sub, fontWeight: '600' },
  conclusionBox: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    borderRadius: 14, padding: 14,
  },
  conclusionText: { flex: 1, fontSize: 13, color: Colors.text, lineHeight: 20 },
  conclusionHighlight: { fontWeight: '900', color: Colors.primary },
  concernHighlight: { fontWeight: '700', color: '#9B6FE8' },
});

// ─── 서브 컴포넌트 ──────────────────────────────────────────────────────────────

function SectionHeader({ num, title }: { num: string; title: string }) {
  return (
    <View style={sectionStyles.row}>
      <LinearGradient
        colors={['#FF6B9D', '#9B6FE8']}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
        style={sectionStyles.numBadge}
      >
        <Text style={sectionStyles.num}>{num}</Text>
      </LinearGradient>
      <Text style={sectionStyles.title}>{title}</Text>
    </View>
  );
}

function CoverChip({ icon, label, dim }: { icon: string; label: string; dim?: boolean }) {
  return (
    <View style={[coverChipStyles.chip, dim && { opacity: 0.5 }]}>
      <Ionicons name={icon as any} size={12} color="rgba(255,255,255,0.9)" />
      <Text style={coverChipStyles.text}>{label}</Text>
    </View>
  );
}

function ProfileItem({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <View style={piStyles.item}>
      <Text style={piStyles.label}>{label}</Text>
      <Text style={piStyles.value}>{value}</Text>
      {sub && <Text style={piStyles.sub}>{sub}</Text>}
    </View>
  );
}

function LabelRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={lrStyles.row}>
      <Text style={lrStyles.label}>{label}</Text>
      <Text style={lrStyles.value}>{value}</Text>
    </View>
  );
}

function Bullet({ text }: { text: string }) {
  return (
    <View style={bulletStyles.row}>
      <View style={bulletStyles.dot} />
      <Text style={bulletStyles.text}>{text}</Text>
    </View>
  );
}

function Divider() {
  return <View style={{ height: 1, backgroundColor: Colors.border, marginVertical: 10 }} />;
}

function TreatRow({ rank, name, reason, cost, duration, downtime }: {
  rank: number; name: string; reason: string; cost: string; duration: string; downtime: string;
}) {
  return (
    <View style={treatStyles.row}>
      <View style={treatStyles.rank}>
        <Text style={treatStyles.rankText}>{rank}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={treatStyles.name}>{name}</Text>
        <Text style={treatStyles.reason}>{reason}</Text>
        <View style={treatStyles.tags}>
          <Text style={treatStyles.tag}>💰 {cost}</Text>
          <Text style={treatStyles.tag}>⏱ {duration}</Text>
          <Text style={treatStyles.tag}>🌿 {downtime}</Text>
        </View>
      </View>
    </View>
  );
}

function RoutineRow({ num, step, product }: { num: number; step: string; product: string }) {
  return (
    <View style={routineStyles.row}>
      <View style={routineStyles.num}>
        <Text style={routineStyles.numText}>{num}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={routineStyles.step}>{step}</Text>
        <Text style={routineStyles.product}>{product}</Text>
      </View>
    </View>
  );
}

function StyleRow({ icon, label, text, positive }: { icon: string; label: string; text: string; positive: boolean }) {
  return (
    <View style={styleRowStyles.row}>
      <Text style={styleRowStyles.icon}>{icon}</Text>
      <View style={{ flex: 1 }}>
        <Text style={[styleRowStyles.label, !positive && { color: '#E74C3C' }]}>{label}</Text>
        <Text style={styleRowStyles.text}>{text}</Text>
      </View>
    </View>
  );
}

// ─── 스타일 ─────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  cover: {
    paddingTop: HEADER_TOP, paddingBottom: 32, paddingHorizontal: 24,
    alignItems: 'center', gap: 6, overflow: 'hidden', position: 'relative',
  },
  backBtn: {
    position: 'absolute', top: HEADER_TOP, left: 20,
    width: 36, height: 36, alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 18,
  },
  coverOrb: {
    position: 'absolute', width: 200, height: 200, borderRadius: 100,
    backgroundColor: 'rgba(255,255,255,0.08)', top: -60, right: -40,
  },
  coverBrand: { fontSize: 11, fontWeight: '900', color: 'rgba(255,255,255,0.7)', letterSpacing: 4 },
  coverTitle: { fontSize: 20, fontWeight: '900', color: '#fff', marginTop: 2 },
  coverName: { fontSize: 16, fontWeight: '700', color: 'rgba(255,255,255,0.9)' },
  coverDate: { fontSize: 12, color: 'rgba(255,255,255,0.6)' },
  coverChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginTop: 8 },
  shareBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 12,
    paddingVertical: 8, paddingHorizontal: 18,
    backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 20,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)',
  },
  shareBtnText: { fontSize: 13, fontWeight: '700', color: '#fff' },

  incompleteCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: Colors.primaryLight, margin: 16, borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: Colors.primary,
  },
  incompleteTitle: { fontSize: 13, fontWeight: '700', color: Colors.primary },
  incompleteDesc: { fontSize: 11, color: Colors.primary, marginTop: 2 },
  incompleteBtn: { fontSize: 13, fontWeight: '700', color: Colors.primary },

  content: { padding: 16, gap: 12 },
  card: {
    backgroundColor: Colors.white, borderRadius: 18, padding: 18, gap: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
    borderWidth: 1, borderColor: Colors.border,
  },

  profileGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  concernSection: { gap: 8, borderTopWidth: 1, borderTopColor: Colors.border, paddingTop: 10 },
  concernLabel: { fontSize: 12, fontWeight: '700', color: Colors.sub },
  concernRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  concernChip: {
    paddingVertical: 4, paddingHorizontal: 12, borderRadius: 20,
    backgroundColor: Colors.primaryLight, borderWidth: 1, borderColor: Colors.primary,
  },
  concernText: { fontSize: 12, color: Colors.primary, fontWeight: '600' },

  faceHeader: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  faceEmoji: { fontSize: 36 },
  faceType: { fontSize: 18, fontWeight: '900', color: Colors.text },
  faceSubtitle: { fontSize: 12, color: Colors.primary, fontWeight: '600', marginTop: 2 },

  itemLabel: { fontSize: 12, fontWeight: '700', color: Colors.sub, textTransform: 'uppercase', letterSpacing: 0.5 },

  ageNoteBox: {
    backgroundColor: '#FFF8E7', borderRadius: 12, padding: 12, gap: 6,
    borderLeftWidth: 3, borderLeftColor: '#F5A623',
  },
  ageNoteLabel: { fontSize: 13, fontWeight: '700', color: '#C47A00' },
  ageNoteText: { fontSize: 13, color: '#7A5000', lineHeight: 20 },

  ingredientRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  avoidChip: {
    paddingVertical: 4, paddingHorizontal: 10, borderRadius: 20,
    backgroundColor: '#FFF0F0', borderWidth: 1, borderColor: '#FFCDD2',
  },
  avoidChipText: { fontSize: 11, color: '#E74C3C', fontWeight: '600' },
  mustChip: {
    paddingVertical: 4, paddingHorizontal: 10, borderRadius: 20,
    backgroundColor: '#F0FFF4', borderWidth: 1, borderColor: '#A8D5B5',
  },
  mustChipText: { fontSize: 11, color: '#27AE60', fontWeight: '600' },

  treatCategoryHeader: { marginBottom: 4 },
  treatCategoryBadge: {
    alignSelf: 'flex-start', backgroundColor: Colors.primaryLight,
    paddingVertical: 4, paddingHorizontal: 10, borderRadius: 20,
  },
  treatCategoryText: { fontSize: 12, fontWeight: '700', color: Colors.primary },

  deviceRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingVertical: 10 },
  rowBorder: { borderTopWidth: 1, borderTopColor: Colors.border },
  deviceRankBadge: {
    width: 28, height: 28, borderRadius: 14, backgroundColor: Colors.primaryLight,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2,
  },
  deviceRank: { fontSize: 13, fontWeight: '800', color: Colors.primary },
  deviceName: { fontSize: 14, fontWeight: '700', color: Colors.text },
  deviceFocus: { fontSize: 12, color: Colors.primary },
  deviceScheduleChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start',
    backgroundColor: Colors.bg, paddingVertical: 2, paddingHorizontal: 8, borderRadius: 6,
  },
  deviceScheduleText: { fontSize: 11, color: Colors.sub },

  routineTitle: { fontSize: 14, fontWeight: '800', color: Colors.text },

  roadmapContainer: { gap: 0 },
  roadmapRow: { flexDirection: 'row', gap: 16 },
  roadmapTimeline: { alignItems: 'center', width: 44 },
  roadmapDot: {
    width: 44, height: 44, borderRadius: 22,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  roadmapDotEmoji: { fontSize: 20 },
  roadmapLine: { width: 2, flex: 1, backgroundColor: Colors.border, minHeight: 20 },
  roadmapContent: { flex: 1, paddingBottom: 24, paddingTop: 4, gap: 8 },
  roadmapHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  roadmapPhase: { fontSize: 15, fontWeight: '800' },
  roadmapTimeBadge: { paddingVertical: 2, paddingHorizontal: 8, borderRadius: 10 },
  roadmapTimeText: { fontSize: 11, fontWeight: '700' },
  roadmapTask: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  roadmapTaskDot: {
    width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.border, marginTop: 6, flexShrink: 0,
  },
  roadmapTaskText: { flex: 1, fontSize: 13, color: Colors.sub, lineHeight: 20 },

  disclaimer: {
    flexDirection: 'row', gap: 8, alignItems: 'flex-start',
    backgroundColor: Colors.bg, borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: Colors.border,
  },
  disclaimerText: { flex: 1, fontSize: 11, color: Colors.sub, lineHeight: 18 },
});

const sectionStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 4 },
  numBadge: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  num: { fontSize: 12, fontWeight: '900', color: '#fff' },
  title: { fontSize: 16, fontWeight: '900', color: Colors.text },
});

const coverChipStyles = StyleSheet.create({
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingVertical: 6, paddingHorizontal: 12, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)',
  },
  text: { fontSize: 12, fontWeight: '700', color: '#fff' },
});

const piStyles = StyleSheet.create({
  item: {
    flex: 1, minWidth: '44%', backgroundColor: Colors.bg,
    borderRadius: 12, padding: 12, gap: 2,
  },
  label: { fontSize: 11, color: Colors.sub, fontWeight: '600' },
  value: { fontSize: 15, fontWeight: '800', color: Colors.text },
  sub: { fontSize: 10, color: Colors.primary, fontWeight: '600' },
});

const lrStyles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 8, alignItems: 'flex-start', paddingVertical: 4 },
  label: { fontSize: 11, fontWeight: '700', color: Colors.sub, width: 60 },
  value: { flex: 1, fontSize: 13, color: Colors.text, lineHeight: 20 },
});

const bulletStyles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.primary, marginTop: 7, flexShrink: 0 },
  text: { flex: 1, fontSize: 13, color: Colors.sub, lineHeight: 20 },
});

const treatStyles = StyleSheet.create({
  row: {
    flexDirection: 'row', gap: 12, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  rank: {
    width: 28, height: 28, borderRadius: 14, backgroundColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2,
  },
  rankText: { fontSize: 13, fontWeight: '800', color: '#fff' },
  name: { fontSize: 14, fontWeight: '700', color: Colors.text },
  reason: { fontSize: 12, color: Colors.primary, fontWeight: '600', marginTop: 2 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 },
  tag: { fontSize: 11, color: Colors.sub, backgroundColor: Colors.bg, paddingVertical: 2, paddingHorizontal: 8, borderRadius: 6 },
});

const routineStyles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 12, alignItems: 'flex-start', paddingVertical: 6 },
  num: {
    width: 24, height: 24, borderRadius: 12, backgroundColor: Colors.primaryLight,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2,
  },
  numText: { fontSize: 11, fontWeight: '800', color: Colors.primary },
  step: { fontSize: 12, fontWeight: '700', color: Colors.sub },
  product: { fontSize: 13, fontWeight: '600', color: Colors.text, marginTop: 1 },
});

const styleRowStyles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 10, alignItems: 'flex-start', paddingVertical: 4 },
  icon: { fontSize: 18, width: 24, textAlign: 'center' },
  label: { fontSize: 12, fontWeight: '700', color: '#27AE60', marginBottom: 2 },
  text: { fontSize: 13, color: Colors.sub, lineHeight: 20 },
});
