import { QUESTIONS, calcMetrics, calcResult, type SkinResult } from '../lib/skinQuiz';

/** 모든 문항에 같은 번째 보기를 고른 답안. */
const allPick = (idx: number) => QUESTIONS.map(() => idx);

describe('피부타입 퀴즈 채점 (calcResult)', () => {
  it('8문항, 4축 × 2문항이다', () => {
    expect(QUESTIONS).toHaveLength(8);
  });

  it('전부 "번들거려요"를 고르면 지성·ORNT, 속건조 없음', () => {
    const r = calcResult([4, 3, 2, 2, 2, 2, 2, 2]);
    expect(r.type).toBe('지성');
    expect(r.code).toBe('ORNT');
    expect(r.dehydration).toBe(false);
    expect(r.metrics).toEqual({ 모공: 65, 주름: 25, 색소침착: 35, UV색소침착: 30, 탄력: 40, 피부톤: 50 });
  });

  it('전부 첫 보기(건조·민감·색소·주름)를 고르면 건성·DSPW 이고 서브타입 보정이 붙는다', () => {
    const r = calcResult(allPick(0));
    expect(r.type).toBe('건성');
    expect(r.code).toBe('DSPW');
    // 건성 기준값 + S(톤 +15, 색소 +5) + P(색소·UV +20) + W(주름·탄력 +20)
    expect(r.metrics).toEqual({ 모공: 20, 주름: 75, 색소침착: 60, UV색소침착: 50, 탄력: 75, 피부톤: 45 });
  });

  it('T존만 번들거리면 복합성이고, D 점수가 있으면 속건조로 본다', () => {
    const r = calcResult(allPick(1));
    expect(r.type).toBe('복합성');
    expect(r.dehydration).toBe(true);
  });

  it('"편안해요"만 고르면 중성', () => {
    expect(calcResult(allPick(2)).type).toBe('중성');
  });

  it('답하지 않은 문항(null)은 점수에 들어가지 않는다', () => {
    expect(calcResult([4, 3, null, null, null, null, null, null]).type).toBe('지성');
  });

  it('어떤 조합이든 6대 지표는 0~100 안에 있다', () => {
    const types: SkinResult['type'][] = ['지성', '건성', '중성', '복합성'];
    for (const type of types)
      for (const axisS of ['S', 'R'] as const)
        for (const axisP of ['P', 'N'] as const)
          for (const axisW of ['W', 'T'] as const) {
            const m = calcMetrics({ type, axisS, axisP, axisW, O: 0, D: 0, S: 0, W: 0 });
            for (const v of Object.values(m)) {
              expect(v).toBeGreaterThanOrEqual(0);
              expect(v).toBeLessThanOrEqual(100);
            }
          }
  });
});
