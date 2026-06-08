import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, KeyboardAvoidingView, Platform, Alert,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { Colors } from '../../constants/colors';

const TOTAL_STEPS = 3;

export default function SignupScreen() {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [nickname, setNickname] = useState('');

  const isStepValid = () => {
    switch (step) {
      case 1:
        return (
          email.includes('@') &&
          email.includes('.') &&
          password.length >= 8 &&
          password === passwordConfirm
        );
      case 2: return nickname.length >= 2 && nickname.length <= 12;
      case 3: return true;
      default: return false;
    }
  };

  const handleNext = async () => {
    if (step < TOTAL_STEPS) {
      setStep((s) => s + 1);
      return;
    }

    setLoading(true);

    const { error: signUpError } = await supabase.auth.signUp({ email, password });
    if (signUpError) {
      if (signUpError.message.includes('already registered') || signUpError.message.includes('already been registered')) {
        Alert.alert('이미 가입된 이메일', '해당 이메일로 이미 계정이 있어요. 로그인해주세요.');
        router.replace('/(auth)/login');
        setLoading(false);
        return;
      }
      Alert.alert('회원가입 오류', signUpError.message);
      setLoading(false);
      return;
    }

    const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({ email, password });
    if (loginError) {
      const msg = loginError.message.includes('Email not confirmed')
        ? '가입 확인 이메일을 발송했어요.\n받은 편지함에서 인증 후 로그인해주세요.'
        : '가입은 완료됐어요. 로그인 화면에서 로그인해주세요.';
      Alert.alert('안내', msg);
      router.replace('/(auth)/login');
      setLoading(false);
      return;
    }

    if (loginData.session) {
      await supabase.from('profiles').upsert({
        id: loginData.session.user.id,
        user_id: loginData.session.user.id,
        nickname,
        points: 1000,
      }, { onConflict: 'user_id' });
    }

    setLoading(false);
    router.replace('/(tabs)');
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <StepWrapper title="계정을 만들어요" desc="이메일과 비밀번호를 입력해주세요" step={step} total={TOTAL_STEPS}>
            <TextInput
              style={[styles.input, { marginBottom: 12 }]}
              placeholder="이메일 주소"
              placeholderTextColor={Colors.sub}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <TextInput
              style={[styles.input, { marginBottom: 12 }]}
              placeholder="비밀번호 (8자 이상)"
              placeholderTextColor={Colors.sub}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
            <TextInput
              style={styles.input}
              placeholder="비밀번호 확인"
              placeholderTextColor={Colors.sub}
              value={passwordConfirm}
              onChangeText={setPasswordConfirm}
              secureTextEntry
            />
            {passwordConfirm.length > 0 && password !== passwordConfirm && (
              <Text style={styles.errorText}>비밀번호가 일치하지 않아요</Text>
            )}
          </StepWrapper>
        );
      case 2:
        return (
          <StepWrapper title="닉네임을 정해주세요" desc="커뮤니티에서 사용할 이름이에요" step={step} total={TOTAL_STEPS}>
            <TextInput
              style={styles.input}
              placeholder="2~12자 닉네임"
              placeholderTextColor={Colors.sub}
              value={nickname}
              onChangeText={setNickname}
              maxLength={12}
            />
            <Text style={styles.helper}>한글, 영문, 숫자 2~12자</Text>
          </StepWrapper>
        );
      case 3:
        return (
          <StepWrapper title="가입 완료!" desc="Pick D와 함께 나에게 딱 맞는 뷰티를 찾아보세요 ✨" step={step} total={TOTAL_STEPS}>
            <View style={styles.welcomeCard}>
              <Text style={styles.welcomeEmoji}>🎉</Text>
              <Text style={styles.welcomeNickname}>{nickname} 님</Text>
              <Text style={styles.welcomeDesc}>
                가입 축하 포인트 1,000pt가 지급됐어요!{'\n'}
                홈에서 프로필을 완성하면 맞춤 추천을 받을 수 있어요.
              </Text>
              <View style={styles.welcomePointBadge}>
                <Text style={styles.welcomePointText}>🪙 +1,000 포인트 지급</Text>
              </View>
            </View>
          </StepWrapper>
        );
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: Colors.white }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.nav}>
        <TouchableOpacity onPress={() => step > 1 ? setStep((s) => s - 1) : router.back()}>
          <Text style={styles.backBtn}>←</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.progressBar}>
        {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
          <View
            key={i}
            style={[
              styles.progressStep,
              i < step - 1 && styles.progressDone,
              i === step - 1 && styles.progressCurrent,
            ]}
          />
        ))}
      </View>

      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        {renderStep()}
      </ScrollView>

      <View style={styles.bottomAction}>
        <TouchableOpacity
          style={[styles.btn, !isStepValid() && styles.btnDisabled]}
          onPress={handleNext}
          disabled={!isStepValid() || loading}
        >
          {loading
            ? <ActivityIndicator color={Colors.white} />
            : <Text style={styles.btnText}>{step === TOTAL_STEPS ? '픽디 시작하기' : '다음'}</Text>
          }
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

function StepWrapper({
  title, desc, step, total, children,
}: {
  title: string; desc?: string; step: number; total: number; children: React.ReactNode;
}) {
  return (
    <View style={{ padding: 24, flex: 1 }}>
      <Text style={styles.stepIndicator}>STEP {step} / {total}</Text>
      <Text style={styles.stepTitle}>{title}</Text>
      {desc && <Text style={styles.stepDesc}>{desc}</Text>}
      <View style={{ marginTop: 24 }}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  nav: { paddingTop: 56, paddingHorizontal: 16, paddingBottom: 8 },
  backBtn: { fontSize: 24, color: Colors.text },
  progressBar: { flexDirection: 'row', gap: 4, paddingHorizontal: 20, paddingVertical: 8 },
  progressStep: { flex: 1, height: 3, borderRadius: 2, backgroundColor: Colors.border },
  progressDone: { backgroundColor: Colors.primary },
  progressCurrent: { backgroundColor: Colors.primaryLight },
  stepIndicator: { fontSize: 12, fontWeight: '700', color: Colors.primary, marginBottom: 8, letterSpacing: 0.5 },
  stepTitle: { fontSize: 24, fontWeight: '800', color: Colors.text, lineHeight: 32 },
  stepDesc: { fontSize: 14, color: Colors.sub, marginTop: 6, lineHeight: 20 },
  input: {
    borderWidth: 1.5, borderColor: Colors.border, borderRadius: 12,
    padding: 16, fontSize: 16, color: Colors.text, backgroundColor: Colors.white,
  },
  helper: { fontSize: 12, color: Colors.sub, marginTop: 8 },
  errorText: { fontSize: 12, color: Colors.danger, marginTop: 8 },
  welcomeCard: { alignItems: 'center', gap: 12, paddingVertical: 16 },
  welcomeEmoji: { fontSize: 56 },
  welcomeNickname: { fontSize: 22, fontWeight: '800', color: Colors.text },
  welcomeDesc: { fontSize: 14, color: Colors.sub, textAlign: 'center', lineHeight: 22 },
  welcomePointBadge: {
    backgroundColor: Colors.primaryLight, borderRadius: 20,
    paddingVertical: 8, paddingHorizontal: 20, marginTop: 4,
  },
  welcomePointText: { fontSize: 14, fontWeight: '700', color: Colors.primary },
  bottomAction: { padding: 20, paddingBottom: 40, backgroundColor: Colors.white },
  btn: { backgroundColor: Colors.primary, borderRadius: 12, padding: 16, alignItems: 'center' },
  btnDisabled: { backgroundColor: Colors.border },
  btnText: { color: Colors.white, fontSize: 16, fontWeight: '700' },
});
