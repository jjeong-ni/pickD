/**
 * useResponsive.ts
 * 모바일/웹 반응형 레이아웃 유틸리티
 *
 * 픽디는 모바일 앱 + Netlify 웹(최대 430px 제한) 이중 지원
 * 웹에서 브라우저 창이 넓어질 때 컬럼 수와 여백을 자동 조정합니다.
 */
import { Dimensions, Platform } from 'react-native';
import { useState, useEffect } from 'react';

const APP_MAX_WIDTH = 430; // _layout.tsx와 동일

export function useResponsive() {
  const [windowWidth, setWindowWidth] = useState(
    Math.min(Dimensions.get('window').width, APP_MAX_WIDTH),
  );

  useEffect(() => {
    const sub = Dimensions.addEventListener('change', ({ window }) => {
      setWindowWidth(Math.min(window.width, APP_MAX_WIDTH));
    });
    return () => sub?.remove();
  }, []);

  const isWeb = Platform.OS === 'web';
  const isWide = windowWidth >= 400; // 웹 넓은 화면

  // 카드 컬럼 수 (좁으면 2열, 넓으면 3열)
  const cardColumns = isWide ? 3 : 2;

  // 카드 너비 (패딩 16px × 2, gap 10px 고려)
  const cardWidth = (windowWidth - 32 - (cardColumns - 1) * 10) / cardColumns;

  // 수평 패딩
  const hPad = isWide ? 20 : 16;

  return {
    windowWidth,
    isWeb,
    isWide,
    cardColumns,
    cardWidth,
    hPad,
  };
}
