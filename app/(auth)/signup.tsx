import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, KeyboardAvoidingView, Platform, Alert,
  ActivityIndicator, Image,
} from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../../lib/supabase';
import { Colors } from '../../constants/colors';

const TOTAL_STEPS = 3;

const GENDERS = ['여성', '남성', '기타'];
const AGE_GROUPS = ['20대 초반', '20대 후반', '30대 초반', '30대 중반', '30대 후반', '40대 이상'];
const SKIN_TYPES = ['지성', '건성', '중성', '복합성', '민감성'];
const FACE_SHAPES = ['계란형', '둥근형', '사각형', '하트형', '긴형', '다이아몬드형'];
const SKIN_CONCERNS = ['주름', '색소침착', '모공', '리프팅', '수분', '홍조', '트러블', '탄력'];

export default function SignupScreen() {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // Page 1
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [nickname, setNickname] = useState('');

  // Page 2
  const [gender, setGender] = useState('');
  const [ageGroup, setAgeGroup] = useState('');
  const [skinType, setSkinType] = useState('');
  const [faceShape, setFaceShape] = useState('');
  const [concerns, setConcerns] = useState<string[]>([]);

  // Page 3
  const [facePhotoUri, setFacePhotoUri] = useState<string | null>(null);
  const [skipFace, setSkipFace] = useState(false);
  const cameraRequested = useRef(false);

  useEffect(() => {
    if (step === 3 && !cameraRequested.current) {
      cameraRequested.current = true;
      requestCamera();
    }
  }, [step]);

  const toggleConcern = (c: string) =>
    setConcerns(prev => prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c]);

  const requestCamera = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status === 'granted') {
      return; // 권한 승인 → 사용자가 직접 촬영 버튼 누름
    }
    Alert.alert(
      '얼굴형 정밀분석',
      '얼굴형 정밀분석을 하지 않으시겠습니까?',
      [
        {
          text: '아니오',
          style: 'cancel',
          onPress: () => {
            cameraRequested.current = false;
            requestCamera();
          },
        },
        {
          text: '네',
          onPress: () => setSkipFace(true),
        },
      ],
      { cancelable: false }
    );
  };

  const launchCamera = async () => {
    try {
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      if (!result.canceled) {
        setFacePhotoUri(result.assets[0].uri);
      }
    } catch {
      Alert.alert('오류', '카메라를 열 수 없어요. 설정에서 카메라 권한을 확인해주세요.');
    }
  };

  const isStepValid = () => {
    if (step === 1) {
      return (
        email.includes('@') && email.includes('.') &&
        password.length >= 8 &&
        password === passwordConfirm &&
        nickname.length >= 2 && nickname.length <= 12
      );
    }
    if (step === 2) return skinType !== '';
    return true; // step 3 always passable
  };

  const handleNext = async () => {
    if (step < TOTAL_STEPS) {
      setStep(s => s + 1);
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
        gender: gender || null,
        age_group: ageGroup || null,
        skin_type: skinType || null,
        face_shape: faceShape || null,
        concerns,
        points: 1000,
      }, { onConflict: 'user_id' });
    }

    setLoading(false);
    router.replace('/(tabs)');
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: Colors.bg }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* 헤더 */}
      <LinearGradient
        colors={['#FF6B9D', '#D473E8', '#9B6FE8']}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={styles.navGradient}
      >
        <TouchableOpacity onPress={() => step > 1 ? setStep(s => s - 1) : router.back()}>
          <Text style={styles.backBtn}>←</Text>
        </TouchableOpacity>
        <Text style={styles.navTitle}>회원가입</Text>
        <View style={{ width: 32 }} />
      </LinearGradient>

      {/* 프로그레스 바 */}
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

      {/* 컨텐츠 */}
      {step === 1 && (
        <ScrollView contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled">
          <Text style={styles.stepLabel}>STEP 1 / 3</Text>
          <Text style={styles.stepTitle}>계정을 만들어요</Text>
          <Text style={styles.stepDesc}>이메일, 비밀번호, 닉네임을 입력해주세요</Text>

          <View style={styles.card}>
            <Text style={styles.fieldLabel}>이메일</Text>
            <TextInput
              style={styles.input}
              placeholder="이메일 주소"
              placeholderTextColor={Colors.sub}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <Text style={[styles.fieldLabel, { marginTop: 16 }]}>비밀번호</Text>
            <TextInput
              style={styles.input}
              placeholder="비밀번호 (8자 이상)"
              placeholderTextColor={Colors.sub}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
            <TextInput
              style={[styles.input, { marginTop: 10 }]}
              placeholder="비밀번호 확인"
              placeholderTextColor={Colors.sub}
              value={passwordConfirm}
              onChangeText={setPasswordConfirm}
              secureTextEntry
            />
            {passwordConfirm.length > 0 && password !== passwordConfirm && (
              <Text style={styles.errorText}>비밀번호가 일치하지 않아요</Text>
            )}

            <Text style={[styles.fieldLabel, { marginTop: 16 }]}>닉네임</Text>
            <TextInput
              style={styles.input}
              placeholder="2~12자 닉네임"
              placeholderTextColor={Colors.sub}
              value={nickname}
              onChangeText={setNickname}
              maxLength={12}
            />
            <Text style={styles.helper}>한글, 영문, 숫자 2~12자</Text>
          </View>
        </ScrollView>
      )}

      {step === 2 && (
        <ScrollView contentContainerStyle={styles.page} showsVerticalScrollIndicator={false}>
          <Text style={styles.stepLabel}>STEP 2 / 3</Text>
          <Text style={styles.stepTitle}>피부 프로필을{'\n'}알려주세요</Text>
          <Text style={styles.stepDesc}>맞춤 시술·기기 추천에 사용됩니다</Text>

          <View style={styles.card}>
            {/* 성별 */}
            <SurveySection label="성별">
              {GENDERS.map(g => (
                <RadioItem key={g} label={g} selected={gender === g} onPress={() => setGender(g)} />
              ))}
            </SurveySection>

            <View style={styles.divider} />

            {/* 연령대 */}
            <SurveySection label="연령대">
              {AGE_GROUPS.map(a => (
                <RadioItem key={a} label={a} selected={ageGroup === a} onPress={() => setAgeGroup(ageGroup === a ? '' : a)} />
              ))}
            </SurveySection>

            <View style={styles.divider} />

            {/* 피부 타입 */}
            <SurveySection label="피부 타입" required>
              {SKIN_TYPES.map(s => (
                <RadioItem key={s} label={s} selected={skinType === s} onPress={() => setSkinType(s)} />
              ))}
            </SurveySection>

            <View style={styles.divider} />

            {/* 얼굴형 */}
            <SurveySection label="얼굴형">
              {FACE_SHAPES.map(f => (
                <RadioItem key={f} label={f} selected={faceShape === f} onPress={() => setFaceShape(faceShape === f ? '' : f)} />
              ))}
            </SurveySection>

            <View style={styles.divider} />

            {/* 피부 고민 */}
            <SurveySection label="피부 고민" sub="복수 선택 가능">
              {SKIN_CONCERNS.map(c => (
                <CheckItem key={c} label={c} checked={concerns.includes(c)} onPress={() => toggleConcern(c)} />
              ))}
            </SurveySection>
          </View>
        </ScrollView>
      )}

      {step === 3 && (
        <ScrollView contentContainerStyle={[styles.page, { alignItems: 'center' }]} showsVerticalScrollIndicator={false}>
          <Text style={styles.stepLabel}>STEP 3 / 3</Text>
          <Text style={styles.stepTitle}>얼굴형 정밀분석</Text>
          <Text style={styles.stepDesc}>셀피 사진으로 AI가 얼굴형을 분석해드려요{'\n'}언제든 나중에 진행할 수 있어요</Text>

          {facePhotoUri ? (
            <View style={styles.photoPreviewWrap}>
              <Image source={{ uri: facePhotoUri }} style={styles.photoPreview} />
              <TouchableOpacity style={styles.retakeBtn} onPress={launchCamera}>
                <Ionicons name="camera-outline" size={16} color={Colors.primary} />
                <Text style={styles.retakeBtnText}>다시 찍기</Text>
              </TouchableOpacity>
              <View style={styles.photoConfirm}>
                <Ionicons name="checkmark-circle" size={20} color={Colors.success} />
                <Text style={styles.photoConfirmText}>사진 촬영 완료! 가입 후 AI가 분석해드릴게요</Text>
              </View>
            </View>
          ) : skipFace ? (
            <View style={styles.skipBox}>
              <Ionicons name="time-outline" size={48} color={Colors.sub} />
              <Text style={styles.skipBoxTitle}>나중에 진행할게요</Text>
              <Text style={styles.skipBoxDesc}>마이페이지 → 얼굴형 정밀분석에서{'\n'}언제든 분석할 수 있어요</Text>
              <TouchableOpacity style={styles.retryBtn} onPress={() => { setSkipFace(false); cameraRequested.current = false; requestCamera(); }}>
                <Text style={styles.retryBtnText}>지금 촬영하기</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.cameraBox}>
              <View style={styles.faceOutline}>
                <Ionicons name="person-outline" size={80} color="rgba(255,107,157,0.4)" />
              </View>
              <Text style={styles.cameraHint}>전면 카메라를 사용해 정면 사진을 찍어주세요</Text>
              <TouchableOpacity style={styles.cameraBtn} onPress={launchCamera}>
                <LinearGradient
                  colors={['#FF6B9D', '#D473E8']}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                  style={styles.cameraBtnGrad}
                >
                  <Ionicons name="camera-outline" size={22} color="#fff" />
                  <Text style={styles.cameraBtnText}>카메라로 촬영하기</Text>
                </LinearGradient>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setSkipFace(true)} style={styles.skipLink}>
                <Text style={styles.skipLinkText}>나중에 하기</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      )}

      {/* 하단 버튼 */}
      <View style={styles.bottomAction}>
        <TouchableOpacity
          onPress={handleNext}
          disabled={!isStepValid() || loading}
          activeOpacity={0.85}
        >
          {isStepValid() && !loading ? (
            <LinearGradient
              colors={['#FF6B9D', '#D473E8']}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={styles.btn}
            >
              <Text style={styles.btnText}>{step === TOTAL_STEPS ? '픽디 시작하기' : '다음'}</Text>
            </LinearGradient>
          ) : (
            <View style={[styles.btn, styles.btnDisabled]}>
              {loading
                ? <ActivityIndicator color={Colors.white} />
                : <Text style={styles.btnText}>{step === TOTAL_STEPS ? '픽디 시작하기' : '다음'}</Text>}
            </View>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

// ─── 서브 컴포넌트 ────────────────────────────────────────────────────────────

function SurveySection({ label, required, sub, children }: {
  label: string; required?: boolean; sub?: string; children: React.ReactNode;
}) {
  return (
    <View style={styles.surveySection}>
      <View style={styles.surveySectionHeader}>
        <Text style={styles.surveySectionLabel}>
          {label}{required && <Text style={{ color: Colors.danger }}> *</Text>}
        </Text>
        {sub && <Text style={styles.surveySectionSub}>{sub}</Text>}
      </View>
      {children}
    </View>
  );
}

function RadioItem({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.surveyItem} onPress={onPress} activeOpacity={0.7}>
      <View style={[styles.radio, selected && styles.radioSelected]}>
        {selected && <View style={styles.radioDot} />}
      </View>
      <Text style={[styles.surveyItemLabel, selected && styles.surveyItemLabelActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

function CheckItem({ label, checked, onPress }: { label: string; checked: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.surveyItem} onPress={onPress} activeOpacity={0.7}>
      <View style={[styles.checkbox, checked && styles.checkboxChecked]}>
        {checked && <Ionicons name="checkmark" size={13} color="#fff" />}
      </View>
      <Text style={[styles.surveyItemLabel, checked && styles.surveyItemLabelActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

// ─── 스타일 ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  navGradient: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: Platform.OS === 'web' ? 60 : 56, paddingHorizontal: 16, paddingBottom: 16,
  },
  navTitle: { fontSize: 17, fontWeight: '700', color: Colors.white },
  backBtn: { fontSize: 24, color: Colors.white, width: 32 },

  progressBar: { flexDirection: 'row', gap: 4, paddingHorizontal: 20, paddingVertical: 10, backgroundColor: Colors.white },
  progressStep: { flex: 1, height: 3, borderRadius: 2, backgroundColor: Colors.border },
  progressDone: { backgroundColor: Colors.primary },
  progressCurrent: { backgroundColor: 'rgba(255,107,157,0.45)' },

  page: { padding: 20, gap: 0 },
  stepLabel: { fontSize: 12, fontWeight: '700', color: Colors.primary, letterSpacing: 0.5, marginBottom: 8 },
  stepTitle: { fontSize: 24, fontWeight: '800', color: Colors.text, lineHeight: 32, marginBottom: 6 },
  stepDesc: { fontSize: 14, color: Colors.sub, lineHeight: 20, marginBottom: 20 },

  card: {
    backgroundColor: Colors.white, borderRadius: 20, padding: 20,
    shadowColor: '#FF6B9D', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08, shadowRadius: 12, elevation: 3,
    borderWidth: 1, borderColor: Colors.border,
  },

  fieldLabel: { fontSize: 13, fontWeight: '700', color: Colors.text, marginBottom: 8 },
  input: {
    borderWidth: 1.5, borderColor: Colors.border, borderRadius: 12,
    padding: 14, fontSize: 15, color: Colors.text, backgroundColor: Colors.white,
  },
  helper: { fontSize: 12, color: Colors.sub, marginTop: 6 },
  errorText: { fontSize: 12, color: Colors.danger, marginTop: 6 },

  // Survey
  surveySection: { gap: 4, paddingVertical: 4 },
  surveySectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  surveySectionLabel: { fontSize: 15, fontWeight: '700', color: Colors.text },
  surveySectionSub: { fontSize: 12, color: Colors.sub },
  surveyItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  surveyItemLabel: { fontSize: 15, color: Colors.text, flex: 1 },
  surveyItemLabelActive: { color: Colors.primary, fontWeight: '600' },

  radio: {
    width: 22, height: 22, borderRadius: 11,
    borderWidth: 2, borderColor: Colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  radioSelected: { borderColor: Colors.primary },
  radioDot: { width: 11, height: 11, borderRadius: 6, backgroundColor: Colors.primary },

  checkbox: {
    width: 22, height: 22, borderRadius: 6,
    borderWidth: 2, borderColor: Colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  checkboxChecked: { backgroundColor: Colors.primary, borderColor: Colors.primary },

  divider: { height: 1, backgroundColor: Colors.border, marginVertical: 12 },

  // Camera (Step 3)
  cameraBox: { width: '100%', alignItems: 'center', gap: 16, paddingVertical: 8 },
  faceOutline: {
    width: 180, height: 180, borderRadius: 90,
    borderWidth: 3, borderColor: 'rgba(255,107,157,0.3)',
    borderStyle: 'dashed',
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#FFF5F9',
  },
  cameraHint: { fontSize: 14, color: Colors.sub, textAlign: 'center', lineHeight: 20 },
  cameraBtn: { width: '100%', borderRadius: 14, overflow: 'hidden' },
  cameraBtnGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, padding: 16 },
  cameraBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  skipLink: { paddingVertical: 8 },
  skipLinkText: { fontSize: 14, color: Colors.sub, textDecorationLine: 'underline' },

  photoPreviewWrap: { width: '100%', alignItems: 'center', gap: 14 },
  photoPreview: { width: 180, height: 180, borderRadius: 90, borderWidth: 3, borderColor: Colors.primary },
  retakeBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 6, paddingHorizontal: 14, borderRadius: 20, borderWidth: 1.5, borderColor: Colors.primary },
  retakeBtnText: { fontSize: 13, fontWeight: '600', color: Colors.primary },
  photoConfirm: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#E8F8EF', borderRadius: 12, padding: 12 },
  photoConfirmText: { fontSize: 13, color: Colors.success, fontWeight: '600', flex: 1 },

  skipBox: { width: '100%', alignItems: 'center', gap: 12, paddingVertical: 16 },
  skipBoxTitle: { fontSize: 18, fontWeight: '700', color: Colors.text },
  skipBoxDesc: { fontSize: 14, color: Colors.sub, textAlign: 'center', lineHeight: 22 },
  retryBtn: { marginTop: 8, paddingVertical: 10, paddingHorizontal: 24, borderRadius: 12, borderWidth: 1.5, borderColor: Colors.primary },
  retryBtnText: { fontSize: 14, fontWeight: '600', color: Colors.primary },

  bottomAction: { padding: 20, paddingBottom: Platform.OS === 'ios' ? 36 : 24, backgroundColor: Colors.white },
  btn: { borderRadius: 12, padding: 16, alignItems: 'center' },
  btnDisabled: { backgroundColor: Colors.border },
  btnText: { color: Colors.white, fontSize: 16, fontWeight: '700' },
});
