import { mergeReviewProfiles, reviewAuthorIds, virtualNick } from '../lib/reviewProfiles';

describe('리뷰 2단계 조회 — 프로필 병합', () => {
  const reviews = [
    { id: 'r1', user_id: 'u1', body: 'a' },
    { id: 'r2', user_id: 'u2', body: 'b' },
    { id: 'r3', user_id: 'u1', body: 'c' },
  ];

  it('두 번째 조회에 넘길 작성자 id 는 중복 없이 뽑는다', () => {
    expect(reviewAuthorIds(reviews)).toEqual(['u1', 'u2']);
    expect(reviewAuthorIds(null)).toEqual([]);
  });

  it('프로필이 있으면 붙이고, 없으면 가상 닉네임을 붙인다 (순서 유지)', () => {
    const merged = mergeReviewProfiles(reviews, [{ user_id: 'u1', nickname: '지수', skin_type: '건성' }]);
    expect(merged.map((r) => r.id)).toEqual(['r1', 'r2', 'r3']);
    expect(merged[0].profile).toEqual({ user_id: 'u1', nickname: '지수', skin_type: '건성' });
    expect(merged[2].profile).toBe(merged[0].profile);
    expect(merged[1].profile).toEqual({ nickname: virtualNick('u2') });
  });

  it('가상 닉네임은 같은 사용자에게 언제나 같다 (새로고침해도 안 바뀐다)', () => {
    expect(virtualNick('abc-123')).toBe(virtualNick('abc-123'));
  });

  it('리뷰 조회가 비면 빈 목록', () => {
    expect(mergeReviewProfiles(null, null)).toEqual([]);
  });
});
