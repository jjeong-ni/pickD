export const Colors = {
  // 핵심 컬러
  primary: '#FF6B9D',
  primaryLight: 'rgba(255, 107, 157, 0.12)',
  secondary: '#C084FC',
  purple: '#C084FC',       // 하위 호환성 유지
  bg: '#FBF0F8',
  text: '#1A1A2E',
  sub: '#8B7B8E',
  border: '#EDD6E8',       // solid 테두리용
  borderLight: '#EED6E8',
  white: '#FFFFFF',
  danger: '#FF3B30',
  success: '#34C759',
  // 글래스모피즘
  glass: 'rgba(255, 255, 255, 0.22)',
  glassMid: 'rgba(255, 255, 255, 0.35)',
  glassStrong: 'rgba(255, 255, 255, 0.55)',
  glassBorder: 'rgba(255, 255, 255, 0.45)',
  // 그림자
  cardShadow: 'rgba(180, 80, 140, 0.15)',
  pinkShadow: 'rgba(255, 107, 157, 0.3)',
} as const;

// 그라데이션 팔레트
export const Gradient = {
  main: ['#FF6B9D', '#D473E8', '#9B6FE8'] as const,           // 핑크→마젠타→퍼플
  soft: ['#FFD6EC', '#EDD6FF', '#D6DAFF'] as const,           // 소프트 파스텔
  header: ['#FF6B9D', '#C084FC'] as const,                    // 헤더용
  card: ['rgba(255,255,255,0.3)', 'rgba(255,255,255,0.12)'] as const, // 카드 글래스
  button: ['#FF6B9D', '#D473E8'] as const,                    // 버튼용
  hologram: ['#FF6B9D', '#D473E8', '#9B6FE8', '#6BB5FF'] as const,  // 홀로그램
} as const;
