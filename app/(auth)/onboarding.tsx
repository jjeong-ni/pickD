import {
  View, Text, StyleSheet, TouchableOpacity, FlatList,
  Dimensions, SafeAreaView, Platform,
} from 'react-native';
import { useRef, useState } from 'react';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

const { width: SW } = Dimensions.get('window');
export const ONBOARDING_KEY = 'pickdi_onboarding_done';

type Slide = {
  key: string;
  icon: string;
  iconColor: string;
  bgColor: string;
  title: string;
  highlight: string;
  desc: string;
  gradient: [string, string, string];
};

const SLIDES: Slide[] = [
  {
    key: 'analysis',
    icon: 'analytics-outline',
    iconColor: '#FF6B9D',
    bgColor: 'rgba(255,107,157,0.12)',
    title: '내 피부 타입',
    highlight: '맞춤 분석',
    desc: '피부 타입·고민을 입력하면\nAI가 나에게 맞는 시술과 기기를\n자동으로 추천해드려요',
    gradient: ['#FF6B9D', '#D473E8', '#9B6FE8'],
  },
  {
    key: 'face',
    icon: 'scan-outline',
    iconColor: '#9B6FE8',
    bgColor: 'rgba(155,111,232,0.12)',
    title: 'AI 얼굴형',
    highlight: '정밀 진단',
    desc: '얼굴 사진 한 장으로\n6가지 얼굴형을 진단하고\n얼굴형별 최적 시술을 찾아드려요',
    gradient: ['#9B6FE8', '#D473E8', '#FF6B9D'],
  },
  {
    key: 'compare',
    icon: 'git-compare-outline',
    iconColor: '#5B9BD5',
    bgColor: 'rgba(91,155,213,0.12)',
    title: '시술 + 홈케어 기기',
    highlight: '함께 추천',
    desc: '병원 시술과 집에서 할 수 있는\n홈케어 기기를 함께 비교하고\n비용까지 환산해서 보여드려요',
    gradient: ['#5B9BD5', '#9B6FE8', '#D473E8'],
  },
];

export default function OnboardingScreen() {
  const [current, setCurrent] = useState(0);
  const listRef = useRef<FlatList>(null);

  const finish = async () => {
    await AsyncStorage.setItem(ONBOARDING_KEY, '1');
    router.replace('/(auth)/welcome');
  };

  const next = () => {
    if (current < SLIDES.length - 1) {
      const nextIdx = current + 1;
      listRef.current?.scrollToIndex({ index: nextIdx, animated: true });
      setCurrent(nextIdx);
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
      <View style={styles.orb1} />
      <View style={styles.orb2} />

      <SafeAreaView style={styles.safe}>
        {/* 건너뛰기 */}
        <View style={styles.topBar}>
          <View style={styles.dotsRow}>
            {SLIDES.map((_, i) => (
              <View key={i} style={[styles.dot, i === current && styles.dotActive]} />
            ))}
          </View>
          <TouchableOpacity onPress={finish} style={styles.skipBtn}>
            <Text style={styles.skipText}>건너뛰기</Text>
          </TouchableOpacity>
        </View>

        {/* 슬라이드 */}
        <FlatList
          ref={listRef}
          data={SLIDES}
          keyExtractor={(s) => s.key}
          horizontal
          pagingEnabled
          scrollEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={(e) => {
            const idx = Math.round(e.nativeEvent.contentOffset.x / SW);
            setCurrent(idx);
          }}
          renderItem={({ item: s }) => (
            <View style={[styles.slide, { width: SW }]}>
              <View style={[styles.iconWrap, { backgroundColor: s.bgColor }]}>
                <Ionicons name={s.icon as any} size={72} color={s.iconColor} />
              </View>
              <Text style={styles.slideTitle}>
                {s.title} <Text style={styles.slideHighlight}>{s.highlight}</Text>
              </Text>
              <Text style={styles.slideDesc}>{s.desc}</Text>
            </View>
          )}
        />

        {/* 다음 / 시작 버튼 */}
        <View style={styles.bottom}>
          <TouchableOpacity style={styles.nextBtn} onPress={next} activeOpacity={0.85}>
            <Text style={styles.nextBtnText}>
              {current < SLIDES.length - 1 ? '다음' : '픽디 시작하기'}
            </Text>
            <Ionicons
              name={current < SLIDES.length - 1 ? 'arrow-forward' : 'checkmark'}
              size={18}
              color="#FF6B9D"
            />
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  orb1: {
    position: 'absolute', width: 240, height: 240, borderRadius: 120,
    backgroundColor: 'rgba(255,255,255,0.10)', top: -70, right: -50,
  },
  orb2: {
    position: 'absolute', width: 150, height: 150, borderRadius: 75,
    backgroundColor: 'rgba(255,255,255,0.07)', bottom: 120, left: -30,
  },
  safe: {
    flex: 1,
    paddingTop: Platform.OS === 'web' ? 60 : 20,
    paddingBottom: Platform.OS === 'web' ? 40 : 0,
  },
  topBar: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 24, marginBottom: 20,
  },
  dotsRow: { flexDirection: 'row', gap: 8 },
  dot: {
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.35)',
  },
  dotActive: { width: 24, backgroundColor: '#fff' },
  skipBtn: { paddingVertical: 6, paddingHorizontal: 12 },
  skipText: { fontSize: 14, color: 'rgba(255,255,255,0.75)', fontWeight: '600' },
  slide: {
    alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 36, gap: 24,
  },
  iconWrap: {
    width: 140, height: 140, borderRadius: 70,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.25)',
    marginBottom: 8,
  },
  slideTitle: {
    fontSize: 28, fontWeight: '900', color: '#fff',
    textAlign: 'center', lineHeight: 36,
  },
  slideHighlight: { color: 'rgba(255,255,255,0.75)' },
  slideDesc: {
    fontSize: 16, color: 'rgba(255,255,255,0.80)',
    textAlign: 'center', lineHeight: 26,
  },
  bottom: { paddingHorizontal: 24, paddingBottom: 20 },
  nextBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    backgroundColor: '#fff', borderRadius: 18, paddingVertical: 18,
  },
  nextBtnText: { fontSize: 17, fontWeight: '800', color: '#FF6B9D' },
});
