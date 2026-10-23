/**
 * 리뷰 목록의 2단계 조회 중 두 번째 단계 — 리뷰 행에 작성자 프로필을 붙인다.
 *
 * reviews.user_id 는 profiles 를 가리키지만 PostgREST 자동 조인이 안 돼서
 * (AGENTS.md "Supabase 조인은 FK 가 무엇을 가리키는지부터 본다") 리뷰와 프로필을
 * 따로 읽어 여기서 합친다. 프로필이 없는 작성자(탈퇴·시드 데이터)는 가상 닉네임을 쓴다.
 */

const VIRTUAL_NAMES = [
  '피부미인',
  '뷰티고수',
  '피부천재',
  '스킨케어러',
  '미용러버',
  '피부요정',
  '뷰티스타',
  '관리러버',
  '피부빛나',
  '뷰티천재',
  '피부사랑',
  '미용전문',
];

/** 같은 user_id 는 언제나 같은 가상 닉네임을 받는다. */
export function virtualNick(uid: string): string {
  let n = 0;
  for (let i = 0; i < uid.length; i++) n = (n * 31 + uid.charCodeAt(i)) >>> 0;
  return VIRTUAL_NAMES[n % VIRTUAL_NAMES.length];
}

/** 두 번째 조회에 넘길 작성자 id 목록 (중복 제거). */
export function reviewAuthorIds(reviewRows: { user_id: string }[] | null | undefined): string[] {
  return [...new Set((reviewRows ?? []).map((r) => r.user_id))];
}

export function mergeReviewProfiles<R extends { user_id: string }, P extends { user_id: string }>(
  reviewRows: R[] | null | undefined,
  profileRows: P[] | null | undefined,
): (R & { profile: P | { nickname: string } })[] {
  const profileMap: Record<string, P> = Object.fromEntries((profileRows ?? []).map((p) => [p.user_id, p]));
  return (reviewRows ?? []).map((r) => ({
    ...r,
    profile: profileMap[r.user_id] ?? { nickname: virtualNick(r.user_id) },
  }));
}
