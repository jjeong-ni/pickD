import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  Alert, Platform,
} from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '../hooks/useAuth';
import { Colors } from '../constants/colors';

// ─── 얼굴형 데이터 ───────────────────────────────────────────────────────────

const FACE_DATA: Record<string, {
  emoji: string; subtitle: string; ratio: string;
  concerns: string[];
  treatments: { name: string; duration: string; downtime: string; cost: string }[];
  devices: { name: string; freq: string }[];
  styling: { hair: string; makeup: string; avoid: string };
  ageNote: Record<string, string>;
}> = {
  계란형: {
    emoji: '🥚', subtitle: '황금 기준형',
    ratio: '이마:광대:턱 = 중간:중간:갸름 · 세로:가로 ≈ 1.3~1.5',
    concerns: ['현상 유지 및 노화 예방이 핵심', '볼 처짐·팔자주름·관자놀이 꺼짐 예방', '강한 리프팅보단 볼륨 + 리프팅 동시 관리'],
    treatments: [
      { name: '울쎄라 리프팅', duration: '12~18개월', downtime: '없음', cost: '30~60만원' },
      { name: '실리프팅', duration: '6~12개월', downtime: '1~3일', cost: '50~80만원' },
      { name: '스킨부스터 (리쥬란)', duration: '6개월', downtime: '2~3일', cost: '10~20만원' },
    ],
    devices: [
      { name: '고주파 (RF)', freq: '주 2~3회 / 회당 15~20분' },
      { name: 'LED 적색광', freq: '매일 가능 / 회당 10~15분' },
    ],
    styling: {
      hair: '거의 모든 스타일 소화 가능. 센터·사이드 파팅 모두 잘 어울림',
      makeup: '자연스러운 윤곽 강조. 이마·코끝·턱에 하이라이터로 입체감 연출',
      avoid: '지나친 양쪽 볼륨 헤어 — 가로 비율을 무너뜨릴 수 있어요',
    },
    ageNote: {
      '20대': '예방적 스킨케어 + 가벼운 레이저토닝. 지나친 리프팅은 불필요',
      '30대 초반': '스킨부스터로 예방적 수분 관리. 처짐 징조 보이면 울쎄라 시작',
      '30대 후반': '울쎄라·실리프팅으로 리프팅 본격 관리',
      '40대 이상': '복합 리프팅 + 필러 볼륨 보충. 연간 2회 집중 관리 권장',
    },
  },
  둥근형: {
    emoji: '⭕', subtitle: '볼살 · 짧은 턱선',
    ratio: '가로:세로 ≈ 1:1 (정방형에 가까움) · 턱선 둥글고 짧음',
    concerns: ['세로 길이감을 늘리는 방향 관리', '교근 볼륨 축소로 하안면 슬리밍', '확실한 리프팅 + 지방 분해 시술 추천'],
    treatments: [
      { name: '교근 보톡스', duration: '4~6개월', downtime: '없음', cost: '5~10만원' },
      { name: '턱 필러', duration: '12~18개월', downtime: '1~2일', cost: '15~30만원' },
      { name: 'HIFU 리프팅', duration: '6~12개월', downtime: '없음~1일', cost: '20~50만원' },
    ],
    devices: [
      { name: 'EMS (근육전기자극)', freq: '주 3~5회 / 회당 10~15분' },
      { name: '고주파 (RF)', freq: '주 2~3회 / 회당 15분' },
    ],
    styling: {
      hair: '세로 볼륨 있는 레이어드컷·긴 웨이브. 사이드 가르마 + 앞머리로 이마 일부 커버',
      makeup: '관자놀이~볼 쪽 음영 컨투어링, 턱 아래 하이라이터로 갸름한 인상',
      avoid: '짧은 단발·귀밑 단발, 양쪽 볼륨 헤어 — 가로를 더 강조함',
    },
    ageNote: {
      '20대': '교근 보톡스 시작 추천. 얼굴 슬리밍 + 청결한 피부 관리 병행',
      '30대 초반': '교근 보톡스 정기 관리 + 턱 필러로 V라인 유지',
      '30대 후반': 'HIFU 리프팅 추가. 볼·턱선 타이트닝 집중',
      '40대 이상': '복합 리프팅 + 교근 지속 관리. 볼 슬리밍 효과 유지',
    },
  },
  사각형: {
    emoji: '⬜', subtitle: '강한 각진 턱선',
    ratio: '이마:광대:턱 너비 거의 일정 · 직사각형 실루엣 · 하악각 뚜렷',
    concerns: ['교근 볼륨 축소로 하악각 완화', '볼~광대 리프팅으로 역삼각형 방향 교정', '이마 볼륨으로 위아래 균형 조절'],
    treatments: [
      { name: '교근 보톡스', duration: '4~6개월', downtime: '없음', cost: '7~15만원' },
      { name: '실리프팅', duration: '6~12개월', downtime: '1~3일', cost: '50~80만원' },
      { name: '이마 필러', duration: '12~18개월', downtime: '1~2일', cost: '15~30만원' },
    ],
    devices: [
      { name: 'EMS (근육전기자극)', freq: '주 3회 / 회당 10분 (교근 집중)' },
      { name: '고주파 (RF)', freq: '주 2~3회 / 회당 15분' },
    ],
    styling: {
      hair: '귀 아래까지 내려오는 긴 레이어드. 얼굴 주변 웨이브로 각진 라인 커버',
      makeup: '턱 각 부분에 쉐이딩, 이마 중앙 하이라이터. 립 포인트로 시선 유도',
      avoid: '짧은 박스컷·직선 단발, 귀 뒤로 넘기는 스타일 — 턱선 각이 더 드러남',
    },
    ageNote: {
      '20대': '교근 보톡스가 가장 효과적인 나이. 지속 관리로 근육 점진적 약화',
      '30대 초반': '교근 + 리프팅 병행 시작. 탄력 저하 예방',
      '30대 후반': '교근 + 실리프팅 복합 패키지 권장',
      '40대 이상': '복합 리프팅 + 교근 유지. 이마 필러로 위아래 균형 관리',
    },
  },
  하트형: {
    emoji: '💖', subtitle: '넓은 이마 · 좁은 턱',
    ratio: '이마 > 광대 > 턱 (V자형 감소) · 하안면이 좁고 뾰족한 편',
    concerns: ['하안면(볼·턱)에 볼륨 보충으로 역삼각형 완화', '이마 너비감 시각적으로 축소', '지방 분해보다 볼륨감 있는 리프팅 추천'],
    treatments: [
      { name: '볼·턱 필러', duration: '12~18개월', downtime: '1~2일', cost: '30~60만원' },
      { name: '교근 주변 보톡스', duration: '4~6개월', downtime: '없음', cost: '7~15만원' },
      { name: '실리프팅', duration: '6~12개월', downtime: '1~3일', cost: '50~80만원' },
    ],
    devices: [
      { name: 'EMS (근육전기자극)', freq: '주 3~4회 / 회당 10~15분' },
      { name: '고주파 (RF)', freq: '주 2~3회 / 회당 15분' },
    ],
    styling: {
      hair: '귀 아래까지 오는 단발에 웨이브. 볼 부근 볼륨으로 하안면 풍성하게',
      makeup: '이마 양끝 쉐이딩으로 너비 축소, 볼과 턱 하이라이터로 볼륨감',
      avoid: '이마 전체 드러내는 올백, 짧은 픽시컷 — 이마가 더 넓어 보임',
    },
    ageNote: {
      '20대': '볼·턱 필러 소량으로 균형감. 자연스러운 수정이 목적',
      '30대 초반': '필러 유지 + 리프팅 시작으로 처짐 예방',
      '30대 후반': '실리프팅으로 볼·하안면 리프팅 집중',
      '40대 이상': '볼륨 보충 + 복합 리프팅. 하안면 풍성함 유지',
    },
  },
  긴형: {
    emoji: '🖼️', subtitle: '세로가 긴 얼굴',
    ratio: '가로:세로 ≈ 1:1.6 이상 · 이마 높고 넓음 · 전체적으로 좁고 긴 느낌',
    concerns: ['볼·광대에 볼륨 더해 가로 너비감 형성', '앞머리로 이마 길이 커버가 가장 효과적', '세로를 더 강조하는 스타일 피하기'],
    treatments: [
      { name: '볼·광대 필러', duration: '12~18개월', downtime: '1~2일', cost: '20~40만원' },
      { name: '이마 보톡스', duration: '3~4개월', downtime: '없음', cost: '5~10만원' },
      { name: '실리프팅', duration: '6~12개월', downtime: '1~3일', cost: '50~80만원' },
    ],
    devices: [
      { name: 'EMS (근육전기자극)', freq: '주 3~4회 / 회당 10~15분' },
      { name: '갈바닉 +극 (흡수모드)', freq: '주 2~3회 / 회당 10분' },
    ],
    styling: {
      hair: '가로 볼륨 있는 웨이브, 사이드 가르마. 앞머리가 가장 효과적인 비침습 방법',
      makeup: '이마 상단·턱 끝 쉐이딩, 볼·광대 블러셔로 가로 포인트',
      avoid: '세로 강조 올백, 긴 스트레이트 헤어 — 길이감을 더 강조함',
    },
    ageNote: {
      '20대': '볼 필러 소량으로 가로 볼륨감 형성. 과한 시술은 불필요',
      '30대 초반': '볼·광대 필러 유지 + 리프팅 시작',
      '30대 후반': '실리프팅으로 볼·측면 리프팅 강화',
      '40대 이상': '복합 리프팅 + 필러로 볼륨 유지',
    },
  },
  다이아몬드형: {
    emoji: '💎', subtitle: '도드라진 광대',
    ratio: '광대 > 이마 = 턱 · 마름모꼴 · 이마와 턱이 좁고 광대가 가장 넓음',
    concerns: ['이마 볼륨으로 위아래 균형 개선', '교근 보톡스로 광대 넓어 보임 완화', '볼 하부 볼륨 보충으로 하안면 풍성하게'],
    treatments: [
      { name: '교근 보톡스', duration: '4~6개월', downtime: '없음', cost: '7~15만원' },
      { name: '이마 필러', duration: '12~18개월', downtime: '1~2일', cost: '20~40만원' },
      { name: '볼 하부 필러', duration: '12~18개월', downtime: '1~2일', cost: '20~40만원' },
    ],
    devices: [
      { name: 'EMS (근육전기자극)', freq: '주 3회 / 회당 10분' },
      { name: '고주파 (RF)', freq: '주 2~3회 / 회당 15분' },
    ],
    styling: {
      hair: '광대 부분에 자연스러운 웨이브로 커버. 허쉬컷·페이스라인컷 추천',
      makeup: '광대 아래 음영 쉐이딩, 이마 중앙·볼 하부 하이라이터',
      avoid: '양쪽 귀 뒤로 넘기기, 광대 위치 강한 블러셔 — 더 도드라져 보임',
    },
    ageNote: {
      '20대': '교근 보톡스 시작으로 광대 완화. 이마 볼륨으로 균형',
      '30대 초반': '교근 유지 + 이마·볼 필러 정기 관리',
      '30대 후반': '복합 관리로 전체 밸런스 유지',
      '40대 이상': '볼륨 보충 + 리프팅 병행. 골격 변화 대응',
    },
  },
};

// ─── 피부타입 데이터 ─────────────────────────────────────────────────────────

const SKIN_DATA: Record<string, {
  emoji: string; subtitle: string;
  routine: { step: string; detail: string }[];
}> = {
  지성: {
    emoji: '💦', subtitle: '피지 과다 · 넓은 모공',
    routine: [
      { step: '세안', detail: '약산성 젤 타입 클렌저, 하루 2회 (과세안 금지)' },
      { step: '토너', detail: '나이아신아마이드·BHA 함유 피지 조절 토너' },
      { step: '세럼', detail: '논코메도제닉 히알루론산 수분 세럼' },
      { step: '크림', detail: '오일프리 워터·젤 크림 (소량)' },
      { step: '선크림', detail: '가벼운 워터 선크림 SPF 30~50' },
    ],
  },
  건성: {
    emoji: '🌵', subtitle: '수분·유분 부족',
    routine: [
      { step: '세안', detail: '저자극 크림·밀크 타입 클렌저, 미온수 사용' },
      { step: '토너', detail: '히알루론산·세라마이드 수분 토너 레이어링 권장' },
      { step: '세럼', detail: '고농도 히알루론산·판테놀·나이아신아마이드 세럼' },
      { step: '크림', detail: '세라마이드·스쿠알란 함유 리치 크림. 세안 3분 내 도포' },
      { step: '선크림', detail: '보습력 있는 크림 선크림 SPF 30+' },
    ],
  },
  중성: {
    emoji: '✨', subtitle: '이상적인 균형 피부',
    routine: [
      { step: '세안', detail: '순한 폼 클렌저, 하루 2회' },
      { step: '세럼', detail: '항산화(비타민C) 세럼으로 노화 예방' },
      { step: '보습', detail: '가벼운 에멀전 또는 워터크림' },
      { step: '선크림', detail: 'SPF 30~50 자외선 차단 필수' },
    ],
  },
  복합성: {
    emoji: '🔀', subtitle: 'T존 지성 · U존 건성',
    routine: [
      { step: '세안', detail: '약산성 젤 클렌저 (T존 중심 세안 후 U존은 부드럽게)' },
      { step: '토너', detail: '수분 밸런싱 토너 후, T존에 피지 조절 토너 추가' },
      { step: '세럼', detail: 'T존 나이아신아마이드 / U존 히알루론산 부위별 도포' },
      { step: '크림', detail: 'T존 가벼운 젤 크림 / U존 리치 크림' },
      { step: '선크림', detail: '매트 선크림 (T존 번들거림 방지)' },
    ],
  },
  민감성: {
    emoji: '🌸', subtitle: '자극에 민감한 피부',
    routine: [
      { step: '세안', detail: '무향·무알코올 마일드 클렌저, 30초 이내 세안' },
      { step: '토너', detail: '병풀·판테놀 함유 진정 토너' },
      { step: '세럼', detail: '시카·세라마이드·마데카소사이드 진정 세럼' },
      { step: '크림', detail: '무향 하이포알러제닉 보습 크림' },
      { step: '선크림', detail: '물리적 자외선 차단제 (산화아연·이산화티타늄)' },
    ],
  },
};

// ─── 연령대별 코멘트 (얼굴형+피부타입 조합) ─────────────────────────────────

function getAgeComment(faceShape: string | null, skinType: string | null, ageGroup: string | null): string {
  if (!ageGroup) return '';
  const age = ageGroup.includes('20대') ? '20대' : ageGroup.includes('30대') ? (ageGroup.includes('초반') ? '30대 초반' : '30대 후반') : '40대 이상';
  if (faceShape && FACE_DATA[faceShape]?.ageNote[age]) {
    return FACE_DATA[faceShape].ageNote[age];
  }
  const defaults: Record<string, string> = {
    '20대': '피지·트러블 관리와 자외선 차단이 핵심. 피부 기초를 탄탄히 다지는 시기예요.',
    '30대 초반': '탄력 저하가 시작됩니다. 예방적 스킨부스터·보톡스 관리를 시작하세요.',
    '30대 후반': '처짐·팔자주름·모공 악화. 본격적인 리프팅 관리가 필요해요.',
    '40대 이상': '전층 볼륨 감소와 깊은 주름. 복합적인 리프팅+볼륨 관리가 핵심이에요.',
  };
  return defaults[age] ?? '';
}

// ─── Baumann 코드 축 라벨 ────────────────────────────────────────────────────

const AXIS_LABELS: Record<string, string> = {
  D: 'Dry (건성)',     O: 'Oily (지성)',
  S: 'Sensitive (민감)', R: 'Resistant (저항)',
  P: 'Pigmented (색소)', N: 'Non-Pigmented (비색소)',
  W: 'Wrinkle (주름)',  T: 'Tight (탄력)',
};

// 6대 지표 설정
const METRIC_CONFIG: Record<string, { emoji: string; color: string; goodLabel: string; badLabel: string }> = {
  모공:      { emoji: '⬜', color: '#3498DB', goodLabel: '모공 정상', badLabel: '모공 확장' },
  주름:      { emoji: '〰️', color: '#9B59B6', goodLabel: '주름 없음', badLabel: '주름 뚜렷' },
  색소침착:  { emoji: '🟤', color: '#C0392B', goodLabel: '색소 없음', badLabel: '색소침착' },
  UV색소침착:{ emoji: '☀️', color: '#E67E22', goodLabel: 'UV 안전',  badLabel: 'UV 흔적' },
  탄력:      { emoji: '💪', color: Colors.primary, goodLabel: '탄력 양호', badLabel: '탄력 저하' },
  피부톤:    { emoji: '🔴', color: '#E74C3C', goodLabel: '피부톤 균일', badLabel: '홍조·불균일' },
};

// ─── 메인 컴포넌트 ──────────────────────────────────────────────────────────

export default function AnalysisReportScreen() {
  const { user, profile } = useAuth();

  const faceShape = profile?.face_shape ?? null;
  const skinType = profile?.skin_type ?? null;
  const ageGroup = profile?.age_group ?? null;
  const baumannCode = profile?.baumann_code ?? null;
  const skinMetrics = profile?.skin_metrics ?? null;
  const skinDehydration = profile?.skin_dehydration ?? false;

  const faceInfo = faceShape ? FACE_DATA[faceShape] : null;
  const skinInfo = skinType ? SKIN_DATA[skinType] : null;
  const ageComment = getAgeComment(faceShape, skinType, ageGroup);

  const handleDownload = () => {
    if (Platform.OS === 'web') {
      try {
        (window as any).print();
      } catch {
        Alert.alert('저장 안내', '브라우저 메뉴 → 인쇄 → PDF로 저장을 선택해주세요.');
      }
    } else {
      Alert.alert('저장', '스크린샷을 찍어 이미지로 저장할 수 있어요.');
    }
  };

  const hasData = !!(faceInfo || skinInfo);

  return (
    <View style={styles.container}>
      {/* 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.back}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>피부 분석 리포트</Text>
        <TouchableOpacity onPress={handleDownload}>
          <Text style={styles.downloadBtn}>저장 📥</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 48 }} showsVerticalScrollIndicator={false}>

        {/* 오픈 특가 배너 */}
        <View style={styles.saleBanner}>
          <View style={styles.salePriceRow}>
            <Text style={styles.saleOriginal}>₩990</Text>
            <View style={styles.saleBadge}><Text style={styles.saleBadgeText}>오픈 특가</Text></View>
          </View>
          <Text style={styles.salePrice}>0원 무료 제공 중</Text>
          <Text style={styles.saleNote}>베타테스트 기간 동안 전체 리포트를 무료로 드려요 🎁</Text>
        </View>

        {/* 프로필 없을 때 */}
        {!hasData ? (
          <View style={styles.noProfile}>
            <Text style={{ fontSize: 48 }}>📋</Text>
            <Text style={styles.noProfileTitle}>분석 결과가 없어요</Text>
            <Text style={styles.noProfileDesc}>얼굴형 또는 피부타입 진단을 먼저 완료해주세요</Text>
            <TouchableOpacity style={styles.doAnalysisBtn} onPress={() => router.push('/face-analysis' as any)}>
              <Text style={styles.doAnalysisBtnText}>얼굴형 분석 시작</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.doAnalysisBtn, { backgroundColor: Colors.bg, marginTop: 8 }]} onPress={() => router.push('/skin-analysis' as any)}>
              <Text style={[styles.doAnalysisBtnText, { color: Colors.primary }]}>피부타입 분석 시작</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {/* ── 리포트 헤더 카드 ── */}
            <View style={styles.reportHeader}>
              <Text style={styles.reportName}>{profile?.nickname ?? '내'}님의 맞춤 리포트</Text>
              <View style={styles.reportTypes}>
                {faceInfo && (
                  <View style={styles.reportTypePill}>
                    <Text style={styles.reportTypeEmoji}>{faceInfo.emoji}</Text>
                    <Text style={styles.reportTypeLabel}>{faceShape}</Text>
                  </View>
                )}
                {skinInfo && (
                  <View style={[styles.reportTypePill, { backgroundColor: '#F0F8FF' }]}>
                    <Text style={styles.reportTypeEmoji}>{skinInfo.emoji}</Text>
                    <Text style={[styles.reportTypeLabel, { color: '#1565C0' }]}>{skinType}</Text>
                  </View>
                )}
                {baumannCode && (
                  <View style={[styles.reportTypePill, { backgroundColor: '#F3EFFF' }]}>
                    <Text style={[styles.reportTypeLabel, { color: Colors.purple, fontWeight: '900', letterSpacing: 1 }]}>
                      {baumannCode}
                    </Text>
                  </View>
                )}
                {skinDehydration && (
                  <View style={[styles.reportTypePill, { backgroundColor: '#E8F4FF' }]}>
                    <Text style={[styles.reportTypeLabel, { color: '#1565C0' }]}>💧 속건조</Text>
                  </View>
                )}
                {ageGroup && (
                  <View style={[styles.reportTypePill, { backgroundColor: '#F0FFF4' }]}>
                    <Text style={[styles.reportTypeLabel, { color: Colors.success }]}>{ageGroup}</Text>
                  </View>
                )}
              </View>
            </View>

            {/* ── PART 1. 얼굴형 분석 ── */}
            {faceInfo && (
              <>
                <SectionTitle num="01" title="얼굴형 분석" />

                <View style={styles.card}>
                  <View style={styles.typeRow}>
                    <Text style={{ fontSize: 40 }}>{faceInfo.emoji}</Text>
                    <View style={{ flex: 1, gap: 4 }}>
                      <Text style={styles.typeName}>{faceShape} · {faceInfo.subtitle}</Text>
                      <Text style={styles.typeRatio}>📐 {faceInfo.ratio}</Text>
                    </View>
                  </View>
                </View>

                <View style={styles.card}>
                  <Text style={styles.cardTitle}>💡 보완 포인트</Text>
                  {faceInfo.concerns.map((c, i) => (
                    <BulletRow key={i} text={c} />
                  ))}
                </View>

                <View style={styles.card}>
                  <Text style={styles.cardTitle}>💉 추천 시술 TOP 3</Text>
                  {faceInfo.treatments.map((t, i) => (
                    <View key={i} style={[styles.treatRow, i < faceInfo.treatments.length - 1 && styles.treatBorder]}>
                      <View style={styles.treatNum}><Text style={styles.treatNumText}>{i + 1}</Text></View>
                      <View style={{ flex: 1, gap: 4 }}>
                        <Text style={styles.treatName}>{t.name}</Text>
                        <View style={styles.treatTags}>
                          <Tag text={`⏱ ${t.duration}`} />
                          <Tag text={`🌿 다운타임 ${t.downtime}`} />
                          <Tag text={`💰 ${t.cost}`} color={Colors.primary} />
                        </View>
                      </View>
                    </View>
                  ))}
                </View>

                <View style={styles.card}>
                  <Text style={styles.cardTitle}>🏠 추천 홈케어 디바이스</Text>
                  {faceInfo.devices.map((d, i) => (
                    <View key={i} style={[styles.deviceRow, i < faceInfo.devices.length - 1 && styles.deviceBorder]}>
                      <Text style={styles.deviceName}>{d.name}</Text>
                      <Text style={styles.deviceFreq}>{d.freq}</Text>
                    </View>
                  ))}
                </View>

                <View style={styles.card}>
                  <Text style={styles.cardTitle}>💇 스타일링 가이드</Text>
                  <StyleRow icon="👩‍🦰" label="헤어" text={faceInfo.styling.hair} />
                  <StyleRow icon="💄" label="메이크업" text={faceInfo.styling.makeup} />
                  <StyleRow icon="⚠️" label="주의" text={faceInfo.styling.avoid} warn />
                </View>
              </>
            )}

            {/* ── PART 2. 피부타입 분석 ── */}
            {skinInfo && (
              <>
                <SectionTitle num="02" title="피부타입 분석" />

                <View style={styles.card}>
                  <View style={styles.typeRow}>
                    <Text style={{ fontSize: 40 }}>{skinInfo.emoji}</Text>
                    <View style={{ flex: 1, gap: 4 }}>
                      <Text style={styles.typeName}>{skinType} · {skinInfo.subtitle}</Text>
                      {baumannCode && (
                        <View style={styles.baumannBadge}>
                          <Text style={styles.baumannBadgeText}>{baumannCode}</Text>
                          {skinDehydration && (
                            <View style={styles.dehydBadge}>
                              <Text style={styles.dehydBadgeText}>💧 속건조</Text>
                            </View>
                          )}
                        </View>
                      )}
                    </View>
                  </View>
                </View>

                {/* Baumann 4축 분류 */}
                {baumannCode && baumannCode.length === 4 && (
                  <View style={styles.card}>
                    <Text style={styles.cardTitle}>🧬 Baumann 피부타입 4축 분류</Text>
                    <Text style={styles.cardSubNote}>세계적으로 검증된 Leslie Baumann 피부 분류 시스템</Text>
                    {([
                      { char: baumannCode[0], label: '유분·수분' },
                      { char: baumannCode[1], label: '민감도' },
                      { char: baumannCode[2], label: '색소침착' },
                      { char: baumannCode[3], label: '탄력·주름' },
                    ] as { char: string; label: string }[]).map(({ char, label }) => (
                      <View key={label} style={styles.axisRow}>
                        <Text style={styles.axisLabel}>{label}</Text>
                        <View style={styles.axisBadge}>
                          <Text style={styles.axisBadgeChar}>{char}</Text>
                          <Text style={styles.axisBadgeDesc}>{AXIS_LABELS[char] ?? char}</Text>
                        </View>
                      </View>
                    ))}
                  </View>
                )}

                {/* 6대 피부 지표 */}
                {skinMetrics && (
                  <View style={styles.card}>
                    <Text style={styles.cardTitle}>📊 6대 피부 지표 분석</Text>
                    <Text style={styles.cardSubNote}>퀴즈 답변 기반 추정치 (높을수록 해당 문제 심각)</Text>
                    {(Object.entries(skinMetrics) as [string, number][]).map(([key, value]) => {
                      const cfg = METRIC_CONFIG[key];
                      if (!cfg) return null;
                      const level = value >= 70 ? '주의' : value >= 40 ? '보통' : '양호';
                      const levelColor = value >= 70 ? Colors.danger : value >= 40 ? '#E67E22' : Colors.success;
                      return (
                        <View key={key} style={styles.metricRow}>
                          <View style={styles.metricHeader}>
                            <Text style={styles.metricLabel}>{cfg.emoji} {key}</Text>
                            <View style={[styles.metricLevelBadge, { backgroundColor: `${levelColor}18` }]}>
                              <Text style={[styles.metricLevelText, { color: levelColor }]}>{level} {value}점</Text>
                            </View>
                          </View>
                          <View style={styles.metricBarBg}>
                            <View style={[styles.metricBarFill, {
                              width: `${value}%` as any,
                              backgroundColor: cfg.color,
                            }]} />
                          </View>
                          <View style={styles.metricFooter}>
                            <Text style={styles.metricGoodLabel}>{cfg.goodLabel}</Text>
                            <Text style={styles.metricBadLabel}>{cfg.badLabel}</Text>
                          </View>
                        </View>
                      );
                    })}
                  </View>
                )}

                <View style={styles.card}>
                  <Text style={styles.cardTitle}>🧴 맞춤 스킨케어 루틴</Text>
                  {skinInfo.routine.map((r, i) => (
                    <View key={i} style={styles.routineRow}>
                      <View style={styles.routineStep}><Text style={styles.routineStepText}>{i + 1}</Text></View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.routineLabel}>{r.step}</Text>
                        <Text style={styles.routineDetail}>{r.detail}</Text>
                      </View>
                    </View>
                  ))}
                </View>
              </>
            )}

            {/* ── PART 3. 연령대별 코멘트 ── */}
            {ageComment ? (
              <>
                <SectionTitle num="03" title="연령 맞춤 코멘트" />
                <View style={styles.ageCard}>
                  <Text style={styles.ageGroup}>{ageGroup}</Text>
                  <Text style={styles.ageComment}>{ageComment}</Text>
                </View>
              </>
            ) : null}

            {/* ── 재진단 안내 ── */}
            <View style={styles.redoCard}>
              <Text style={styles.redoTitle}>🔄 정기 재진단 권장</Text>
              <Text style={styles.redoDesc}>피부타입은 계절·나이에 따라 변할 수 있어요. 분기별로 재진단을 권장해요.</Text>
              <View style={styles.redoBtns}>
                <TouchableOpacity style={styles.redoBtn} onPress={() => router.push('/face-analysis' as any)}>
                  <Text style={styles.redoBtnText}>얼굴형 재진단</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.redoBtn} onPress={() => router.push('/skin-analysis' as any)}>
                  <Text style={styles.redoBtnText}>피부타입 재진단</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* 저장 버튼 */}
            <TouchableOpacity style={styles.saveBtn} onPress={handleDownload}>
              <Text style={styles.saveBtnText}>📥 PDF / 이미지로 저장하기</Text>
            </TouchableOpacity>
            <Text style={styles.saveNote}>브라우저 인쇄 → PDF 저장 또는 스크린샷으로 저장하세요</Text>

            <View style={styles.disclaimer}>
              <Text style={styles.disclaimerText}>
                ※ 본 리포트는 BeautyAI 가이드 기반의 뷰티 정보이며 의학적 진단이 아닙니다.{'\n'}
                시술 비용은 지역·클리닉·범위에 따라 상이할 수 있습니다.
              </Text>
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

// ─── 서브 컴포넌트 ──────────────────────────────────────────────────────────

function SectionTitle({ num, title }: { num: string; title: string }) {
  return (
    <View style={styles.sectionTitleRow}>
      <Text style={styles.sectionNum}>{num}</Text>
      <Text style={styles.sectionTitleText}>{title}</Text>
    </View>
  );
}

function BulletRow({ text }: { text: string }) {
  return (
    <View style={{ flexDirection: 'row', gap: 8, marginTop: 6 }}>
      <Text style={{ color: Colors.primary, fontSize: 14, marginTop: 1 }}>•</Text>
      <Text style={{ flex: 1, fontSize: 13, color: Colors.text, lineHeight: 20 }}>{text}</Text>
    </View>
  );
}

function Tag({ text, color }: { text: string; color?: string }) {
  return (
    <View style={[styles.tag, color ? { backgroundColor: `${color}15` } : {}]}>
      <Text style={[styles.tagText, color ? { color } : {}]}>{text}</Text>
    </View>
  );
}

function StyleRow({ icon, label, text, warn }: { icon: string; label: string; text: string; warn?: boolean }) {
  return (
    <View style={styles.styleRow}>
      <Text style={{ width: 24, fontSize: 14 }}>{icon}</Text>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={[styles.styleLabel, warn && { color: Colors.danger }]}>{label}</Text>
        <Text style={styles.styleText}>{text}</Text>
      </View>
    </View>
  );
}

// ─── StyleSheet ─────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: 56, paddingHorizontal: 16, paddingBottom: 12,
    backgroundColor: Colors.white, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  back: { fontSize: 24, color: Colors.text, width: 32 },
  title: { fontSize: 17, fontWeight: '700', color: Colors.text },
  downloadBtn: { fontSize: 14, color: Colors.primary, fontWeight: '700' },

  saleBanner: {
    backgroundColor: Colors.primary, padding: 20, gap: 4,
  },
  salePriceRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  saleOriginal: { fontSize: 16, color: 'rgba(255,255,255,0.6)', textDecorationLine: 'line-through' },
  saleBadge: {
    backgroundColor: '#FF3B7F', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3,
  },
  saleBadgeText: { fontSize: 11, fontWeight: '800', color: Colors.white },
  salePrice: { fontSize: 28, fontWeight: '900', color: Colors.white, letterSpacing: -1 },
  saleNote: { fontSize: 13, color: 'rgba(255,255,255,0.85)', lineHeight: 20 },

  noProfile: { alignItems: 'center', padding: 40, gap: 12 },
  noProfileTitle: { fontSize: 18, fontWeight: '700', color: Colors.text },
  noProfileDesc: { fontSize: 14, color: Colors.sub, textAlign: 'center' },
  doAnalysisBtn: {
    backgroundColor: Colors.primary, borderRadius: 12,
    paddingVertical: 14, paddingHorizontal: 28,
  },
  doAnalysisBtnText: { fontSize: 15, fontWeight: '700', color: Colors.white },

  reportHeader: {
    backgroundColor: Colors.white, padding: 20, gap: 12,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  reportName: { fontSize: 17, fontWeight: '700', color: Colors.text },
  reportTypes: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  reportTypePill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#FFF0F5', borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 6,
  },
  reportTypeEmoji: { fontSize: 16 },
  reportTypeLabel: { fontSize: 13, fontWeight: '700', color: Colors.primary },

  sectionTitleRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 20, paddingTop: 20, paddingBottom: 8,
  },
  sectionNum: {
    fontSize: 11, fontWeight: '800', color: Colors.white,
    backgroundColor: Colors.primary, borderRadius: 10,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  sectionTitleText: { fontSize: 16, fontWeight: '800', color: Colors.text },

  card: {
    backgroundColor: Colors.white, marginHorizontal: 16, marginBottom: 10,
    borderRadius: 16, padding: 18, gap: 10,
  },
  cardTitle: { fontSize: 14, fontWeight: '700', color: Colors.text },

  typeRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  typeName: { fontSize: 17, fontWeight: '700', color: Colors.text },
  typeRatio: { fontSize: 12, color: Colors.sub, lineHeight: 18 },

  treatRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingBottom: 10 },
  treatBorder: { borderBottomWidth: 1, borderBottomColor: Colors.border },
  treatNum: {
    width: 22, height: 22, borderRadius: 11, backgroundColor: Colors.primaryLight,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2,
  },
  treatNumText: { fontSize: 11, fontWeight: '800', color: Colors.primary },
  treatName: { fontSize: 14, fontWeight: '600', color: Colors.text },
  treatTags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  tag: {
    backgroundColor: Colors.bg, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3,
  },
  tagText: { fontSize: 11, color: Colors.sub, fontWeight: '500' },

  deviceRow: { paddingBottom: 10, gap: 2 },
  deviceBorder: { borderBottomWidth: 1, borderBottomColor: Colors.border, marginBottom: 2 },
  deviceName: { fontSize: 14, fontWeight: '600', color: Colors.text },
  deviceFreq: { fontSize: 12, color: Colors.sub },

  styleRow: { flexDirection: 'row', gap: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: Colors.border },
  styleLabel: { fontSize: 12, fontWeight: '700', color: Colors.sub, marginBottom: 2 },
  styleText: { fontSize: 13, color: Colors.text, lineHeight: 19 },

  routineRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingTop: 8 },
  routineStep: {
    width: 22, height: 22, borderRadius: 11, backgroundColor: Colors.primaryLight,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1,
  },
  routineStepText: { fontSize: 11, fontWeight: '800', color: Colors.primary },
  routineLabel: { fontSize: 13, fontWeight: '700', color: Colors.text, marginBottom: 2 },
  routineDetail: { fontSize: 12, color: Colors.sub, lineHeight: 18 },

  ageCard: {
    backgroundColor: '#FFF8E1', marginHorizontal: 16, marginBottom: 10,
    borderRadius: 16, padding: 18, gap: 8,
  },
  ageGroup: { fontSize: 12, fontWeight: '700', color: '#F57F17' },
  ageComment: { fontSize: 14, color: '#E65100', lineHeight: 22 },

  redoCard: {
    backgroundColor: Colors.white, marginHorizontal: 16, marginBottom: 16,
    borderRadius: 16, padding: 18, gap: 12,
  },
  redoTitle: { fontSize: 14, fontWeight: '700', color: Colors.text },
  redoDesc: { fontSize: 13, color: Colors.sub, lineHeight: 20 },
  redoBtns: { flexDirection: 'row', gap: 10 },
  redoBtn: {
    flex: 1, borderWidth: 1.5, borderColor: Colors.primary, borderRadius: 10,
    paddingVertical: 10, alignItems: 'center',
  },
  redoBtnText: { fontSize: 13, fontWeight: '700', color: Colors.primary },

  saveBtn: {
    backgroundColor: Colors.primary, marginHorizontal: 16, marginBottom: 8,
    borderRadius: 14, paddingVertical: 16, alignItems: 'center',
  },
  saveBtnText: { fontSize: 15, fontWeight: '700', color: Colors.white },
  saveNote: { textAlign: 'center', fontSize: 12, color: Colors.sub, marginBottom: 12 },

  disclaimer: {
    margin: 16, padding: 14,
    backgroundColor: Colors.bg, borderRadius: 10,
  },
  disclaimerText: { fontSize: 11, color: Colors.sub, lineHeight: 18 },

  // Baumann
  baumannBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  baumannBadgeText: {
    fontSize: 16, fontWeight: '900', color: Colors.purple,
    backgroundColor: '#F3EFFF', borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 3, letterSpacing: 2,
  },
  dehydBadge: {
    backgroundColor: '#E8F4FF', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3,
  },
  dehydBadgeText: { fontSize: 11, color: '#1565C0', fontWeight: '600' },
  cardSubNote: { fontSize: 11, color: Colors.sub, marginBottom: 6 },
  axisRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  axisLabel: { fontSize: 13, color: Colors.sub, fontWeight: '600' },
  axisBadge: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  axisBadgeChar: {
    fontSize: 16, fontWeight: '900', color: Colors.white,
    backgroundColor: Colors.purple, width: 28, height: 28, borderRadius: 14,
    textAlign: 'center', lineHeight: 28,
  },
  axisBadgeDesc: { fontSize: 12, color: Colors.text, fontWeight: '600' },

  // 6대 지표
  metricRow: { marginTop: 12 },
  metricHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  metricLabel: { fontSize: 13, fontWeight: '600', color: Colors.text },
  metricLevelBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2 },
  metricLevelText: { fontSize: 11, fontWeight: '700' },
  metricBarBg: {
    height: 10, backgroundColor: Colors.border, borderRadius: 5, overflow: 'hidden',
  },
  metricBarFill: { height: '100%', borderRadius: 5 },
  metricFooter: {
    flexDirection: 'row', justifyContent: 'space-between', marginTop: 3,
  },
  metricGoodLabel: { fontSize: 10, color: Colors.success },
  metricBadLabel: { fontSize: 10, color: Colors.danger },
});
