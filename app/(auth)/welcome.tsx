import {
  View, Text, TouchableOpacity, StyleSheet, Platform,
} from 'react-native';
import { useEffect } from 'react';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { GlassCard } from '../../components/GlassCard';
import { Gradient } from '../../constants/colors';
import { ONBOARDING_KEY } from './onboarding';

export default function WelcomeScreen() {
  useEffect(() => {
    AsyncStorage.getItem(ONBOARDING_KEY).then((done) => {
      if (!done) router.replace('/(auth)/onboarding' as any);
    });
  }, []);

  return (
    <LinearGradient
      colors={['#FF6B9D', '#D473E8', '#9B6FE8']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.gradient}
    >
      {/* 홀로그램 오브 장식 */}
      <View style={styles.orb1} />
      <View style={styles.orb2} />
      <View style={styles.orb3} />

      <View style={styles.safe}>
        {/* 로고 */}
        <View style={styles.top}>
          <GlassCard style={styles.logoBadge} intensity="low">
            <Text style={styles.logoEmoji}>✨</Text>
          </GlassCard>
          <Text style={styles.logo}>Pick D</Text>
          <Text style={styles.tagline}>내 피부에 딱 맞는 AI의 선택</Text>
          <Text style={styles.desc}>
            광고가 아닌 데이터로, 감이 아닌 AI로{'\n'}
            나에게 딱 맞는 시술·기기를 골라드려요
          </Text>

          {/* 기능 태그 */}
          <View style={styles.tagRow}>
            {['AI 피부 분석', '시술 비교', '포인트 적립'].map((t) => (
              <GlassCard key={t} style={styles.featureTag} intensity="low">
                <Text style={styles.featureTagText}>{t}</Text>
              </GlassCard>
            ))}
          </View>
        </View>

        {/* 버튼 영역 */}
        <View style={styles.bottom}>
          <TouchableOpacity
            onPress={() => router.push('/(auth)/signup')}
            activeOpacity={0.85}
          >
            <GlassCard style={styles.signupBtn} intensity="high">
              <Text style={styles.signupBtnText}>시작하기</Text>
            </GlassCard>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.loginBtn}
            onPress={() => router.push('/(auth)/login')}
            activeOpacity={0.85}
          >
            <Text style={styles.loginBtnText}>이미 계정이 있어요</Text>
          </TouchableOpacity>
        </View>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  safe: {
    flex: 1,
    paddingHorizontal: 28,
    paddingTop: Platform.OS === 'web' ? 60 : 20,
    paddingBottom: Platform.OS === 'web' ? 48 : 0,
  },
  // 홀로그램 장식 오브
  orb1: {
    position: 'absolute', width: 220, height: 220, borderRadius: 110,
    backgroundColor: 'rgba(255,255,255,0.12)', top: -60, right: -60,
  },
  orb2: {
    position: 'absolute', width: 160, height: 160, borderRadius: 80,
    backgroundColor: 'rgba(192,132,252,0.2)', bottom: 160, left: -40,
  },
  orb3: {
    position: 'absolute', width: 100, height: 100, borderRadius: 50,
    backgroundColor: 'rgba(255,255,255,0.08)', bottom: 80, right: 40,
  },
  // 로고
  logoBadge: {
    alignSelf: 'flex-start', paddingVertical: 10, paddingHorizontal: 14,
    marginBottom: 20,
  },
  logoEmoji: { fontSize: 24 },
  top: { flex: 1, justifyContent: 'center', paddingBottom: 32 },
  logo: {
    fontSize: 60, fontWeight: '900', color: '#FFFFFF',
    letterSpacing: -2, marginBottom: 10,
  },
  tagline: {
    fontSize: 20, fontWeight: '700', color: 'rgba(255,255,255,0.95)',
    marginBottom: 16,
  },
  desc: {
    fontSize: 15, color: 'rgba(255,255,255,0.72)', lineHeight: 24, marginBottom: 28,
  },
  tagRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  featureTag: { paddingVertical: 7, paddingHorizontal: 14, borderRadius: 20 },
  featureTagText: { fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.9)' },
  // 버튼
  bottom: { gap: 12, paddingBottom: 16 },
  signupBtn: {
    borderRadius: 18, paddingVertical: 18, alignItems: 'center',
  },
  signupBtnText: { fontSize: 17, fontWeight: '800', color: '#FF6B9D' },
  loginBtn: {
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.5)',
    borderRadius: 18, paddingVertical: 17, alignItems: 'center',
  },
  loginBtnText: { fontSize: 16, fontWeight: '600', color: 'rgba(255,255,255,0.85)' },
});
