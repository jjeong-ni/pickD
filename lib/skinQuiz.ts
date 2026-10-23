/**
 * 피부타입 퀴즈의 문항과 채점 로직 (Baumann 4축).
 *
 * app/skin-analysis.tsx 에서 화면과 분리해 순수 함수로 뺐다 — 테스트(__tests__/skinQuiz.test.ts)가 이 파일을 직접 부른다.
 * 화면 문구·채점 규칙을 바꾸면 테스트도 같이 본다.
 */

// ───────────────────────────────────────────────
// 타입 정의
// ───────────────────────────────────────────────
export type SkinType = '지성' | '건성' | '중성' | '복합성';
export type AxisD = 'D' | 'O'; // Dry / Oily
export type AxisS = 'S' | 'R'; // Sensitive / Resistant
export type AxisP = 'P' | 'N'; // Pigmented / Non-Pigmented
export type AxisW = 'W' | 'T'; // Wrinkle-prone / Tight

export interface SkinResult {
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
export interface Question {
  q: string;
  hint: string;
  section: string;
  options: { label: string; scores: ScoreMap }[];
}

export const QUESTIONS: Question[] = [
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
    q: '낮 12시~오후 2시 사이 피부 상태는?',
    hint: '아침 스킨케어 후 점심 즈음, 추가 케어 없이 두었을 때예요',
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
export function calcResult(answers: (number | null)[]): SkinResult {
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

export function calcMetrics(p: {
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
