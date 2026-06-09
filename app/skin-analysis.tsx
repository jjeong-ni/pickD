/**
 * skin-analysis.tsx
 * Baumann Skin Type 기반 피부타입 분석 (8문항)
 * 참고: Focuskin 피부 분석 결과 리포트 (D/O·S/R·P/N·W/T 4축)
 */
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  ActivityIndicator, Alert, Dimensions,
} from 'react-native';
import { useState, useEffect } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { Colors, HEADER_TOP } from '../constants/colors';

// ───────────────────────────────────────────────
// 타입 정의
// ───────────────────────────────────────────────
type SkinType = '지성' | '건성' | '중성' | '복합성';
type AxisD = 'D' | 'O'; // Dry / Oily
type AxisS = 'S' | 'R'; // Sensitive / Resistant
type AxisP = 'P' | 'N'; // Pigmented / Non-Pigmented
type AxisW = 'W' | 'T'; // Wrinkle-prone / Tight

interface SkinResult {
  type: SkinType;
  code: string;         // e.g. "DRNT"
  axisD: AxisD;
  axisS: AxisS;
  axisP: AxisP;
  axisW: AxisW;
  dehydration: boolean;
  // 6대 피부 지표 점수 (0~100)
  metrics: {
    모공: number;
    주름: number;
    색소침착: number;
    UV색소침착: number;
    탄력: number;
    피부톤: number;
  };
}

// ───────────────────────────────────────────────
// 8문항 퀴즈 (2문항 × 4축)
// ───────────────────────────────────────────────
interface ScoreMap { [key: string]: number }
interface Question {
  q: string;
  hint: string;
  section: string;
  options: { label: string; scores: ScoreMap }[];
}

const QUESTIONS: Question[] = [
  // ── Section 1: D/O (유분·수분 타입) ──
  {
    section: '유분·수분 타입',
    q: '세안 후 아무것도 바르지 않으면?',
    hint: '세안 후 5~10분, 보습 없이 두었을 때의 느낌이에요',
    options: [
      { label: '심하게 당기고 건조해요', scores: { D: 3 } },
      { label: 'T존은 괜찮지만 볼이 당겨요', scores: { D: 1, combo: 2 } },
      { label: '편안하고 불편함 없어요', scores: { neutral: 2 } },
      { label: '이마·코가 금방 번들거려요', scores: { O: 2, combo: 1 } },
      { label: '전체적으로 번들거려요', scores: { O: 3 } },
    ],
  },
  {
    section: '유분·수분 타입',
    q: '오후에 피지 조절 없이 두면?',
    hint: '오전 스킨케어 후 오후 2~3시경 피부 상태예요',
    options: [
      { label: '하루 종일 건조·각질이 생겨요', scores: { D: 3 } },
      { label: 'T존만 번들거리고 볼은 건조해요', scores: { combo: 3 } },
      { label: '거의 변화가 없어요', scores: { neutral: 2 } },
      { label: '전체적으로 번들거려요', scores: { O: 3 } },
    ],
  },
  // ── Section 2: S/R (민감도) ──
  {
    section: '민감도',
    q: '새 화장품·음식·환경 변화 시 피부는?',
    hint: '새로운 제품이나 환경(온도·습도 변화)에 노출될 때의 반응이에요',
    options: [
      { label: '자주 트러블·홍조·가려움이 생겨요', scores: { S: 3 } },
      { label: '가끔 반응하는 편이에요', scores: { S: 1 } },
      { label: '거의 반응하지 않아요', scores: { R: 2 } },
    ],
  },
  {
    section: '민감도',
    q: '자외선·미세먼지·운동 후 피부가?',
    hint: '외부 자극 이후 피부 반응이에요',
    options: [
      { label: '쉽게 빨개지거나 따끔거려요', scores: { S: 3 } },
      { label: '약간 반응했다가 금방 가라앉아요', scores: { S: 1 } },
      { label: '별 반응이 없어요', scores: { R: 2 } },
    ],
  },
  // ── Section 3: P/N (색소침착 경향) ──
  {
    section: '색소침착',
    q: '여드름·상처가 나은 후 자국이?',
    hint: '일반적인 피부 회복 후 색소 변화 양상이에요',
    options: [
      { label: '갈색·어두운 자국이 오래 남아요', scores: { P: 3 } },
      { label: '자국이 생기지만 1~2달 내 사라져요', scores: { P: 1 } },
      { label: '자국이 거의 남지 않아요', scores: { N: 2 } },
    ],
  },
  {
    section: '색소침착',
    q: '햇빛에 노출되면?',
    hint: '장시간 햇빛을 받은 후 피부 반응이에요',
    options: [
      { label: '기미·주근깨·색소침착이 잘 생겨요', scores: { P: 3 } },
      { label: '약간 생기는 편이에요', scores: { P: 1 } },
      { label: '거의 생기지 않아요', scores: { N: 2 } },
    ],
  },
  // ── Section 4: W/T (주름·탄력) ──
  {
    section: '탄력·주름',
    q: '현재 피부 탄력 상태는?',
    hint: '볼·턱선을 살짝 당겼다 놓을 때의 탄력 느낌이에요',
    options: [
      { label: '처짐이 뚜렷하게 느껴져요', scores: { W: 3 } },
      { label: '약간 처진 것 같아요', scores: { W: 1 } },
      { label: '탄력이 유지되는 편이에요', scores: { T: 2 } },
    ],
  },
  {
    section: '탄력·주름',
    q: '눈가·입가 잔주름은?',
    hint: '웃거나 표정을 지을 때 잔주름 상태예요',
    options: [
      { label: '뚜렷하게 있어요', scores: { W: 3 } },
      { label: '조금 있는 것 같아요', scores: { W: 1 } },
      { label: '거의 없어요', scores: { T: 2 } },
    ],
  },
];

// ───────────────────────────────────────────────
// 결과 계산
// ───────────────────────────────────────────────
function calcResult(answers: (number | null)[]): SkinResult {
  let D = 0, O = 0, combo = 0, neutral = 0;
  let S = 0, R = 0;
  let P = 0, N = 0;
  let W = 0, T = 0;

  answers.forEach((ans, qi) => {
    if (ans === null) return;
    const scores = QUESTIONS[qi].options[ans].scores;
    D += scores.D ?? 0;
    O += scores.O ?? 0;
    combo += scores.combo ?? 0;
    neutral += scores.neutral ?? 0;
    S += scores.S ?? 0;
    R += scores.R ?? 0;
    P += scores.P ?? 0;
    N += scores.N ?? 0;
    W += scores.W ?? 0;
    T += scores.T ?? 0;
  });

  // 축별 결정
  const axisD: AxisD = D >= O ? 'D' : 'O';
  const axisS: AxisS = S > R ? 'S' : 'R';
  const axisP: AxisP = P > N ? 'P' : 'N';
  const axisW: AxisW = W > T ? 'W' : 'T';
  const code = `${axisD}${axisS}${axisP}${axisW}`;

  // 한국식 피부 타입 매핑
  let type: SkinType;
  if (combo >= 3) type = '복합성';
  else if (neutral >= 2 && D <= 1 && O <= 1) type = '중성';
  else if (D > O) type = '건성';
  else type = '지성';

  // 속건조: 지성/복합인데 D점수도 있으면
  const dehydration = (type === '지성' || type === '복합성') && D >= 1;

  // 6대 지표 추정 점수 (0=좋음, 100=나쁨)
  const metrics = calcMetrics({ type, axisS, axisP, axisW, O, D, S, W });

  return { type, code, axisD, axisS, axisP, axisW, dehydration, metrics };
}

function calcMetrics(p: {
  type: SkinType; axisS: AxisS; axisP: AxisP; axisW: AxisW;
  O: number; D: number; S: number; W: number;
}): SkinResult['metrics'] {
  // 각 타입별 기준값 + 서브타입 보정
  const base = {
    지성:   { 모공: 65, 주름: 25, 색소침착: 35, UV색소침착: 30, 탄력: 40, 피부톤: 50 },
    건성:   { 모공: 20, 주름: 55, 색소침착: 35, UV색소침착: 30, 탄력: 55, 피부톤: 30 },
    중성:   { 모공: 30, 주름: 25, 색소침착: 25, UV색소침착: 20, 탄력: 30, 피부톤: 25 },
    복합성: { 모공: 50, 주름: 35, 색소침착: 35, UV색소침착: 30, 탄력: 40, 피부톤: 40 },
  }[p.type];

  // 서브 타입 보정
  const s = { ...base };
  if (p.axisS === 'S') { s.피부톤 += 15; s.색소침착 += 5; }
  if (p.axisP === 'P') { s.색소침착 += 20; s.UV색소침착 += 20; }
  if (p.axisW === 'W') { s.주름 += 20; s.탄력 += 20; }

  // 0~100 clamp
  const clamp = (v: number) => Math.min(100, Math.max(0, v));
  return {
    모공: clamp(s.모공),
    주름: clamp(s.주름),
    색소침착: clamp(s.색소침착),
    UV색소침착: clamp(s.UV색소침착),
    탄력: clamp(s.탄력),
    피부톤: clamp(s.피부톤),
  };
}

// ───────────────────────────────────────────────
// 결과 콘텐츠 데이터
// ───────────────────────────────────────────────
const RESULTS: Record<SkinType, {
  emoji: string;
  subtitle: string;
  desc: string;
  baumannNote: string;
  chars: string[];
  metricNote: Record<string, string>; // 지표별 한 줄 코멘트
  treatments: { name: string; interval: string; downtime: string; effect: string }[];
  devices: { name: string; freq: string; focus: string }[];
  routine: { step: string; product: string; tip: string }[];
}> = {
  지성: {
    emoji: '💦',
    subtitle: '피지 과다 · 모공 넓음',
    desc: '피지 분비가 활발해 번들거림과 모공 확장이 나타나는 타입이에요. 세심한 클렌징과 피지 조절 관리가 핵심이에요.',
    baumannNote: 'O(Oily)형: 피지선 과활성 → 모공·여드름 집중 관리',
    chars: [
      '세안 후에도 빠르게 유분감이 올라옴',
      '모공 확장 — 블랙헤드·화이트헤드 발생 잦음',
      '여드름·뾰루지 빈도 높음',
      '화장 유지력이 떨어지고 번들거림 심함',
    ],
    metricNote: {
      모공: '피지 과다로 모공 확장 위험이 높아요',
      주름: '유분 덕분에 주름 발생은 낮은 편이에요',
      색소침착: '트러블 자국이 색소침착으로 이어질 수 있어요',
      UV색소침착: '자외선 노출 시 색소 자국에 주의하세요',
      탄력: '탄력은 양호한 편이나 관리 필요해요',
      피부톤: '홍조·트러블로 피부톤이 불균일할 수 있어요',
    },
    treatments: [
      { name: '아쿠아필링', interval: '1~2개월 간격', downtime: '없음', effect: '모공 클렌징·각질 제거' },
      { name: '레이저 토닝', interval: '지속 관리형', downtime: '없음~1일', effect: '색소·피부톤 개선' },
      { name: 'PDT (광역동치료)', interval: '4~6주 간격', downtime: '1~3일', effect: '여드름·피지 억제' },
    ],
    devices: [
      { name: 'LED 청색광 (415nm)', freq: '주 3~5회 · 10~15분', focus: '여드름균 억제' },
      { name: '갈바닉 -극 (클렌징 모드)', freq: '주 1~2회 · 5분', focus: '모공 세정·피지 제거' },
      { name: 'EMS 미세전류', freq: '주 3회 · 10분', focus: '탄력 보조·피부 결 정돈' },
    ],
    routine: [
      { step: '클렌징', product: '약산성 젤 폼 클렌저', tip: '하루 2회, 과도한 이중세안은 피하세요' },
      { step: '토너', product: '나이아신아마이드·BHA 함유 토너', tip: '코튼 패드로 가볍게 닦아내요' },
      { step: '세럼', product: '히알루론산·논코메도제닉 수분 세럼', tip: '오일프리 제형 선택이 중요해요' },
      { step: '크림', product: '오일프리 워터·젤 크림', tip: '가볍고 빨리 흡수되는 제형' },
      { step: '선크림', product: '가벼운 워터 선크림 SPF 30~50', tip: '기름진 제형은 피하세요' },
    ],
  },

  건성: {
    emoji: '🌵',
    subtitle: '수분·유분 부족 · 각질',
    desc: '피지와 수분이 모두 부족해 항상 건조하고 각질과 당김이 느껴지는 타입이에요. 수분 공급과 장벽 강화가 가장 중요해요.',
    baumannNote: 'D(Dry)형: 피지선 저활성 → 수분 공급·장벽 복구 집중',
    chars: [
      '세안 후 심한 당김·건조함이 장시간 지속',
      '미세 각질·박리 현상 (볼·이마 중심)',
      '주름·잔주름이 조기에 나타나기 쉬움',
      '자극에 민감하고 홍조 반응이 빠름',
    ],
    metricNote: {
      모공: '유분 부족으로 모공은 작은 편이에요',
      주름: '수분·유분 부족으로 주름 관리가 필요해요',
      색소침착: '건조 자극으로 색소침착이 생길 수 있어요',
      UV색소침착: '자외선 차단제를 꼭 바르세요',
      탄력: '건조할수록 탄력이 빠르게 감소해요',
      피부톤: '건조로 인한 홍조·민감 반응에 주의하세요',
    },
    treatments: [
      { name: '스킨부스터 (리쥬란/PN)', interval: '6개월', downtime: '2~3일', effect: '수분·재생 집중 공급' },
      { name: '물광주사', interval: '3~4개월', downtime: '2~3일', effect: '진피층 수분 보충' },
      { name: '아쿠아셀 필링', interval: '1~2개월 간격', downtime: '없음', effect: '수분 공급·각질 정리' },
    ],
    devices: [
      { name: '초음파 흡수 기기', freq: '주 3~5회 · 세럼 후 5~10분', focus: '성분 흡수 극대화' },
      { name: '갈바닉 +극 (흡수 모드)', freq: '주 2~3회 · 10분', focus: '수분 세럼 침투 강화' },
      { name: 'LED 적색광 (630nm)', freq: '주 3~4회 · 15분', focus: '피부 재생·장벽 강화' },
    ],
    routine: [
      { step: '클렌징', product: '저자극 크림·밀크 타입 클렌저', tip: '미온수로 부드럽게, 하루 1~2회' },
      { step: '토너', product: '히알루론산·세라마이드 수분 토너', tip: '손으로 가볍게 두드려 흡수시켜요' },
      { step: '세럼', product: '고농도 히알루론산·판테놀 세럼', tip: '2~3겹 레이어링으로 수분막 형성' },
      { step: '크림', product: '세라마이드·스쿠알란 리치 크림', tip: '두꺼운 장벽 형성이 핵심이에요' },
      { step: '선크림', product: '보습력 있는 크림 타입 선크림 SPF 30+', tip: '자외선은 건조함을 악화시켜요' },
    ],
  },

  중성: {
    emoji: '✨',
    subtitle: '균형 잡힌 이상 피부',
    desc: '유·수분 균형이 이상적으로 유지되는 피부 타입이에요. 현재 상태 유지와 노화 예방 관리가 핵심이에요.',
    baumannNote: 'N(Neutral)형: 유수분 밸런스 유지 → 예방·안티에이징 집중',
    chars: [
      '트러블이 적고 피부결이 균일함',
      '유·수분 균형이 잘 유지됨',
      '계절·환경 변화에 적응력이 좋음',
      '현상 유지와 안티에이징이 가장 중요',
    ],
    metricNote: {
      모공: '모공 상태가 양호한 편이에요',
      주름: '노화 예방 관리로 주름을 늦춰요',
      색소침착: '색소 관리로 피부톤을 균일하게 유지해요',
      UV색소침착: '자외선 차단으로 색소 예방이 중요해요',
      탄력: '탄력 유지를 위한 리프팅 관리를 시작하세요',
      피부톤: '균일한 피부톤 유지가 강점이에요',
    },
    treatments: [
      { name: '레이저 토닝', interval: '지속 관리형', downtime: '없음', effect: '피부톤 균일·색소 관리' },
      { name: '스킨부스터', interval: '6개월', downtime: '2~3일', effect: '예방적 수분·재생 관리' },
      { name: 'HIFU 리프팅', interval: '12~18개월', downtime: '없음~1일', effect: '탄력·처짐 예방' },
    ],
    devices: [
      { name: 'LED 복합광 (적+청)', freq: '주 3~4회 · 10~15분', focus: '재생·트러블 복합 케어' },
      { name: '미세전류 (EMS)', freq: '주 3회 · 10분', focus: '탄력 유지·리프팅' },
      { name: 'RF 고주파', freq: '주 1~2회 · 10분', focus: '콜라겐 생성·안티에이징' },
    ],
    routine: [
      { step: '클렌징', product: '순한 폼 클렌저', tip: '하루 2회, 부드럽게 세안하세요' },
      { step: '토너', product: '항산화 성분(비타민C·나이아신아마이드) 토너', tip: '노화 예방 성분 위주로 선택' },
      { step: '세럼', product: '레티놀·펩타이드 안티에이징 세럼', tip: '나이에 맞게 안티에이징을 시작하세요' },
      { step: '크림', product: '가벼운 에멀전 또는 워터크림', tip: '과보습 없이 적당한 유지' },
      { step: '선크림', product: 'SPF 30~50 자외선 차단제', tip: '자외선은 노화의 80%를 차지해요' },
    ],
  },

  복합성: {
    emoji: '🔀',
    subtitle: 'T존 지성 · U존 건성',
    desc: 'T존은 피지 과다로 번들거리고, 볼·턱(U존)은 건조한 가장 흔한 피부 타입이에요. 부위별 맞춤 케어가 핵심이에요.',
    baumannNote: 'Combo형: T존(O)·U존(D) → 부위별 분리 케어',
    chars: [
      'T존 (이마·코): 피지 과다, 번들거림, 모공 확장',
      'U존 (볼·턱): 건조, 당김, 각질, 민감 반응',
      '계절·호르몬 변화에 따라 타입이 변동',
      '부위마다 다른 제품과 케어가 필요함',
    ],
    metricNote: {
      모공: 'T존 모공 관리가 특히 중요해요',
      주름: 'U존 건조로 잔주름에 주의하세요',
      색소침착: '트러블 자국 관리에 신경 쓰세요',
      UV색소침착: '자외선 차단을 꼭 하세요',
      탄력: 'U존 수분 관리로 탄력을 유지하세요',
      피부톤: 'T존·U존 경계 피부톤 균일화가 포인트예요',
    },
    treatments: [
      { name: '아쿠아필링', interval: '1~2개월 간격', downtime: '없음', effect: 'T존 모공·피지 클렌징' },
      { name: '복합 레이저', interval: '지속 관리형', downtime: '없음~2일', effect: '부위별 맞춤 처치' },
      { name: '스킨부스터 (U존)', interval: '6개월', downtime: '2~3일', effect: 'U존 수분·재생 공급' },
    ],
    devices: [
      { name: 'LED 복합광 (T존 청색·U존 적색)', freq: '주 3~4회 · 10~15분', focus: '부위별 분리 케어' },
      { name: '고주파 RF (U존)', freq: '주 2회 · U존 중심 15분', focus: 'U존 탄력·수분 강화' },
      { name: '갈바닉 (T존 -, U존 +)', freq: '주 1~2회 · 10분', focus: 'T존 세정·U존 흡수' },
    ],
    routine: [
      { step: '클렌징', product: '약산성 젤 클렌저', tip: 'T존은 거품 충분히, U존은 부드럽게' },
      { step: '토너', product: '수분·진정 토너', tip: '전체 부드럽게, T존은 BHA 국소 적용 가능' },
      { step: '세럼', product: 'T존: 나이아신아마이드 / U존: 히알루론산', tip: '부위별 다른 세럼 사용 권장' },
      { step: '크림', product: 'T존: 가벼운 젤 크림 / U존: 리치 크림', tip: '구역을 나눠서 바르세요' },
      { step: '선크림', product: '매트 선크림 SPF 30~50', tip: 'T존 번들거림을 잡아주는 제형 선택' },
    ],
  },
};

// Baumann 코드 한글 설명
const AXIS_LABELS: Record<string, string> = {
  D: '건성(Dry)', O: '지성(Oily)',
  S: '민감성(Sensitive)', R: '저항성(Resistant)',
  P: '색소성(Pigmented)', N: '비색소성(Non-Pigmented)',
  W: '주름성(Wrinkle)', T: '탄력성(Tight)',
};

// 6대 지표 이모지 + 색상
const METRIC_CONFIG: Record<string, { emoji: string; color: string; goodLabel: string; badLabel: string }> = {
  모공:     { emoji: '🔵', color: '#4A90D9', goodLabel: '모공 조임', badLabel: '모공 확장' },
  주름:     { emoji: '〰️', color: '#9B59B6', goodLabel: '주름 없음', badLabel: '주름 뚜렷' },
  색소침착: { emoji: '🟤', color: '#C0392B', goodLabel: '색소 없음', badLabel: '색소침착' },
  UV색소침착:{ emoji: '☀️', color: '#E67E22', goodLabel: 'UV 안전', badLabel: 'UV 노출 흔적' },
  탄력:     { emoji: '💪', color: Colors.primary, goodLabel: '탄력 양호', badLabel: '탄력 저하' },
  피부톤:   { emoji: '🔴', color: '#E74C3C', goodLabel: '피부톤 균일', badLabel: '홍조·불균일' },
};

// ───────────────────────────────────────────────
// 컴포넌트
// ───────────────────────────────────────────────
const TOTAL_Q = QUESTIONS.length; // 8

export default function SkinAnalysisScreen() {
  const { user, profile, fetchProfile } = useAuth();
  const { viewResult } = useLocalSearchParams<{ viewResult?: string }>();
  const isViewMode = viewResult === 'true';

  const [step, setStep] = useState(isViewMode ? TOTAL_Q : 0);
  const [answers, setAnswers] = useState<(number | null)[]>(Array(TOTAL_Q).fill(null));
  const [selected, setSelected] = useState<number | null>(null);
  const [result, setResult] = useState<SkinResult | null>(null);
  const [saving, setSaving] = useState(false);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({
    metrics: true, chars: true, treatments: true, devices: true, routine: true,
  });
  const toggleSection = (key: string) => setExpanded(prev => ({ ...prev, [key]: !prev[key] }));

  useEffect(() => {
    if (isViewMode && profile?.skin_type && profile?.baumann_code) {
      const code = profile.baumann_code;
      setResult({
        type: profile.skin_type as SkinType,
        code,
        axisD: code[0] as AxisD,
        axisS: code[1] as AxisS,
        axisP: code[2] as AxisP,
        axisW: code[3] as AxisW,
        dehydration: profile.skin_dehydration ?? false,
        metrics: (profile.skin_metrics ?? { 모공: 50, 주름: 50, 색소침착: 50, UV색소침착: 50, 탄력: 50, 피부톤: 50 }) as SkinResult['metrics'],
      });
      setStep(TOTAL_Q);
    }
  }, [isViewMode, profile?.skin_type, profile?.baumann_code]);

  const handleNext = () => {
    if (selected === null) return;
    const newAnswers = [...answers];
    newAnswers[step] = selected;
    setAnswers(newAnswers);
    setSelected(null);
    if (step < TOTAL_Q - 1) {
      setStep(step + 1);
    } else {
      setResult(calcResult(newAnswers));
      setStep(TOTAL_Q);
    }
  };

  const handleSave = async () => {
    if (!user || !result) return;
    setSaving(true);
    const { error } = await supabase
      .from('profiles')
      .update({
        skin_type: result.type,
        baumann_code: result.code,
        skin_metrics: result.metrics,
        skin_dehydration: result.dehydration,
      })
      .eq('user_id', user.id);
    setSaving(false);
    if (error) {
      Alert.alert('저장 실패', '프로필 저장 중 문제가 발생했어요. 다시 시도해주세요.');
      return;
    }
    await fetchProfile(user.id);
    Alert.alert(
      '저장 완료 ✅',
      `${result.type} 타입(${result.code}) 결과가 프로필에 저장되었어요!\n리포트에서 상세 분석을 확인해보세요 📋`,
      [{ text: '확인', onPress: () => router.back() }],
    );
  };

  const handleRetake = () => {
    setStep(0);
    setAnswers(Array(TOTAL_Q).fill(null));
    setSelected(null);
    setResult(null);
  };

  const info = result ? RESULTS[result.type] : null;
  const currentSection = step < TOTAL_Q ? QUESTIONS[step].section : '';

  return (
    <View style={styles.container}>
      {/* 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Text style={styles.back}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>피부타입 분석</Text>
        <View style={{ width: 32 }} />
      </View>

      {step < TOTAL_Q ? (
        /* ── 퀴즈 ── */
        <>
          <ScrollView contentContainerStyle={styles.quizContent} showsVerticalScrollIndicator={false}>
            {/* 진행 표시 */}
            <View style={styles.progressRow}>
              {QUESTIONS.map((_, i) => (
                <View
                  key={i}
                  style={[
                    styles.dot,
                    i < step && styles.dotDone,
                    i === step && styles.dotActive,
                  ]}
                />
              ))}
            </View>
            <Text style={styles.stepLabel}>질문 {step + 1} / {TOTAL_Q}</Text>
            <View style={styles.sectionBadge}>
              <Text style={styles.sectionBadgeText}>📋 {currentSection}</Text>
            </View>

            <Text style={styles.question}>{QUESTIONS[step].q}</Text>
            <Text style={styles.hint}>{QUESTIONS[step].hint}</Text>

            <View style={styles.options}>
              {QUESTIONS[step].options.map((opt, idx) => (
                <TouchableOpacity
                  key={idx}
                  style={[styles.option, selected === idx && styles.optionSelected]}
                  onPress={() => setSelected(idx)}
                  activeOpacity={0.8}
                >
                  <View style={[styles.optionDot, selected === idx && styles.optionDotSelected]}>
                    {selected === idx && <View style={styles.optionDotInner} />}
                  </View>
                  <Text style={[styles.optionText, selected === idx && styles.optionTextSelected]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.nextBtn, selected === null && styles.nextBtnDisabled]}
              onPress={handleNext}
              disabled={selected === null}
            >
              <Text style={styles.nextBtnText}>
                {step < TOTAL_Q - 1 ? '다음 질문' : '결과 보기'}
              </Text>
            </TouchableOpacity>
          </View>
        </>
      ) : (
        /* ── 결과 ── */
        <>
          <ScrollView contentContainerStyle={styles.resultContent} showsVerticalScrollIndicator={false}>

            {/* ① 결과 헤더 */}
            <View style={styles.resultHeader}>
              <Text style={styles.resultEmoji}>{info?.emoji}</Text>
              <Text style={styles.resultType}>{result?.type}</Text>

              {/* Baumann 코드 배지 */}
              <View style={styles.codeRow}>
                <View style={styles.codeBadge}>
                  <Text style={styles.codeText}>{result?.code}</Text>
                </View>
                {result?.dehydration && (
                  <View style={styles.dehydBadge}>
                    <Text style={styles.dehydBadgeText}>💧 속건조 동반</Text>
                  </View>
                )}
              </View>

              <Text style={styles.resultSubtitle}>{info?.subtitle}</Text>
              <Text style={styles.resultDesc}>{info?.desc}</Text>
            </View>

            {/* ② Baumann 4축 분류 */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>🧬 Baumann 피부타입 분류</Text>
              <Text style={styles.cardSubNote}>세계적으로 검증된 4축 피부 분류 시스템이에요</Text>
              {result && [
                { axis: result.axisD, opposite: result.axisD === 'D' ? 'O' : 'D', label: '유분·수분 축' },
                { axis: result.axisS, opposite: result.axisS === 'S' ? 'R' : 'S', label: '민감도 축' },
                { axis: result.axisP, opposite: result.axisP === 'P' ? 'N' : 'P', label: '색소침착 축' },
                { axis: result.axisW, opposite: result.axisW === 'W' ? 'T' : 'W', label: '탄력·주름 축' },
              ].map(({ axis, opposite, label }) => (
                <View key={label} style={styles.axisRow}>
                  <Text style={styles.axisLabel}>{label}</Text>
                  <View style={styles.axisBadgeRow}>
                    <View style={styles.axisActive}>
                      <Text style={styles.axisActiveText}>{axis} — {AXIS_LABELS[axis]}</Text>
                    </View>
                  </View>
                </View>
              ))}
            </View>

            {/* ③ 6대 피부 지표 */}
            <View style={styles.card}>
              <TouchableOpacity style={styles.sectionHeader} onPress={() => toggleSection('metrics')} activeOpacity={0.7}>
                <Text style={styles.cardTitle}>📊 6대 피부 지표 분석</Text>
                <Text style={styles.chevron}>{expanded.metrics ? '▲' : '▼'}</Text>
              </TouchableOpacity>
              {expanded.metrics && <Text style={styles.cardSubNote}>퀴즈 답변을 기반으로 추정한 피부 상태예요</Text>}
              {expanded.metrics && result && Object.entries(result.metrics).map(([key, value]) => {
                const cfg = METRIC_CONFIG[key];
                return (
                  <View key={key} style={styles.metricRow}>
                    <View style={styles.metricLeft}>
                      <Text style={styles.metricName}>{cfg.emoji} {key}</Text>
                      <Text style={styles.metricNote}>{info?.metricNote[key]}</Text>
                    </View>
                    <View style={styles.metricBarWrap}>
                      <View style={styles.metricBarBg}>
                        <View style={[styles.metricBar, {
                          width: `${value}%` as any,
                          backgroundColor: cfg.color,
                        }]} />
                      </View>
                      <Text style={[styles.metricPct, { color: cfg.color }]}>
                        {value >= 60 ? '⚠️ 관리 필요' : value >= 30 ? '보통' : '✅ 양호'}
                      </Text>
                    </View>
                  </View>
                );
              })}
              {expanded.metrics && <Text style={styles.metricDisclaimer}>
                * 기기 측정이 아닌 자가진단 기반 추정치예요. 정밀 측정은 피부과 방문을 권장해요.
              </Text>}
            </View>

            {/* ④ 속건조 안내 */}
            {result?.dehydration && (
              <View style={styles.dehydCard}>
                <Text style={styles.dehydTitle}>💧 속건조(수분부족)란?</Text>
                <Text style={styles.dehydText}>
                  피부 타입과 별개로 나타나는 피부 상태예요. 지성·복합성이라도 피부 속 수분이 부족하면
                  겉은 번들거리지만 속이 당기는 느낌이 나요. 수분 세럼을 빠뜨리지 마세요!
                </Text>
              </View>
            )}

            {/* ⑤ 피부 특징 */}
            <View style={styles.card}>
              <TouchableOpacity style={styles.sectionHeader} onPress={() => toggleSection('chars')} activeOpacity={0.7}>
                <Text style={styles.cardTitle}>🔍 내 피부 특징</Text>
                <Text style={styles.chevron}>{expanded.chars ? '▲' : '▼'}</Text>
              </TouchableOpacity>
              {expanded.chars && info?.chars.map((c, i) => (
                <View key={i} style={styles.bullet}>
                  <Text style={styles.bulletDot}>•</Text>
                  <Text style={styles.bulletText}>{c}</Text>
                </View>
              ))}
            </View>

            {/* ⑥ 추천 시술 */}
            <View style={styles.card}>
              <TouchableOpacity style={styles.sectionHeader} onPress={() => toggleSection('treatments')} activeOpacity={0.7}>
                <Text style={styles.cardTitle}>💉 추천 시술 TOP 3</Text>
                <Text style={styles.chevron}>{expanded.treatments ? '▲' : '▼'}</Text>
              </TouchableOpacity>
              {expanded.treatments && info?.treatments.map((t, i) => (
                <View key={i} style={[styles.treatRow, i < (info.treatments.length - 1) && styles.treatRowBorder]}>
                  <View style={styles.treatRank}>
                    <Text style={styles.treatRankText}>{i + 1}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.treatName}>{t.name}</Text>
                    <Text style={styles.treatEffect}>{t.effect}</Text>
                    <View style={styles.treatMeta}>
                      <Text style={styles.treatTag}>🔄 {t.interval}</Text>
                      <Text style={styles.treatTag}>🌿 다운타임 {t.downtime}</Text>
                    </View>
                  </View>
                </View>
              ))}
            </View>

            {/* ⑦ 추천 디바이스 */}
            <View style={styles.card}>
              <TouchableOpacity style={styles.sectionHeader} onPress={() => toggleSection('devices')} activeOpacity={0.7}>
                <Text style={styles.cardTitle}>🏠 추천 홈케어 디바이스</Text>
                <Text style={styles.chevron}>{expanded.devices ? '▲' : '▼'}</Text>
              </TouchableOpacity>
              {expanded.devices && info?.devices.map((d, i) => (
                <View key={i} style={[styles.deviceRow, i < (info.devices.length - 1) && styles.deviceRowBorder]}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.deviceName}>{d.name}</Text>
                    <Text style={styles.deviceFocus}>✦ {d.focus}</Text>
                  </View>
                  <Text style={styles.deviceFreq}>{d.freq}</Text>
                </View>
              ))}
            </View>

            {/* ⑧ 스킨케어 루틴 */}
            <View style={styles.card}>
              <TouchableOpacity style={styles.sectionHeader} onPress={() => toggleSection('routine')} activeOpacity={0.7}>
                <Text style={styles.cardTitle}>🧴 추천 스킨케어 루틴</Text>
                <Text style={styles.chevron}>{expanded.routine ? '▲' : '▼'}</Text>
              </TouchableOpacity>
              {expanded.routine && info?.routine.map((r, i) => (
                <View key={i} style={styles.routineRow}>
                  <View style={styles.routineStep}>
                    <Text style={styles.routineStepText}>{i + 1}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.routineProduct}>{r.step}: {r.product}</Text>
                    <Text style={styles.routineTip}>💡 {r.tip}</Text>
                  </View>
                </View>
              ))}
            </View>

            <View style={{ height: 8 }} />
          </ScrollView>

          <View style={styles.footer}>
            {isViewMode ? (
              <>
                <TouchableOpacity style={styles.retakeBtn} onPress={() => router.back()}>
                  <Text style={styles.retakeBtnText}>돌아가기</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.nextBtn} onPress={handleRetake}>
                  <Text style={styles.nextBtnText}>다시 진단하기</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <TouchableOpacity style={styles.retakeBtn} onPress={handleRetake}>
                  <Text style={styles.retakeBtnText}>다시하기</Text>
                </TouchableOpacity>
                {user ? (
                  <TouchableOpacity style={styles.nextBtn} onPress={handleSave} disabled={saving}>
                    {saving
                      ? <ActivityIndicator color={Colors.white} />
                      : <Text style={styles.nextBtnText}>프로필에 저장</Text>}
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    style={styles.nextBtn}
                    onPress={() => router.push('/(auth)/login' as any)}
                  >
                    <Text style={styles.nextBtnText}>로그인하고 저장</Text>
                  </TouchableOpacity>
                )}
              </>
            )}
          </View>
        </>
      )}
    </View>
  );
}

// ───────────────────────────────────────────────
// 스타일
// ───────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 16, paddingTop: HEADER_TOP, backgroundColor: Colors.white,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  back: { fontSize: 24, color: Colors.text, width: 32 },
  title: { fontSize: 17, fontWeight: '700', color: Colors.text },

  /* 퀴즈 */
  quizContent: { padding: 24, paddingBottom: 40 },
  progressRow: { flexDirection: 'row', gap: 8, justifyContent: 'center', marginBottom: 12 },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.border },
  dotDone: { backgroundColor: Colors.primaryLight },
  dotActive: { backgroundColor: Colors.primary, width: 22 },
  stepLabel: { textAlign: 'center', fontSize: 12, color: Colors.sub, fontWeight: '600', marginBottom: 8 },
  sectionBadge: {
    alignSelf: 'center', backgroundColor: '#F0ECFF', paddingVertical: 4, paddingHorizontal: 14,
    borderRadius: 20, marginBottom: 20,
  },
  sectionBadgeText: { fontSize: 12, fontWeight: '700', color: '#6B4EFF' },
  question: { fontSize: 20, fontWeight: '800', color: Colors.text, textAlign: 'center', lineHeight: 30, marginBottom: 8 },
  hint: { fontSize: 13, color: Colors.sub, textAlign: 'center', lineHeight: 20, marginBottom: 28 },
  options: { gap: 10 },
  option: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: Colors.white, borderRadius: 14, padding: 16,
    borderWidth: 1.5, borderColor: Colors.border,
  },
  optionSelected: { borderColor: Colors.primary, backgroundColor: '#FFF5F9' },
  optionDot: {
    width: 22, height: 22, borderRadius: 11, borderWidth: 2,
    borderColor: Colors.border, alignItems: 'center', justifyContent: 'center',
  },
  optionDotSelected: { borderColor: Colors.primary },
  optionDotInner: { width: 12, height: 12, borderRadius: 6, backgroundColor: Colors.primary },
  optionText: { flex: 1, fontSize: 15, color: Colors.text, fontWeight: '500' },
  optionTextSelected: { color: Colors.primary, fontWeight: '700' },

  /* 결과 */
  resultContent: { padding: 20, gap: 16, paddingBottom: 40 },
  resultHeader: {
    backgroundColor: Colors.white, borderRadius: 20, padding: 24,
    alignItems: 'center', gap: 8,
    shadowColor: Colors.primary, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12, shadowRadius: 16, elevation: 6,
  },
  resultEmoji: { fontSize: 52, marginBottom: 4 },
  resultType: { fontSize: 32, fontWeight: '900', color: Colors.text },
  codeRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  codeBadge: {
    backgroundColor: '#6B4EFF', paddingVertical: 4, paddingHorizontal: 14,
    borderRadius: 20,
  },
  codeText: { fontSize: 14, fontWeight: '800', color: Colors.white, letterSpacing: 2 },
  dehydBadge: {
    backgroundColor: '#E8F4FD', paddingVertical: 4, paddingHorizontal: 12, borderRadius: 20,
  },
  dehydBadgeText: { fontSize: 12, fontWeight: '700', color: '#2980B9' },
  resultSubtitle: { fontSize: 15, fontWeight: '700', color: Colors.primary },
  resultDesc: { fontSize: 14, color: Colors.sub, textAlign: 'center', lineHeight: 22 },

  /* 공통 카드 */
  card: {
    backgroundColor: Colors.white, borderRadius: 16, padding: 18, gap: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  cardTitle: { fontSize: 15, fontWeight: '800', color: Colors.text, flex: 1 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  chevron: { fontSize: 12, color: Colors.sub, marginLeft: 8 },
  cardSubNote: { fontSize: 12, color: Colors.sub, marginTop: -4 },

  /* Baumann 축 */
  axisRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6, borderTopWidth: 1, borderTopColor: Colors.border },
  axisLabel: { width: 80, fontSize: 12, color: Colors.sub, fontWeight: '600' },
  axisBadgeRow: { flex: 1, flexDirection: 'row', gap: 6 },
  axisActive: { backgroundColor: Colors.primaryLight, paddingVertical: 4, paddingHorizontal: 12, borderRadius: 20 },
  axisActiveText: { fontSize: 12, fontWeight: '700', color: Colors.primary },

  /* 6대 지표 */
  metricRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6 },
  metricLeft: { width: 100 },
  metricName: { fontSize: 12, fontWeight: '700', color: Colors.text },
  metricNote: { fontSize: 10, color: Colors.sub, lineHeight: 14, marginTop: 2 },
  metricBarWrap: { flex: 1, gap: 4 },
  metricBarBg: { height: 8, backgroundColor: Colors.border, borderRadius: 4, overflow: 'hidden' },
  metricBar: { height: 8, borderRadius: 4 },
  metricPct: { fontSize: 10, fontWeight: '700' },
  metricDisclaimer: { fontSize: 10, color: Colors.sub, lineHeight: 16, marginTop: 4, borderTopWidth: 1, borderTopColor: Colors.border, paddingTop: 8 },

  /* 속건조 */
  dehydCard: {
    backgroundColor: '#EBF5FB', borderRadius: 14, padding: 16, gap: 8,
    borderLeftWidth: 3, borderLeftColor: '#2980B9',
  },
  dehydTitle: { fontSize: 14, fontWeight: '700', color: '#2980B9' },
  dehydText: { fontSize: 13, color: Colors.sub, lineHeight: 20 },

  /* 피부 특징 */
  bullet: { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  bulletDot: { fontSize: 14, color: Colors.primary, marginTop: 2, fontWeight: '700' },
  bulletText: { flex: 1, fontSize: 13, color: Colors.sub, lineHeight: 20 },

  /* 시술 */
  treatRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingVertical: 10 },
  treatRowBorder: { borderBottomWidth: 1, borderBottomColor: Colors.border },
  treatRank: {
    width: 28, height: 28, borderRadius: 14, backgroundColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center', marginTop: 2,
  },
  treatRankText: { fontSize: 13, fontWeight: '800', color: Colors.white },
  treatName: { fontSize: 14, fontWeight: '700', color: Colors.text },
  treatEffect: { fontSize: 12, color: Colors.primary, fontWeight: '600', marginTop: 2 },
  treatMeta: { flexDirection: 'row', gap: 8, marginTop: 4, flexWrap: 'wrap' },
  treatTag: {
    fontSize: 11, color: Colors.sub,
    backgroundColor: Colors.bg, paddingVertical: 2, paddingHorizontal: 8, borderRadius: 6,
  },

  /* 디바이스 */
  deviceRow: { paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 10 },
  deviceRowBorder: { borderBottomWidth: 1, borderBottomColor: Colors.border },
  deviceName: { fontSize: 14, fontWeight: '700', color: Colors.text },
  deviceFocus: { fontSize: 12, color: Colors.primary, marginTop: 2 },
  deviceFreq: { fontSize: 11, color: Colors.sub, textAlign: 'right', flexShrink: 0, maxWidth: 120 },

  /* 루틴 */
  routineRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  routineStep: {
    width: 26, height: 26, borderRadius: 13, backgroundColor: Colors.primaryLight,
    alignItems: 'center', justifyContent: 'center', marginTop: 2, flexShrink: 0,
  },
  routineStepText: { fontSize: 12, fontWeight: '800', color: Colors.primary },
  routineProduct: { fontSize: 13, fontWeight: '700', color: Colors.text },
  routineTip: { fontSize: 12, color: Colors.sub, marginTop: 2, lineHeight: 18 },

  /* 하단 버튼 */
  footer: {
    flexDirection: 'row', gap: 10, padding: 16, paddingBottom: 32,
    backgroundColor: Colors.white, borderTopWidth: 1, borderTopColor: Colors.border,
  },
  retakeBtn: {
    flex: 1, paddingVertical: 14, borderRadius: 14,
    borderWidth: 1.5, borderColor: Colors.border, alignItems: 'center',
  },
  retakeBtnText: { fontSize: 15, fontWeight: '600', color: Colors.sub },
  nextBtn: {
    flex: 2, paddingVertical: 14, borderRadius: 14,
    backgroundColor: Colors.primary, alignItems: 'center',
  },
  nextBtnDisabled: { backgroundColor: Colors.border },
  nextBtnText: { fontSize: 15, fontWeight: '700', color: Colors.white },
});
