/**
 * 화면에 보여줄 이름.
 *
 * 초기 테스트 계정은 자동 프로필 트리거가 만든 탓에 nickname 이 null 이거나 '' 이다.
 * `profile?.nickname ?? '...'` 은 '' 를 걸러내지 못해 "님의 맞춤 리포트" 처럼
 * 이름 자리가 비어 보인다. 이름이 필요한 곳은 전부 이 함수를 통과시킨다.
 */
export function displayName(
  nickname: string | null | undefined,
  email?: string | null,
  fallback = '회원',
): string {
  const nick = nickname?.trim();
  if (nick) return nick;
  const local = email?.split('@')[0]?.trim();
  if (local) return local;
  return fallback;
}
