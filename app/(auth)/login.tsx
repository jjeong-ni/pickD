import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator, Modal,
} from 'react-native';
import { useState } from 'react';
import { router } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { Colors } from '../../constants/colors';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // 비밀번호 찾기 모달
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
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.inner}>
        <Text style={styles.logo}>Pick D</Text>
        <Text style={styles.subtitle}>내 피부에 딱 맞는 AI의 선택</Text>

        <TextInput
          style={styles.input}
          placeholder="이메일"
          placeholderTextColor={Colors.sub}
          value={email}
          onChangeText={(v) => { setEmail(v); setErrorMsg(''); }}
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <TextInput
          style={styles.input}
          placeholder="비밀번호"
          placeholderTextColor={Colors.sub}
          value={password}
          onChangeText={(v) => { setPassword(v); setErrorMsg(''); }}
          secureTextEntry
        />

        {errorMsg ? <Text style={styles.errorText}>{errorMsg}</Text> : null}

        <TouchableOpacity
          style={[styles.btn, (!email || !password) && styles.btnDisabled]}
          onPress={handleLogin}
          disabled={loading || !email || !password}
        >
          {loading
            ? <ActivityIndicator color={Colors.white} />
            : <Text style={styles.btnText}>로그인</Text>
          }
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.forgotLink}
          onPress={() => { setShowReset(true); setResetEmail(email); setResetSent(false); }}
        >
          <Text style={styles.forgotLinkText}>비밀번호를 잊으셨나요?</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.signupLink}
          onPress={() => router.push('/(auth)/signup')}
        >
          <Text style={styles.signupLinkText}>
            아직 계정이 없으신가요? <Text style={{ color: Colors.primary }}>회원가입</Text>
          </Text>
        </TouchableOpacity>
      </View>

      {/* 비밀번호 재설정 모달 */}
      <Modal visible={showReset} transparent animationType="fade" onRequestClose={() => setShowReset(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            {resetSent ? (
              <>
                <Text style={styles.modalTitle}>✉️ 이메일을 보냈어요</Text>
                <Text style={styles.modalDesc}>
                  {resetEmail}으로{'\n'}비밀번호 재설정 링크를 보냈어요.{'\n'}받은 편지함을 확인해주세요.
                </Text>
                <TouchableOpacity style={styles.modalBtn} onPress={() => setShowReset(false)}>
                  <Text style={styles.modalBtnText}>확인</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Text style={styles.modalTitle}>비밀번호 찾기</Text>
                <Text style={styles.modalDesc}>가입한 이메일 주소를 입력하면{'\n'}재설정 링크를 보내드려요</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="이메일 주소"
                  placeholderTextColor={Colors.sub}
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
                      ? <ActivityIndicator color={Colors.white} size="small" />
                      : <Text style={styles.modalBtnText}>전송</Text>
                    }
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.white },
  inner: { flex: 1, padding: 24, justifyContent: 'center' },
  logo: { fontSize: 40, fontWeight: '800', color: Colors.primary, marginBottom: 8, textAlign: 'center' },
  subtitle: { fontSize: 15, color: Colors.sub, textAlign: 'center', marginBottom: 48 },
  input: {
    borderWidth: 1.5, borderColor: Colors.border, borderRadius: 12,
    padding: 16, fontSize: 16, color: Colors.text, marginBottom: 12,
    backgroundColor: Colors.white,
  },
  errorText: { fontSize: 13, color: Colors.danger, marginBottom: 8, textAlign: 'center' },
  btn: {
    backgroundColor: Colors.primary, borderRadius: 12,
    padding: 16, alignItems: 'center', marginTop: 4,
  },
  btnDisabled: { backgroundColor: Colors.border },
  btnText: { color: Colors.white, fontSize: 16, fontWeight: '700' },
  forgotLink: { marginTop: 16, alignItems: 'center' },
  forgotLinkText: { fontSize: 13, color: Colors.sub },
  signupLink: { marginTop: 12, alignItems: 'center' },
  signupLinkText: { fontSize: 14, color: Colors.sub },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  modalSheet: {
    backgroundColor: Colors.white, borderRadius: 20, padding: 24, width: '100%',
    shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.15, shadowRadius: 20, elevation: 10,
  },
  modalTitle: { fontSize: 18, fontWeight: '800', color: Colors.text, marginBottom: 10 },
  modalDesc: { fontSize: 14, color: Colors.sub, lineHeight: 22, marginBottom: 20 },
  modalInput: {
    borderWidth: 1.5, borderColor: Colors.border, borderRadius: 12,
    padding: 14, fontSize: 15, color: Colors.text, marginBottom: 16,
  },
  modalBtns: { flexDirection: 'row', gap: 10 },
  modalCancelBtn: {
    flex: 1, paddingVertical: 14, borderRadius: 12,
    borderWidth: 1.5, borderColor: Colors.border, alignItems: 'center',
  },
  modalCancelText: { fontSize: 15, fontWeight: '600', color: Colors.sub },
  modalBtn: { backgroundColor: Colors.primary, borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  modalBtnText: { color: Colors.white, fontSize: 15, fontWeight: '700' },
});
