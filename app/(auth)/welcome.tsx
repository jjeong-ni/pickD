import {
  View, Text, TouchableOpacity, StyleSheet, SafeAreaView, Platform,
} from 'react-native';
import { router } from 'expo-router';

export default function WelcomeScreen() {
  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safe}>
        {/* 로고 영역 */}
        <View style={styles.top}>
          <Text style={styles.logo}>Pick D</Text>
          <Text style={styles.tagline}>내 피부에 딱 맞는 AI의 선택</Text>
          <Text style={styles.desc}>
            광고가 아닌 데이터로, 감이 아닌 AI로{'\n'}
            수많은 뷰티 디바이스·시술 중{'\n'}
            나에게 딱 맞는 단 하나를 골라드려요
          </Text>
        </View>

        {/* 버튼 영역 */}
        <View style={styles.bottom}>
          <TouchableOpacity
            style={styles.signupBtn}
            onPress={() => router.push('/(auth)/signup')}
            activeOpacity={0.85}
          >
            <Text style={styles.signupBtnText}>회원가입 시작하기</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.loginBtn}
            onPress={() => router.push('/(auth)/login')}
            activeOpacity={0.85}
          >
            <Text style={styles.loginBtnText}>이미 계정이 있어요</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FF6B9D',
  },
  safe: {
    flex: 1,
    paddingHorizontal: 28,
    paddingTop: Platform.OS === 'web' ? 60 : 0,
    paddingBottom: Platform.OS === 'web' ? 48 : 0,
  },
  top: {
    flex: 1,
    justifyContent: 'center',
    paddingBottom: 32,
  },
  logo: {
    fontSize: 56,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -1.5,
    marginBottom: 12,
  },
  tagline: {
    fontSize: 20,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.95)',
    marginBottom: 20,
  },
  desc: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.75)',
    lineHeight: 24,
  },
  bottom: {
    gap: 12,
    paddingBottom: 16,
  },
  signupBtn: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  signupBtnText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FF6B9D',
  },
  loginBtn: {
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.6)',
    borderRadius: 16,
    paddingVertical: 17,
    alignItems: 'center',
  },
  loginBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.9)',
  },
});
