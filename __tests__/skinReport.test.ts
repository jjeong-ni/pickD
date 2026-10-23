import { ageFromGroup, estimateSkinAge, overallScore, strengthsAndConcerns } from '../lib/skinReport';
import type { SkinMetrics } from '../types';

const flat = (v: number): SkinMetrics => ({ 모공: v, 주름: v, 색소침착: v, UV색소침착: v, 탄력: v, 피부톤: v });

describe('피부 리포트 수치 (skinReport)', () => {
  it('연령대 선택지를 대표 나이로 바꾸고, 예전 값도 받아준다', () => {
    expect(ageFromGroup('30대 초반')).toBe(32);
    expect(ageFromGroup('40대 이상')).toBe(43);
    expect(ageFromGroup('20대')).toBe(25); // 예전 값 호환
    expect(ageFromGroup(null)).toBeNull();
    expect(ageFromGroup('모름')).toBeNull();
  });

  it('또래 평균(40)이면 피부 나이 = 실제 나이, 극단값은 ±8세에서 멈춘다', () => {
    expect(estimateSkinAge(flat(40), '30대 초반')).toBe(32);
    expect(estimateSkinAge(flat(100), '30대 초반')).toBe(40);
    expect(estimateSkinAge(flat(0), '30대 초반')).toBe(24);
  });

  it('연령대나 지표가 없으면 피부 나이를 지어내지 않는다', () => {
    expect(estimateSkinAge(flat(40), null)).toBeNull();
    expect(estimateSkinAge(null, '30대 초반')).toBeNull();
  });

  it('종합 점수는 문제 지표 평균의 반대다', () => {
    expect(overallScore(flat(30))).toBe(70);
  });

  it('강점은 40 미만, 신경 쓸 지표는 40 이상에서만 뽑는다', () => {
    const m: SkinMetrics = { 모공: 10, 주름: 20, 색소침착: 50, UV색소침착: 45, 탄력: 80, 피부톤: 35 };
    expect(strengthsAndConcerns(m)).toEqual({ strengths: ['모공', '주름'], concerns: ['탄력', '색소침착'] });
  });
});
