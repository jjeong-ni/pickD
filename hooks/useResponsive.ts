import { Dimensions, Platform, PixelRatio } from 'react-native';
import { useState, useEffect } from 'react';

// Web breakpoints (matching common screen sizes)
export const BREAKPOINTS = {
  sm: 390,   // iPhone SE / small phone
  md: 430,   // iPhone 15 Pro Max
  lg: 768,   // tablet / iPad
  xl: 1024,  // desktop
} as const;

export const WEB_MAX_WIDTH = 680; // web frame max width (wider than before for better demo)

function getWindowWidth() {
  const w = Dimensions.get('window').width;
  return Platform.OS === 'web' ? Math.min(w, WEB_MAX_WIDTH) : w;
}

export function useResponsive() {
  const [windowWidth, setWindowWidth] = useState(getWindowWidth);
  const [windowHeight, setWindowHeight] = useState(Dimensions.get('window').height);

  useEffect(() => {
    const sub = Dimensions.addEventListener('change', ({ window }) => {
      setWindowWidth(Platform.OS === 'web' ? Math.min(window.width, WEB_MAX_WIDTH) : window.width);
      setWindowHeight(window.height);
    });
    return () => sub?.remove();
  }, []);

  const isWeb = Platform.OS === 'web';
  const isSmall = windowWidth < BREAKPOINTS.sm;       // tiny phones
  const isMedium = windowWidth < BREAKPOINTS.lg;      // phones & small tablets
  const isLarge = windowWidth >= BREAKPOINTS.lg;      // tablets & desktop
  const isWide = windowWidth >= BREAKPOINTS.md;       // wide phone or above

  // Horizontal padding — scales with screen
  const hPad = isLarge ? 28 : isWide ? 20 : 16;

  // Card grid columns
  const cardColumns = isLarge ? 4 : isWide ? 3 : 2;

  // Card width — fills available space based on columns
  const gapBetweenCards = 12;
  const cardWidth = Math.floor(
    (windowWidth - hPad * 2 - gapBetweenCards * (cardColumns - 1)) / cardColumns
  );

  // Font scale factor relative to base 390px screen
  const fontScale = Math.min(Math.max(windowWidth / 390, 0.85), 1.25);

  // Responsive font size helper
  const rfs = (size: number) => Math.round(size * fontScale);

  // Content max width (for non-FlatList content)
  const contentWidth = windowWidth - hPad * 2;

  return {
    windowWidth,
    windowHeight,
    isWeb,
    isSmall,
    isMedium,
    isLarge,
    isWide,
    hPad,
    cardColumns,
    cardWidth,
    fontScale,
    rfs,
    contentWidth,
  };
}
