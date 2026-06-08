import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator, Modal, ScrollView,
} from 'react-native';
import { useState } from 'react';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '../../lib/supabase';
import { Colors, HEADER_TOP } from '../../constants/colors';
import { GlassCard } from '../../components/GlassCard';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [showReset, setShowReset] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetSent, setResetSent] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) return;
    setLoading(true);
    setErrorMsg('');
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      if (error.message.includes('Invalid login credentials')) {
        setErrorMsg('이메일 또는 비밀번호가 올바르지 않아요');
      } else if (error.message.includes('Email not confirmed')) {
        setErrorMsg('이메일 인증이 필요해요. 받은 편지함을 확인해주세요');
      } else {
        setErrorMsg('로그인에 실패했어요. 다시 시도해주세요');
      }
    }
  };

  const handlePasswordReset = async () => {
    if (!resetEmail.includes('@')) return;
    setResetLoading(true);
    await supabase.auth.resetPasswordForEmail(resetEmail, {
      redirectTo: typeof window !== 'undefined' ? `${window.location.origin}/reset-password` : undefined,
    });
    setResetLoading(false);
    setResetSent(true);
  };

  return (
    <LinearGradient
      colors={['#FF6B9D', '#D473E8', '#9B6FE8']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.gradient}
    >
      {/* 장식 오브 */}
      <View style={styles.orb1} />
      <View style={styles.orb2} />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* 뒤로가기 */}
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Text style={styles.backText}>←</Text>
          </TouchableOpacity>

          {/* 헤더 */}
          <View style={styles.header}>
            <Text style={styles.logo}>Pick D</Text>
            <Text style={styles.subtitle}>다시 만나서 반가워요 🌸</Text>
          </View>

          {/* 폼 카드 */}
          <GlassCard style={styles.formCard} intensity="mid">
            <Text style={styles.formTitle}>로그인</Text>

            <View style={styles.inputWrap}>
              <Text style={styles.inputLabel}>이메일</Text>
              <TextInput
                style={styles.input}
                placeholder="example@email.com"
                placeholderTextColor="rgba(255,255,255,0.45)"
                value={email}
                onChangeText={(v) => { setEmail(v); setErrorMsg(''); }}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.inputWrap}>
              <Text style={styles.inputLabel}>비밀번호</Text>
              <TextInput
                style={styles.input}
                placeholder="비밀번호 입력"
                placeholderTextColor="rgba(255,255,255,0.45)"
                value={password}
                onChangeText={(v) => { setPassword(v); setErrorMsg(''); }}
                secureTextEntry
              />
            </View>

            {errorMsg ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>⚠️ {errorMsg}</Text>
              </View>
            ) : null}

            <TouchableOpacity
              style={[styles.btn, (!email || !password || loading) && styles.btnDisabled]}
              onPress={handleLogin}
              disabled={loading || !email || !password}
              activeOpacity={0.85}
            >
              {loading
                ? <ActivityIndicator color="#FF6B9D" />
                : <Text style={styles.btnText}>로그인</Text>
              }
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.forgotLink}
              onPress={() => { setShowReset(true); setResetEmail(email); setResetSent(false); }}
            >
              <Text style={styles.forgotText}>비밀번호를 잊으셨나요?</Text>
            </TouchableOpacity>
          </GlassCard>

          {/* 회원가입 링크 */}
          <TouchableOpacity
            style={styles.signupLink}
            onPress={() => router.push('/(auth)/signup')}
          >
            <Text style={styles.signupText}>
              계정이 없으신가요?{'  '}
              <Text style={styles.signupHighlight}>회원가입하기</Text>
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* 비밀번호 재설정 모달 */}
      <Modal visible={showReset} transparent animationType="fade" onRequestClose={() => setShowReset(false)}>
        <View style={styles.modalOverlay}>
          <GlassCard style={styles.modalCard} intensity="high">
            {resetSent ? (
              <>
                <Text style={styles.modalTitle}>✉️ 이메일 전송 완료</Text>
                <Text style={styles.modalDesc}>
                  {resetEmail}으로{'\n'}비밀번호 재설정 링크를 보냈어요
                </Text>
                <TouchableOpacity style={styles.modalBtn} onPress={() => setShowReset(false)}>
                  <Text style={styles.modalBtnText}>확인</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Text style={styles.modalTitle}>비밀번호 찾기</Text>
                <Text style={styles.modalDesc}>가입한 이메일로 재설정 링크를 보내드려요</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="이메일 주소"
                  placeholderTextColor="rgba(255,255,255,0.5)"
                  value={resetEmail}
                  onChangeText={setResetEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
                <View style={styles.modalBtns}>
                  <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setShowReset(false)}>
                    <Text style={styles.modalCancelText}>취소</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modalBtn, { flex: 1 }, !resetEmail.includes('@') && styles.btnDisabled]}
                    onPress={handlePasswordReset}
                    disabled={resetLoading || !resetEmail.includes('@')}
                  >
                    {resetLoading
                      ? <ActivityIndicator color="#FF6B9D" size="small" />
                      : <Text style={styles.modalBtnText}>전송</Text>
                    }
                  </TouchableOpacity>
                </View>
              </>
            )}
          </GlassCard>
        </View>
      </Modal>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  scroll: { flexGrow: 1, padding: 24, paddingTop: HEADER_TOP, paddingBottom: 40 },
  orb1: {
    position: 'absolute', width: 240, height: 240, borderRadius: 120,
    backgroundColor: 'rgba(255,255,255,0.1)', top: -80, right: -60,
  },
  orb2: {
    position: 'absolute', width: 180, height: 180, borderRadius: 90,
    backgroundColor: 'rgba(155,111,232,0.2)', bottom: 60, left: -50,
  },
  backBtn: { marginBottom: 24 },
  backText: { fontSize: 26, color: 'rgba(255,255,255,0.85)', fontWeight: '300' },
  header: { marginBottom: 32 },
  logo: { fontSize: 42, fontWeight: '900', color: '#fff', letterSpacing: -1.5, marginBottom: 6 },
  subtitle: { fontSize: 18, fontWeight: '600', color: 'rgba(255,255,255,0.85)' },
  formCard: { padding: 24, marginBottom: 24 },
  formTitle: { fontSize: 22, fontWeight: '800', color: '#fff', marginBottom: 24 },
  inputWrap: { marginBottom: 16 },
  inputLabel: { fontSize: 13, fontWeight: '700', color: 'rgba(255,255,255,0.7)', marginBottom: 8, letterSpacing: 0.3 },
  input: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)',
    borderRadius: 14, paddingVertical: 14, paddingHorizontal: 16,
    fontSize: 16, color: '#fff',
  },
  errorBox: {
    backgroundColor: 'rgba(255,59,48,0.2)', borderRadius: 10,
    padding: 12, marginBottom: 12,
  },
  errorText: { fontSize: 13, color: '#FFB3B0', fontWeight: '600' },
  btn: {
    backgroundColor: '#fff', borderRadius: 14, paddingVertical: 17,
    alignItems: 'center', marginTop: 8,
    shadowColor: 'rgba(0,0,0,0.2)', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1, shadowRadius: 12, elevation: 6,
  },
  btnDisabled: { backgroundColor: 'rgba(255,255,255,0.3)' },
  btnText: { fontSize: 16, fontWeight: '800', color: '#FF6B9D' },
  forgotLink: { marginTop: 16, alignItems: 'center' },
  forgotText: { fontSize: 13, color: 'rgba(255,255,255,0.65)' },
  signupLink: { alignItems: 'center' },
  signupText: { fontSize: 14, color: 'rgba(255,255,255,0.7)' },
  signupHighlight: { color: '#fff', fontWeight: '700' },
  // 모달
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  modalCard: { width: '100%', padding: 24 },
  modalTitle: { fontSize: 20, fontWeight: '800', color: '#fff', marginBottom: 10 },
  modalDesc: { fontSize: 14, color: 'rgba(255,255,255,0.75)', lineHeight: 22, marginBottom: 20 },
  modalInput: {
    backgroundColor: 'rgba(255,255,255,0.15)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)',
    borderRadius: 12, padding: 14, fontSize: 15, color: '#fff', marginBottom: 16,
  },
  modalBtns: { flexDirection: 'row', gap: 10 },
  modalCancelBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.3)', alignItems: 'center' },
  modalCancelText: { fontSize: 15, fontWeight: '600', color: 'rgba(255,255,255,0.7)' },
  modalBtn: { backgroundColor: '#fff', borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  modalBtnText: { color: '#FF6B9D', fontSize: 15, fontWeight: '800' },
});
