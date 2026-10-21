import type { SkinMetrics } from '../types';

/**
 * Focuskin 리포트 형식의 요약 수치.
 *
 * 6대 지표(0~100, 높을수록 문제가 심함)와 연령대만으로 계산한다.
 * 실측 기기가 아니라 퀴즈 기반 추정이므로 화면에는 반드시 "추정"이라고 적는다.
 */

export const METRIC_KEYS: (keyof SkinMetrics)[] = ['모공', '주름', '색소침착', 'UV색소침착', '탄력', '피부톤'];

/** 연령대 선택지 → 대표 나이. 선택지는 profile-setup / signup / account 와 같다. */
const AGE_MIDPOINT: Record<string, number> = {
  '20대 초반': 22,
  '20대 후반': 27,
  '30대 초반': 32,
  '30대 중반': 35,
  '30대 후반': 38,
  '40대 이상': 43,
};

export function ageFromGroup(ageGroup: string | null | undefined): number | null {
  if (!ageGroup) return null;
  if (AGE_MIDPOINT[ageGroup] != null) return AGE_MIDPOINT[ageGroup];
  // 예전 값('20대', '30대' 등) 호환
  const m = ageGroup.match(/(\d)0대/);
  return m ? Number(m[1]) * 10 + 5 : null;
}

// 노화와 관련이 큰 지표일수록 가중치가 크다 (주름·탄력 > 색소 > 톤·모공).
const AGING_WEIGHT: Record<keyof SkinMetrics, number> = {
  주름: 0.35, 탄력: 0.3, 색소침착: 0.15, UV색소침착: 0.1, 피부톤: 0.05, 모공: 0.05,
};
/** 또래 평균으로 보는 노화 점수. 이보다 높으면 피부 나이가 실제보다 많게 나온다. */
const AGING_BASELINE = 40;
const MAX_OFFSET = 8;

export function agingScore(metrics: SkinMetrics): number {
  return METRIC_KEYS.reduce((sum, k) => sum + (metrics[k] ?? 50) * AGING_WEIGHT[k], 0);
}

/** 추정 피부 나이. 연령대가 없으면 계산하지 않는다. */
export function estimateSkinAge(metrics: SkinMetrics | null | undefined, ageGroup: string | null | undefined): number | null {
  const age = ageFromGroup(ageGroup);
  if (!metrics || age == null) return null;
  const raw = (agingScore(metrics) - AGING_BASELINE) / 5;
  const offset = Math.max(-MAX_OFFSET, Math.min(MAX_OFFSET, Math.round(raw)));
  return age + offset;
}

/** 종합 피부 점수 (0~100, 높을수록 좋음). */
export function overallScore(metrics: SkinMetrics): number {
  const avg = METRIC_KEYS.reduce((s, k) => s + (metrics[k] ?? 50), 0) / METRIC_KEYS.length;
  return Math.round(100 - avg);
}

export function metricLevel(value: number): { label: '양호' | '보통' | '주의'; color: string } {
  if (value >= 70) return { label: '주의', color: '#E74C3C' };
  if (value >= 40) return { label: '보통', color: '#E67E22' };
  return { label: '양호', color: '#27AE60' };
}

/** 가장 좋은 지표 / 가장 신경 쓸 지표 (각 최대 2개). */
export function strengthsAndConcerns(metrics: SkinMetrics) {
  const sorted = [...METRIC_KEYS].sort((a, b) => metrics[a] - metrics[b]);
  return {
    strengths: sorted.slice(0, 2).filter((k) => metrics[k] < 40),
    concerns: sorted.slice(-2).reverse().filter((k) => metrics[k] >= 40),
  };
}
