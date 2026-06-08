import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, KeyboardAvoidingView, Platform, Alert,
  ActivityIndicator, Image,
} from 'react-native';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { Colors, HEADER_TOP } from '../../constants/colors';

const TOTAL_STEPS = 3;

const GENDERS = ['여성', '남성', '기타'];
const AGE_GROUPS = ['20대 초반', '20대 후반', '30대 초반', '30대 중반', '30대 후반', '40대 이상'];
const SKIN_TYPES = ['지성', '건성', '중성', '복합성', '민감성'];
const FACE_SHAPES = ['계란형', '둥근형', '사각형', '하트형', '긴형', '다이아몬드형'];
const SKIN_CONCERNS = ['주름', '색소침착', '모공', '리프팅', '수분', '홍조', '트러블', '탄력'];

export default function SignupScreen() {
  const { setProfile } = useAuth();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // Page 1
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [nickname, setNickname] = useState('');
  const [nicknameChecked, setNicknameChecked] = useState(false);
  const [nicknameAvailable, setNicknameAvailable] = useState(false);
  const [nicknameChecking, setNicknameChecking] = useState(false);

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
    // 네이티브에서만 step 3 진입 시 카메라 자동 실행 (웹은 파일 다이얼로그로 열려 혼란)
    if (Platform.OS !== 'web' && step === 3 && !cameraRequested.current) {
      cameraRequested.current = true;
      requestCamera();
    }
  }, [step]);

  const toggleConcern = (c: string) =>
    setConcerns(prev => prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c]);

  const requestCamera = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status === 'granted') {
      await launchCamera();
      return;
    }
    Alert.alert(
      '얼굴형 정밀분석',
      '카메라 권한이 필요해요. 얼굴형 정밀분석을 건너뛰시겠습니까?',
      [
        {
          text: '다시 시도',
          style: 'cancel',
          onPress: () => {
            cameraRequested.current = false;
            requestCamera();
          },
        },
        {
          text: '나중에 하기',
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
        cameraType: ImagePicker.CameraType.front,
      });
      if (!result.canceled) {
        setFacePhotoUri(result.assets[0].uri);
      }
    } catch {
      Alert.alert('오류', '카메라를 열 수 없어요. 설정에서 카메라 권한을 확인해주세요.');
    }
  };

  const launchGallery = async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('권한 필요', '갤러리 접근 권한이 필요해요.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'] as any,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      if (!result.canceled) {
        setFacePhotoUri(result.assets[0].uri);
      }
    } catch {
      Alert.alert('오류', '갤러리를 열 수 없어요.');
    }
  };

  const checkNicknameDuplicate = async () => {
    if (nickname.length < 2) return;
    setNicknameChecking(true);
    const { data } = await supabase.from('profiles').select('user_id').eq('nickname', nickname).limit(1);
    setNicknameChecking(false);
    setNicknameChecked(true);
    setNicknameAvailable(!data || data.length === 0);
  };

  const isStepValid = () => {
    if (step === 1) {
      return (
        email.includes('@') && email.includes('.') &&
        password.length >= 8 &&
        password === passwordConfirm &&
        nickname.length >= 2 && nickname.length <= 12 &&
        nicknameChecked && nicknameAvailable
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

    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({ email, password });
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

    // Supabase returns session immediately when email confirmation is disabled.
    // If session is null, email confirmation is required.
    const session = signUpData?.session;
    if (!session) {
      Alert.alert(
        '이메일 인증 필요',
        '가입 확인 이메일을 발송했어요.\n받은 편지함에서 인증 후 로그인해주세요.'
      );
      router.replace('/(auth)/login');
      setLoading(false);
      return;
    }

    const userId = session.user.id;
    let facePhotoUrl: string | null = null;
    if (facePhotoUri) {
      try {
        const response = await fetch(facePhotoUri);
        const blob = await response.blob();
        const filePath = `${userId}.jpg`;
        const { error: uploadError } = await supabase.storage
          .from('face-photos')
          .upload(filePath, blob, { contentType: 'image/jpeg', upsert: true });
        if (!uploadError) {
          const { data: urlData } = supabase.storage
            .from('face-photos')
            .getPublicUrl(filePath);
          facePhotoUrl = urlData.publicUrl;
        }
      } catch {
        // 업로드 실패 시 설문 기반으로 진행
      }
    }

    const newProfile = {
      id: userId,
      user_id: userId,
      nickname,
      gender: gender || null,
      age_group: ageGroup || null,
      skin_type: skinType || null,
      face_shape: faceShape || null,
      concerns,
      points: 1000,
      face_photo_url: facePhotoUrl,
      skin_age: null,
      moisture_score: null,
      oil_score: null,
      baumann_code: null,
      skin_metrics: null,
      skin_dehydration: null,
      created_at: new Date().toISOString(),
    };
    await supabase.from('profiles').upsert(newProfile, { onConflict: 'user_id' });
    await supabase.from('point_logs').insert({ user_id: userId, amount: 1000, reason: '신규 가입' });
    setProfile(newProfile as any);
    await AsyncStorage.setItem('signup_popup', JSON.stringify({ nickname }));
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
            <View style={styles.nickRow}>
              <TextInput
                style={[styles.input, { flex: 1 }]}
                placeholder="2~12자 닉네임"
                placeholderTextColor={Colors.sub}
                value={nickname}
                onChangeText={(v) => { setNickname(v); setNicknameChecked(false); setNicknameAvailable(false); }}
                maxLength={12}
              />
              <TouchableOpacity
                style={[styles.nickCheckBtn, (nicknameChecking || nickname.length < 2) && { opacity: 0.4 }]}
                onPress={checkNicknameDuplicate}
                disabled={nicknameChecking || nickname.length < 2}
              >
                {nicknameChecking
                  ? <ActivityIndicator size="small" color={Colors.primary} />
                  : <Text style={styles.nickCheckBtnText}>중복확인</Text>}
              </TouchableOpacity>
            </View>
            {nicknameChecked ? (
              <Text style={[styles.helper, { color: nicknameAvailable ? Colors.success : Colors.danger, fontWeight: '600' }]}>
                {nicknameAvailable ? '✓ 사용 가능한 닉네임이에요' : '✗ 이미 사용중인 닉네임이에요'}
              </Text>
            ) : (
              <Text style={styles.helper}>한글, 영문, 숫자 2~12자 · 중복확인 필요</Text>
            )}
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
              <View style={styles.retakeRow}>
                <TouchableOpacity style={styles.retakeBtn} onPress={launchCamera}>
                  <Ionicons name="camera-outline" size={16} color={Colors.primary} />
                  <Text style={styles.retakeBtnText}>다시 찍기</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.retakeBtn} onPress={launchGallery}>
                  <Ionicons name="images-outline" size={16} color={Colors.primary} />
                  <Text style={styles.retakeBtnText}>앨범 변경</Text>
                </TouchableOpacity>
              </View>
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
              <Text style={styles.cameraHint}>정면 사진을 찍거나 앨범에서 선택해주세요</Text>
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
              <TouchableOpacity style={styles.galleryBtn} onPress={launchGallery}>
                <Ionicons name="images-outline" size={20} color={Colors.primary} />
                <Text style={styles.galleryBtnText}>앨범에서 선택하기</Text>
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
    paddingTop: HEADER_TOP, paddingHorizontal: 16, paddingBottom: 16,
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
  nickRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  nickCheckBtn: {
    paddingVertical: 14, paddingHorizontal: 14, borderRadius: 12,
    borderWidth: 1.5, borderColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  nickCheckBtnText: { fontSize: 13, fontWeight: '700', color: Colors.primary },

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
  galleryBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, width: '100%', borderRadius: 14, borderWidth: 1.5, borderColor: Colors.primary, paddingVertical: 14, paddingHorizontal: 20, justifyContent: 'center' },
  galleryBtnText: { fontSize: 16, fontWeight: '600', color: Colors.primary },
  skipLink: { paddingVertical: 8 },
  skipLinkText: { fontSize: 14, color: Colors.sub, textDecorationLine: 'underline' },

  photoPreviewWrap: { width: '100%', alignItems: 'center', gap: 14 },
  photoPreview: { width: 180, height: 180, borderRadius: 90, borderWidth: 3, borderColor: Colors.primary },
  retakeRow: { flexDirection: 'row', gap: 10 },
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
