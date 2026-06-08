/**
 * MediaGallery.tsx
 * 시술/기기 상세 페이지용 이미지 캐러셀 + YouTube 동영상 컴포넌트
 */
import {
  View, Text, StyleSheet, ScrollView, Image, TouchableOpacity,
  Dimensions, Platform,
} from 'react-native';
import { useState } from 'react';
import { WebView } from 'react-native-webview';
import { Colors } from '../constants/colors';

const SCREEN_W = Dimensions.get('window').width;
const CARD_W = Math.min(SCREEN_W, 430); // 웹 max-width 대응

// YouTube URL을 embed URL로 변환
function toYoutubeEmbed(url: string): string | null {
  const m =
    url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([A-Za-z0-9_-]{11})/) ||
    url.match(/youtube\.com\/embed\/([A-Za-z0-9_-]{11})/);
  if (!m) return null;
  return `https://www.youtube.com/embed/${m[1]}?rel=0&modestbranding=1`;
}

interface MediaGalleryProps {
  imageUrl: string | null;   // 기존 대표 이미지
  images?: string[];          // 추가 갤러리 이미지
  videoUrl?: string | null;  // YouTube URL
  fallbackEmoji?: string;
}

export default function MediaGallery({
  imageUrl,
  images = [],
  videoUrl,
  fallbackEmoji = '💆',
}: MediaGalleryProps) {
  // 전체 미디어 목록: video → 이미지들 순
  const allImages = [
    ...(imageUrl ? [imageUrl] : []),
    ...images.filter((img) => img && img !== imageUrl),
  ];

  const hasVideo = !!(videoUrl && toYoutubeEmbed(videoUrl));
  const totalSlides = (hasVideo ? 1 : 0) + allImages.length;

  const [activeIdx, setActiveIdx] = useState(0);

  // 미디어가 아무것도 없으면 fallback
  if (totalSlides === 0) {
    return (
      <View style={styles.heroFallback}>
        <Text style={styles.heroEmoji}>{fallbackEmoji}</Text>
      </View>
    );
  }

  // 단일 이미지 (갤러리 불필요)
  if (totalSlides === 1 && !hasVideo) {
    return (
      <View style={styles.heroSingle}>
        <Image source={{ uri: allImages[0] }} style={StyleSheet.absoluteFill} resizeMode="cover" />
      </View>
    );
  }

  return (
    <View>
      {/* 슬라이드 영역 */}
      <ScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        style={{ width: CARD_W }}
        onScroll={(e) => {
          const idx = Math.round(e.nativeEvent.contentOffset.x / CARD_W);
          setActiveIdx(idx);
        }}
        scrollEventThrottle={200}
      >
        {/* 동영상 슬라이드 */}
        {hasVideo && (
          <View style={[styles.slide, { width: CARD_W }]}>
            {Platform.OS === 'web' ? (
              // 웹: iframe 직접
              <View style={styles.videoWrap}>
                <iframe
                  src={toYoutubeEmbed(videoUrl!)!}
                  style={{ width: '100%', height: '100%', border: 'none' }}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </View>
            ) : (
              <WebView
                source={{ uri: toYoutubeEmbed(videoUrl!)! }}
                style={styles.videoWrap}
                allowsInlineMediaPlayback
                javaScriptEnabled
              />
            )}
            <View style={styles.videoBadge}>
              <Text style={styles.videoBadgeText}>▶ 영상</Text>
            </View>
          </View>
        )}

        {/* 이미지 슬라이드들 */}
        {allImages.map((uri, i) => (
          <View key={i} style={[styles.slide, { width: CARD_W }]}>
            <Image source={{ uri }} style={StyleSheet.absoluteFill} resizeMode="cover" />
          </View>
        ))}
      </ScrollView>

      {/* 페이지 인디케이터 */}
      {totalSlides > 1 && (
        <View style={styles.dotsRow}>
          {Array.from({ length: totalSlides }).map((_, i) => (
            <View
              key={i}
              style={[styles.dot, i === activeIdx && styles.dotActive]}
            />
          ))}
        </View>
      )}

      {/* 슬라이드 카운터 (우상단) */}
      {totalSlides > 1 && (
        <View style={styles.counter}>
          <Text style={styles.counterText}>{activeIdx + 1} / {totalSlides}</Text>
        </View>
      )}
    </View>
  );
}

const HERO_H = 260;

const styles = StyleSheet.create({
  heroFallback: {
    width: CARD_W, height: HERO_H,
    backgroundColor: '#F0EBF8',
    alignItems: 'center', justifyContent: 'center',
  },
  heroEmoji: { fontSize: 72 },
  heroSingle: { width: CARD_W, height: HERO_H, backgroundColor: '#F0EBF8' },

  slide: { height: HERO_H, backgroundColor: '#F0EBF8' },
  videoWrap: { width: '100%', height: '100%' },
  videoBadge: {
    position: 'absolute', bottom: 10, left: 12,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4,
  },
  videoBadgeText: { color: '#fff', fontSize: 12, fontWeight: '700' },

  dotsRow: {
    flexDirection: 'row', justifyContent: 'center',
    gap: 6, paddingVertical: 8, backgroundColor: Colors.white,
  },
  dot: {
    width: 6, height: 6, borderRadius: 3,
    backgroundColor: Colors.border,
  },
  dotActive: {
    width: 18, backgroundColor: Colors.primary,
  },

  counter: {
    position: 'absolute', top: 12, right: 12,
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3,
  },
  counterText: { color: '#fff', fontSize: 12, fontWeight: '600' },
});
