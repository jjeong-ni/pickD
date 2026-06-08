import {
  View, Text, StyleSheet, TouchableOpacity, SafeAreaView, Platform, Dimensions,
} from 'react-native';
import { useEffect, useRef, useState } from 'react';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';

export const ONBOARDING_KEY = 'pickdi_onboarding_done';

type Slide = {
  key: string;
  emoji: string;
  badge: string;
  title: string;
  subtitle: string;
  desc: string;
  gradient: [string, string, string];
  cardColor: string;
};

const SLIDES: Slide[] = [
  {
    key: 'analysis',
    emoji: '🔬',
    badge: 'AI 맞춤 분석',
    title: '내 피부 타입에\n딱 맞는 추천',
    subtitle: '피부 타입 · 고민 · 얼굴형 입력',
    desc: '피부 타입과 고민을 입력하면\nAI가 나에게 딱 맞는\n시술과 기기를 추천해드려요',
    gradient: ['#FF6B9D', '#D473E8', '#9B6FE8'],
    cardColor: 'rgba(255,107,157,0.18)',
  },
  {
    key: 'face',
    emoji: '📸',
    badge: 'AI 얼굴형 진단',
    title: '사진 한 장으로\n얼굴형 정밀 진단',
    subtitle: '6가지 얼굴형 분석',
    desc: '얼굴 사진 한 장으로\n6가지 얼굴형을 진단하고\n얼굴형별 최적 시술을 찾아드려요',
    gradient: ['#9B6FE8', '#D473E8', '#FF6B9D'],
    cardColor: 'rgba(155,111,232,0.18)',
  },
  {
    key: 'compare',
    emoji: '⚖️',
    badge: '스마트 비교',
    title: '시술 + 기기를\n함께 비교해요',
    subtitle: '병원 시술 + 홈케어 기기 동시 추천',
    desc: '병원 시술과 홈케어 기기를\n함께 비교하고 비용까지\n환산해서 보여드려요',
    gradient: ['#5B9BD5', '#9B6FE8', '#D473E8'],
    cardColor: 'rgba(91,155,213,0.18)',
  },
];

export default function OnboardingScreen() {
  const [current, setCurrent] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const resetTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setCurrent((prev) => (prev + 1) % SLIDES.length);
    }, 2000);
  };

  useEffect(() => {
    resetTimer();
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  const finish = async () => {
    if (timerRef.current) clearInterval(timerRef.current);
    await AsyncStorage.setItem(ONBOARDING_KEY, '1');
    router.replace('/(auth)/welcome');
  };

  const next = () => {
    if (current < SLIDES.length - 1) {
      setCurrent(current + 1);
      resetTimer();
    } else {
      finish();
    }
  };

  const slide = SLIDES[current];

  return (
    <LinearGradient
      colors={slide.gradient}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.container}
    >
      {/* 배경 장식 오브 */}
      <View style={styles.orb1} />
      <View style={styles.orb2} />
      <View style={styles.orb3} />

      <SafeAreaView style={styles.safe}>
        {/* 상단 바 */}
        <View style={styles.topBar}>
          <View style={styles.dotsRow}>
            {SLIDES.map((_, i) => (
              <TouchableOpacity key={i} onPress={() => { setCurrent(i); resetTimer(); }}>
                <View style={[styles.dot, i === current && styles.dotActive]} />
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity onPress={finish} style={styles.skipBtn}>
            <Text style={styles.skipText}>건너뛰기</Text>
          </TouchableOpacity>
        </View>

        {/* 슬라이드 콘텐츠 */}
        <View style={styles.slideContainer}>
          {/* 뱃지 */}
          <View style={[styles.badge, { backgroundColor: slide.cardColor }]}>
            <Text style={styles.badgeText}>{slide.badge}</Text>
          </View>

          {/* 이모지 카드 */}
          <View style={[styles.emojiCard, { backgroundColor: slide.cardColor }]}>
            <Text style={styles.emojiLarge}>{slide.emoji}</Text>
          </View>

          {/* 제목 */}
          <Text style={styles.slideTitle}>{slide.title}</Text>

          {/* 서브타이틀 */}
          <View style={styles.subtitleRow}>
            <Text style={styles.subtitleText}>{slide.subtitle}</Text>
          </View>

          {/* 설명 */}
          <Text style={styles.slideDesc}>{slide.desc}</Text>
        </View>

        {/* 하단 버튼 */}
        <View style={styles.bottom}>
          <TouchableOpacity style={styles.nextBtn} onPress={next} activeOpacity={0.85}>
            <Text style={styles.nextBtnText}>
              {current < SLIDES.length - 1 ? '다음 →' : '픽디 시작하기 ✨'}
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  orb1: {
    position: 'absolute', width: 280, height: 280, borderRadius: 140,
    backgroundColor: 'rgba(255,255,255,0.09)', top: -80, right: -60,
  },
  orb2: {
    position: 'absolute', width: 160, height: 160, borderRadius: 80,
    backgroundColor: 'rgba(255,255,255,0.07)', bottom: 160, left: -40,
  },
  orb3: {
    position: 'absolute', width: 100, height: 100, borderRadius: 50,
    backgroundColor: 'rgba(255,255,255,0.05)', bottom: 60, right: 30,
  },
  safe: {
    flex: 1,
    paddingTop: Platform.OS === 'web' ? 60 : 20,
    paddingBottom: Platform.OS === 'web' ? 40 : 0,
  },
  topBar: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 28, marginBottom: 24,
  },
  dotsRow: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  dot: {
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.35)',
  },
  dotActive: { width: 28, height: 8, borderRadius: 4, backgroundColor: '#fff' },
  skipBtn: { paddingVertical: 6, paddingHorizontal: 12 },
  skipText: { fontSize: 14, color: 'rgba(255,255,255,0.75)', fontWeight: '600' },

  slideContainer: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 36, gap: 22,
  },
  badge: {
    paddingVertical: 7, paddingHorizontal: 18, borderRadius: 24,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.35)',
  },
  badgeText: { fontSize: 13, fontWeight: '800', color: '#fff', letterSpacing: 0.5 },
  emojiCard: {
    width: 150, height: 150, borderRadius: 36,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.28)',
  },
  emojiLarge: { fontSize: 72 },
  slideTitle: {
    fontSize: 30, fontWeight: '900', color: '#fff',
    textAlign: 'center', lineHeight: 40,
    textShadowColor: 'rgba(0,0,0,0.1)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  subtitleRow: {
    backgroundColor: 'rgba(255,255,255,0.18)',
    paddingVertical: 7, paddingHorizontal: 16, borderRadius: 20,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)',
  },
  subtitleText: { fontSize: 13, fontWeight: '700', color: 'rgba(255,255,255,0.95)' },
  slideDesc: {
    fontSize: 16, color: 'rgba(255,255,255,0.82)',
    textAlign: 'center', lineHeight: 26,
  },
  bottom: { paddingHorizontal: 28, paddingBottom: 20 },
  nextBtn: {
    backgroundColor: '#fff', borderRadius: 18, paddingVertical: 19,
    alignItems: 'center',
    shadowColor: 'rgba(0,0,0,0.15)',
    shadowOffset: { width: 0, height: 6 }, shadowOpacity: 1, shadowRadius: 16,
  },
  nextBtnText: { fontSize: 17, fontWeight: '800', color: '#FF6B9D' },
});
