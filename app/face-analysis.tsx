import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Alert, Platform,
} from 'react-native';
import { useState, useEffect } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { Colors, HEADER_TOP } from '../constants/colors';

type FaceShape = '계란형' | '둥근형' | '사각형' | '하트형' | '긴형' | '다이아몬드형';
const ALL_SHAPES: FaceShape[] = ['계란형', '둥근형', '사각형', '하트형', '긴형', '다이아몬드형'];

interface ScoreMap { [key: string]: number }

const QUESTIONS: { q: string; hint: string; options: { label: string; scores: ScoreMap }[] }[] = [
  {
    q: '이마 너비는 어떤가요?',
    hint: '헤어라인 아래 이마 부분이 얼마나 넓어 보이나요?',
    options: [
      { label: '좁은 편이에요', scores: { 다이아몬드형: 2 } },
      { label: '중간 정도예요', scores: { 계란형: 1, 둥근형: 1, 긴형: 1 } },
      { label: '넓은 편이에요', scores: { 사각형: 2, 하트형: 1 } },
      { label: '매우 넓어요', scores: { 하트형: 2 } },
    ],
  },
  {
    q: '광대 너비는 어떤가요?',
    hint: '눈 아래 광대뼈 부분이 얼마나 두드러지나요?',
    options: [
      { label: '좁은 편이에요', scores: { 긴형: 2 } },
      { label: '중간 정도예요', scores: { 계란형: 1, 둥근형: 1, 하트형: 1 } },
      { label: '넓은 편이에요', scores: { 사각형: 2 } },
      { label: '가장 넓게 도드라져요', scores: { 다이아몬드형: 2 } },
    ],
  },
  {
    q: '턱선 형태는 어떤가요?',
    hint: '하안면과 턱 주변 라인이 어떻게 생겼나요?',
    options: [
      { label: '부드럽게 줄어드는 갸름한 형태', scores: { 계란형: 2 } },
      { label: '둥글고 짧아요', scores: { 둥근형: 2 } },
      { label: '각지거나 하관이 넓어요', scores: { 사각형: 2 } },
      { label: '매우 갸름하거나 뾰족해요', scores: { 하트형: 1, 다이아몬드형: 1, 긴형: 1 } },
    ],
  },
  {
    q: '얼굴 가로:세로 비율은?',
    hint: '거울을 보고 얼굴이 얼마나 길거나 짧아 보이나요?',
    options: [
      { label: '거의 정사각형에 가까워요', scores: { 둥근형: 2, 사각형: 1 } },
      { label: '약간 갸름한 편이에요', scores: { 계란형: 2 } },
      { label: '이마가 턱보다 확실히 넓어요', scores: { 하트형: 2 } },
      { label: '세로가 많이 긴 편이에요', scores: { 긴형: 2 } },
    ],
  },
  {
    q: '얼굴에서 가장 넓은 부분은?',
    hint: '정면에서 봤을 때 어디가 가장 두드러지나요?',
    options: [
      { label: '광대가 가장 두드러져요', scores: { 다이아몬드형: 2 } },
      { label: '이마/광대/턱 너비가 비슷해요', scores: { 사각형: 1, 둥근형: 1 } },
      { label: '이마 쪽이 가장 넓어요', scores: { 하트형: 2 } },
      { label: '전체적으로 균형잡혀 있어요', scores: { 계란형: 2 } },
    ],
  },
];

function calcShape(answers: (number | null)[]): FaceShape {
  const totals: Record<FaceShape, number> = {
    계란형: 0, 둥근형: 0, 사각형: 0, 하트형: 0, 긴형: 0, 다이아몬드형: 0,
  };
  answers.forEach((ans, qi) => {
    if (ans === null) return;
    Object.entries(QUESTIONS[qi].options[ans].scores).forEach(([k, v]) => {
      totals[k as FaceShape] += v;
    });
  });
  return ALL_SHAPES.reduce((best, s) => (totals[s] > totals[best] ? s : best), ALL_SHAPES[0]);
}

const RESULTS: Record<FaceShape, {
  emoji: string; subtitle: string; desc: string;
  concerns: string[];
  treatments: { name: string; duration: string; downtime: string }[];
  devices: { name: string; freq: string }[];
  budget: string;
}> = {
  계란형: {
    emoji: '🥚', subtitle: '황금 기준형',
    desc: '상·중·하안 비율이 균형잡힌 이상적인 얼굴형이에요. 노화 예방과 현상 유지가 핵심이에요.',
    concerns: [
      '볼 처짐·팔자주름·관자놀이 꺼짐 예방',
      '자연스러운 리프팅 + 볼륨 동시 관리',
      '피부 타입에 맞는 홈케어 디바이스 활용',
    ],
    treatments: [
      { name: '울쎄라 리프팅', duration: '12~18개월', downtime: '없음~1일' },
      { name: '실리프팅', duration: '6~12개월', downtime: '1~3일' },
      { name: '스킨부스터 (리쥬란)', duration: '6개월', downtime: '2~3일' },
    ],
    devices: [
      { name: '고주파 (RF)', freq: '주 2~3회, 회당 15~20분' },
      { name: 'LED 적색광', freq: '매일 가능, 회당 10~15분' },
    ],
    budget: '저: 스킨부스터 10~20만원 / 중: 울쎄라 30~60만원',
  },
  둥근형: {
    emoji: '⭕', subtitle: '볼살 · 짧은 턱선',
    desc: '가로세로 비율이 1:1에 가깝고 볼이 풍성한 얼굴형이에요. 세로 길이감을 살려주는 방향이 포인트예요.',
    concerns: [
      '세로 길이감을 늘려주는 방향으로 관리',
      '교근 보톡스로 하안면 슬리밍 효과',
      '확실한 리프팅 + 지방 분해 시술 효과적',
    ],
    treatments: [
      { name: '교근 보톡스', duration: '4~6개월', downtime: '없음 (2~4주 후 효과)' },
      { name: '턱 필러', duration: '12~18개월', downtime: '1~2일' },
      { name: 'HIFU 리프팅', duration: '6~12개월', downtime: '없음~1일' },
    ],
    devices: [
      { name: 'EMS (근육전기자극)', freq: '주 3~5회, 회당 10~15분' },
      { name: '고주파 (RF)', freq: '주 2~3회, 회당 15분' },
    ],
    budget: '저: 교근 보톡스 5~10만원 / 중: 턱 필러 15~30만원',
  },
  사각형: {
    emoji: '⬜', subtitle: '강한 각진 턱선',
    desc: '이마·광대·턱 너비가 비슷하고 하악각이 뚜렷한 얼굴형이에요. 교근 보톡스가 핵심 시술이에요.',
    concerns: [
      '교근 볼륨 축소로 하악각 완화',
      '볼~광대 리프팅으로 역삼각형 방향 교정',
      '이마 볼륨으로 위아래 균형 조절',
    ],
    treatments: [
      { name: '교근 보톡스', duration: '4~6개월', downtime: '없음 (2~4주 후 효과)' },
      { name: '실리프팅', duration: '6~12개월', downtime: '1~3일' },
      { name: '이마 필러', duration: '12~18개월', downtime: '1~2일' },
    ],
    devices: [
      { name: 'EMS (근육전기자극)', freq: '주 3회, 회당 10분 (교근 집중)' },
      { name: '고주파 (RF)', freq: '주 2~3회, 회당 15분' },
    ],
    budget: '저: 교근 보톡스 7~15만원 / 중: 교근+실리프팅 50~80만원',
  },
  하트형: {
    emoji: '💖', subtitle: '넓은 이마 · 좁은 턱',
    desc: '이마가 가장 넓고 턱으로 갈수록 V자형으로 좁아지는 얼굴형이에요. 하안면 볼륨 보충이 포인트예요.',
    concerns: [
      '하안면(볼·턱)에 볼륨 보충으로 역삼각형 완화',
      '이마 너비감을 시각적으로 축소',
      '지방 분해보다 볼륨감 있는 리프팅 추천',
    ],
    treatments: [
      { name: '볼·턱 필러', duration: '12~18개월', downtime: '1~2일' },
      { name: '교근 주변 보톡스', duration: '4~6개월', downtime: '없음' },
      { name: '실리프팅', duration: '6~12개월', downtime: '1~3일' },
    ],
    devices: [
      { name: 'EMS (근육전기자극)', freq: '주 3~4회, 회당 10~15분' },
      { name: '고주파 (RF)', freq: '주 2~3회, 회당 15분' },
    ],
    budget: '저: 교근 보톡스 7~15만원 / 중: 볼·턱 필러 30~60만원',
  },
  긴형: {
    emoji: '🖼️', subtitle: '세로가 긴 얼굴',
    desc: '가로 대비 세로 길이가 두드러진 얼굴형이에요. 볼·광대 볼륨으로 가로 너비감을 늘리는 것이 포인트예요.',
    concerns: [
      '볼·광대에 볼륨 더해 가로 너비감 형성',
      '앞머리 활용이 가장 쉬운 비침습 방법',
      '세로를 더 강조하는 스타일 피하기',
    ],
    treatments: [
      { name: '볼·광대 필러', duration: '12~18개월', downtime: '1~2일' },
      { name: '이마 보톡스', duration: '3~4개월', downtime: '없음' },
      { name: '실리프팅', duration: '6~12개월', downtime: '1~3일' },
    ],
    devices: [
      { name: 'EMS (근육전기자극)', freq: '주 3~4회, 회당 10~15분' },
      { name: '고주파 (RF)', freq: '주 2~3회, 회당 15분' },
    ],
    budget: '저: 이마 보톡스 5~10만원 / 중: 볼 필러 20~40만원',
  },
  다이아몬드형: {
    emoji: '💎', subtitle: '도드라진 광대',
    desc: '이마와 턱이 좁고 광대뼈가 가장 넓게 도드라지는 마름모꼴 얼굴형이에요. 이마 볼륨으로 균형을 맞추는 것이 핵심이에요.',
    concerns: [
      '이마 볼륨으로 위아래 균형 개선',
      '교근 보톡스로 광대 넓어 보임 완화',
      '볼 하부 볼륨 보충으로 하안면 풍성하게',
    ],
    treatments: [
      { name: '교근 보톡스', duration: '4~6개월', downtime: '없음' },
      { name: '이마 필러', duration: '12~18개월', downtime: '1~2일' },
      { name: '볼 하부 필러', duration: '12~18개월', downtime: '1~2일' },
    ],
    devices: [
      { name: 'EMS (근육전기자극)', freq: '주 3회, 회당 10분' },
      { name: '고주파 (RF)', freq: '주 2~3회, 회당 15분' },
    ],
    budget: '저: 교근 보톡스 7~15만원 / 중: 이마+볼 필러 40~70만원',
  },
};

export default function FaceAnalysisScreen() {
  const { user, profile, fetchProfile } = useAuth();
  const { viewResult } = useLocalSearchParams<{ viewResult?: string }>();
  const isViewMode = viewResult === 'true';

  // step: -1 = 사진 촬영, 0~4 = 퀴즈, 5 = 결과
  const [step, setStep] = useState(isViewMode ? 5 : -1);
  const [answers, setAnswers] = useState<(number | null)[]>(Array(5).fill(null));
  const [selected, setSelected] = useState<number | null>(null);
  const [result, setResult] = useState<FaceShape | null>(null);
  const [saving, setSaving] = useState(false);
  const [photoCapturing, setPhotoCapturing] = useState(false);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [skinTone, setSkinTone] = useState<{ label: string; hex: string; desc: string } | null>(null);
  const [skinAnalyzing, setSkinAnalyzing] = useState(false);

  useEffect(() => {
    if (isViewMode && profile?.face_shape) {
      setResult(profile.face_shape as FaceShape);
      setStep(5);
    }
  }, [isViewMode, profile?.face_shape]);

  const handleNext = () => {
    if (selected === null) return;
    const newAnswers = [...answers];
    newAnswers[step] = selected;
    setAnswers(newAnswers);
    setSelected(null);
    if (step < 4) {
      setStep(step + 1);
    } else {
      setResult(calcShape(newAnswers));
      setStep(5);
    }
  };

  const handleSave = async () => {
    if (!user || !result) return;
    setSaving(true);
    const { error } = await supabase.from('profiles').update({ face_shape: result }).eq('user_id', user.id);
    setSaving(false);
    if (error) {
      Alert.alert('저장 실패', '프로필 저장 중 문제가 발생했어요. 다시 시도해주세요.');
      return;
    }
    await fetchProfile(user.id);
    Alert.alert('저장 완료', `${result} 분석 결과가 프로필에 저장되었어요!`, [
      { text: '확인', onPress: () => router.back() },
    ]);
  };

  const handleRetake = () => {
    setStep(-1);
    setAnswers(Array(5).fill(null));
    setSelected(null);
    setResult(null);
    setPhotoUri(null);
    setSkinTone(null);
  };

  // 사진 촬영 → Vision API 백그라운드 → 퀴즈 시작
  const capturePhoto = async () => {
    if (!user) { router.push('/(auth)/login' as any); return; }
    setPhotoCapturing(true);
    try {
      let res;
      if (Platform.OS !== 'web') {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status === 'granted') {
          res = await ImagePicker.launchCameraAsync({
            mediaTypes: ['images'] as any, quality: 0.7, base64: true,
            allowsEditing: true, aspect: [1, 1],
          });
        } else {
          // 카메라 권한 없으면 갤러리 fallback
          const libPerm = await ImagePicker.requestMediaLibraryPermissionsAsync();
          if (!libPerm.granted) { Alert.alert('권한 필요', '카메라 또는 갤러리 접근 권한이 필요해요.'); return; }
          res = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'] as any, quality: 0.7, base64: true,
            allowsEditing: true, aspect: [1, 1],
          });
        }
      } else {
        res = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'] as any, quality: 0.7, base64: true,
          allowsEditing: true, aspect: [1, 1],
        });
      }
      if (!res || res.canceled || !res.assets[0]) return;
      setPhotoUri(res.assets[0].uri);
      // 퀴즈 즉시 시작
      setStep(0);
      // Vision API 백그라운드 실행
      if (res.assets[0].base64) runSkinVision(res.assets[0].base64);
    } finally {
      setPhotoCapturing(false);
    }
  };

  const runSkinVision = async (base64: string) => {
    setSkinAnalyzing(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const apiRes = await fetch(`${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/skin-vision`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
        body: JSON.stringify({ imageBase64: base64 }),
      });
      const data = await apiRes.json();
      if (!data.error && data.skinTone) setSkinTone(data.skinTone);
    } catch { /* 피부 톤 분석 실패는 무시 — 퀴즈 결과에 영향 없음 */ }
    finally { setSkinAnalyzing(false); }
  };

  const info = result ? RESULTS[result] : null;

  return (
    <View style={styles.container}>
      {/* 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Text style={styles.back}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>얼굴형 분석</Text>
        <View style={{ width: 32 }} />
      </View>

      {step === -1 ? (
        /* ── 사진 촬영 (필수 첫 단계) ── */
        <ScrollView contentContainerStyle={styles.quizContent} showsVerticalScrollIndicator={false}>
          <View style={styles.photoStepHeader}>
            <Ionicons name="camera" size={52} color={Colors.primary} />
            <Text style={styles.photoStepTitle}>먼저 얼굴 사진을 찍어주세요</Text>
            <Text style={styles.photoStepDesc}>
              사진으로 피부 톤을 분석하고{'\n'}
              이어서 5가지 질문으로 얼굴형을 정밀 진단해요
            </Text>
          </View>

          <View style={styles.photoTipsCard}>
            <Text style={styles.photoTipsTitle}>📌 좋은 사진 찍는 법</Text>
            {[
              '밝은 자연광 또는 실내 조명 아래에서 찍어요',
              '정면을 바라보고 표정 없이 찍어요',
              '메이크업을 하지 않은 맨 얼굴이 더 정확해요',
              '얼굴 전체가 화면에 들어오게 해요',
            ].map((t, i) => (
              <View key={i} style={styles.tipRow}>
                <Text style={styles.tipDot}>•</Text>
                <Text style={styles.tipText}>{t}</Text>
              </View>
            ))}
          </View>

          <TouchableOpacity style={styles.photoBtn} onPress={capturePhoto} disabled={photoCapturing}>
            {photoCapturing
              ? <ActivityIndicator color="#fff" />
              : <>
                  <Ionicons name={Platform.OS !== 'web' ? 'camera' : 'image'} size={22} color="#fff" />
                  <Text style={styles.photoBtnText}>
                    {Platform.OS !== 'web' ? '카메라로 촬영하기' : '갤러리에서 선택하기'}
                  </Text>
                </>}
          </TouchableOpacity>
        </ScrollView>
      ) : step < 5 ? (
        /* ── 퀴즈 ── */
        <>
          <ScrollView contentContainerStyle={styles.quizContent} showsVerticalScrollIndicator={false}>
            {/* 진행 표시 */}
            <View style={styles.progressRow}>
              {/* 사진 단계 (완료) */}
              <View style={[styles.dot, styles.dotDone, { flex: 0, width: 28 }]} />
              {QUESTIONS.map((_, i) => (
                <View key={i} style={[styles.dot, i < step && styles.dotDone, i === step && styles.dotActive]} />
              ))}
            </View>
            <Text style={styles.stepLabel}>📸 사진 완료 · 질문 {step + 1} / {QUESTIONS.length}</Text>

            <Text style={styles.question}>{QUESTIONS[step].q}</Text>
            <Text style={styles.hint}>{QUESTIONS[step].hint}</Text>

            <View style={styles.options}>
              {QUESTIONS[step].options.map((opt, idx) => (
                <TouchableOpacity
                  key={idx}
                  style={[styles.option, selected === idx && styles.optionSelected]}
                  onPress={() => setSelected(idx)}
                  activeOpacity={0.8}
                >
                  <View style={[styles.optionDot, selected === idx && styles.optionDotSelected]}>
                    {selected === idx && <View style={styles.optionDotInner} />}
                  </View>
                  <Text style={[styles.optionText, selected === idx && styles.optionTextSelected]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.nextBtn, selected === null && styles.nextBtnDisabled]}
              onPress={handleNext}
              disabled={selected === null}
            >
              <Text style={styles.nextBtnText}>{step < 4 ? '다음' : '결과 보기'}</Text>
            </TouchableOpacity>
          </View>
        </>
      ) : !result ? (
        /* ── 결과 없음 (뷰 모드인데 아직 분석 안 함) ── */
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, paddingHorizontal: 32 }}>
          <Text style={{ fontSize: 40 }}>🔍</Text>
          <Text style={{ fontSize: 17, fontWeight: '800', color: Colors.text, textAlign: 'center' }}>아직 얼굴형 분석을 완료하지 않았어요</Text>
          <Text style={{ fontSize: 14, color: Colors.sub, textAlign: 'center', lineHeight: 22 }}>사진 촬영 후 5가지 질문에 답하면{'\n'}나만의 얼굴형을 진단해 드려요</Text>
          <TouchableOpacity
            style={{ backgroundColor: Colors.primary, paddingVertical: 14, paddingHorizontal: 32, borderRadius: 14, marginTop: 8 }}
            onPress={handleRetake}
          >
            <Text style={{ color: '#fff', fontSize: 15, fontWeight: '700' }}>지금 분석 시작하기</Text>
          </TouchableOpacity>
        </View>
      ) : (
        /* ── 결과 ── */
        <>
          <ScrollView contentContainerStyle={styles.resultContent} showsVerticalScrollIndicator={false}>
            {/* 결과 헤더 */}
            <View style={styles.resultHeader}>
              <Text style={styles.resultEmoji}>{info?.emoji ?? '🔍'}</Text>
              <Text style={styles.resultType}>{result}</Text>
              <View style={styles.resultBadge}>
                <Text style={styles.resultBadgeText}>{info?.subtitle ?? ''}</Text>
              </View>
              <Text style={styles.resultDesc}>{info?.desc ?? ''}</Text>
            </View>

            {/* 피부 톤 (사진 분석 결과) */}
            {(skinTone || skinAnalyzing) && (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>🎨 피부 톤 분석</Text>
                {skinAnalyzing ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <ActivityIndicator color={Colors.primary} />
                    <Text style={{ fontSize: 13, color: Colors.sub }}>사진 분석 중...</Text>
                  </View>
                ) : skinTone ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                    <View style={[styles.toneCircle, { backgroundColor: skinTone.hex }]} />
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 16, fontWeight: '700', color: Colors.text }}>{skinTone.label}</Text>
                      <Text style={{ fontSize: 13, color: Colors.sub, marginTop: 3 }}>{skinTone.desc}</Text>
                    </View>
                  </View>
                ) : null}
              </View>
            )}

            {/* 보완 포인트 */}
            {info?.concerns && info.concerns.length > 0 && (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>💡 보완 포인트</Text>
                {info.concerns.map((c, i) => (
                  <View key={i} style={styles.bullet}>
                    <Text style={styles.bulletDot}>•</Text>
                    <Text style={styles.bulletText}>{c}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* 추천 시술 */}
            {info?.treatments && info.treatments.length > 0 && (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>💉 추천 시술 TOP 3</Text>
                {info.treatments.map((t, i) => (
                  <View key={i} style={[styles.treatRow, i < (info.treatments.length - 1) && styles.treatRowBorder]}>
                    <View style={styles.treatRank}>
                      <Text style={styles.treatRankText}>{i + 1}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.treatName}>{t.name}</Text>
                      <View style={styles.treatMeta}>
                        <Text style={styles.treatTag}>⏱ {t.duration}</Text>
                        <Text style={styles.treatTag}>🌿 다운타임 {t.downtime}</Text>
                      </View>
                    </View>
                  </View>
                ))}
                <View style={styles.budgetRow}>
                  <Text style={styles.budgetLabel}>💰 예상 비용</Text>
                  <Text style={styles.budgetText}>{info?.budget}</Text>
                </View>
              </View>
            )}

            {/* 추천 디바이스 */}
            {info?.devices && info.devices.length > 0 && (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>🏠 추천 홈케어 디바이스</Text>
                {info.devices.map((d, i) => (
                  <View key={i} style={[styles.deviceRow, i < (info.devices.length - 1) && styles.deviceRowBorder]}>
                    <Text style={styles.deviceName}>{d.name}</Text>
                    <Text style={styles.deviceFreq}>{d.freq}</Text>
                  </View>
                ))}
              </View>
            )}

            <View style={{ height: 8 }} />
          </ScrollView>

          <View style={styles.footer}>
            {!isViewMode && (
              user ? (
                <TouchableOpacity style={styles.nextBtn} onPress={handleSave} disabled={saving}>
                  {saving
                    ? <ActivityIndicator color={Colors.white} />
                    : <Text style={styles.nextBtnText}>내 프로필에 저장하기</Text>}
                </TouchableOpacity>
              ) : (
                <TouchableOpacity style={styles.nextBtn} onPress={() => router.push('/(auth)/login' as any)}>
                  <Text style={styles.nextBtnText}>로그인하고 저장하기</Text>
                </TouchableOpacity>
              )
            )}
            <TouchableOpacity style={styles.retakeBtn} onPress={isViewMode ? () => router.back() : handleRetake}>
              <Text style={styles.retakeBtnText}>{isViewMode ? '돌아가기' : '다시 진단하기'}</Text>
            </TouchableOpacity>
            {isViewMode && (
              <TouchableOpacity style={[styles.retakeBtn, { marginTop: 4 }]} onPress={handleRetake}>
                <Text style={styles.retakeBtnText}>다시 진단하기</Text>
              </TouchableOpacity>
            )}
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.white },

  /* 헤더 */
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: HEADER_TOP, paddingHorizontal: 16, paddingBottom: 12,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  back: { fontSize: 24, color: Colors.text, width: 32 },
  title: { fontSize: 17, fontWeight: '700', color: Colors.text },

  /* 사진 촬영 단계 */
  photoStepHeader: { alignItems: 'center', gap: 12, marginBottom: 28, paddingTop: 12 },
  photoStepTitle: { fontSize: 22, fontWeight: '800', color: Colors.text, textAlign: 'center' },
  photoStepDesc: { fontSize: 14, color: Colors.sub, textAlign: 'center', lineHeight: 22 },
  photoTipsCard: {
    backgroundColor: Colors.bg, borderRadius: 16, padding: 16, gap: 10, marginBottom: 24,
  },
  photoTipsTitle: { fontSize: 13, fontWeight: '700', color: Colors.text, marginBottom: 2 },
  tipRow: { flexDirection: 'row', gap: 8 },
  tipDot: { fontSize: 13, color: Colors.primary, marginTop: 1 },
  tipText: { flex: 1, fontSize: 13, color: Colors.sub, lineHeight: 20 },
  photoBtn: {
    backgroundColor: Colors.primary, borderRadius: 16, paddingVertical: 18,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
  },
  photoBtnText: { fontSize: 16, fontWeight: '700', color: '#fff' },
  toneCircle: {
    width: 48, height: 48, borderRadius: 24, borderWidth: 2, borderColor: Colors.border, flexShrink: 0,
  },

  /* 퀴즈 */
  quizContent: { padding: 24, paddingBottom: 20 },
  progressRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  dot: {
    flex: 1, height: 4, borderRadius: 2, backgroundColor: Colors.border,
  },
  dotDone: { backgroundColor: Colors.primaryLight },
  dotActive: { backgroundColor: Colors.primary },
  stepLabel: { fontSize: 13, color: Colors.sub, marginBottom: 24 },
  question: { fontSize: 20, fontWeight: '700', color: Colors.text, lineHeight: 28, marginBottom: 8 },
  hint: { fontSize: 13, color: Colors.sub, marginBottom: 28 },
  options: { gap: 12 },
  option: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    borderWidth: 1.5, borderColor: Colors.border, borderRadius: 14,
    padding: 16, backgroundColor: Colors.white,
  },
  optionSelected: { borderColor: Colors.primary, backgroundColor: '#FFF0F5' },
  optionDot: {
    width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: Colors.border,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  optionDotSelected: { borderColor: Colors.primary },
  optionDotInner: { width: 12, height: 12, borderRadius: 6, backgroundColor: Colors.primary },
  optionText: { flex: 1, fontSize: 15, color: Colors.text, fontWeight: '500' },
  optionTextSelected: { color: Colors.primary, fontWeight: '600' },

  /* 푸터 버튼 */
  footer: {
    padding: 20, paddingBottom: 40, gap: 10,
    backgroundColor: Colors.white, borderTopWidth: 1, borderTopColor: Colors.border,
  },
  nextBtn: {
    backgroundColor: Colors.primary, borderRadius: 14, paddingVertical: 16,
    alignItems: 'center',
  },
  nextBtnDisabled: { backgroundColor: Colors.border },
  nextBtnText: { color: Colors.white, fontSize: 16, fontWeight: '700' },
  retakeBtn: { alignItems: 'center', paddingVertical: 8 },
  retakeBtnText: { fontSize: 14, color: Colors.sub },

  /* 결과 */
  resultContent: { padding: 20, gap: 16, paddingBottom: 8 },
  resultHeader: {
    alignItems: 'center', backgroundColor: Colors.bg,
    borderRadius: 20, padding: 28, gap: 8,
  },
  resultEmoji: { fontSize: 56, marginBottom: 4 },
  resultType: { fontSize: 26, fontWeight: '800', color: Colors.text },
  resultBadge: {
    backgroundColor: Colors.primary, borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 4,
  },
  resultBadgeText: { fontSize: 12, fontWeight: '700', color: Colors.white },
  resultDesc: { fontSize: 14, color: Colors.sub, lineHeight: 22, textAlign: 'center', marginTop: 4 },

  card: {
    backgroundColor: Colors.white, borderRadius: 16, padding: 20,
    borderWidth: 1, borderColor: Colors.border, gap: 12,
  },
  cardTitle: { fontSize: 15, fontWeight: '700', color: Colors.text },
  bullet: { flexDirection: 'row', gap: 8 },
  bulletDot: { fontSize: 14, color: Colors.primary, marginTop: 1, lineHeight: 20 },
  bulletText: { flex: 1, fontSize: 14, color: Colors.text, lineHeight: 20 },

  treatRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingBottom: 12 },
  treatRowBorder: { borderBottomWidth: 1, borderBottomColor: Colors.border },
  treatRank: {
    width: 24, height: 24, borderRadius: 12, backgroundColor: Colors.primaryLight,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2,
  },
  treatRankText: { fontSize: 12, fontWeight: '700', color: Colors.primary },
  treatName: { fontSize: 15, fontWeight: '600', color: Colors.text, marginBottom: 4 },
  treatMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  treatTag: { fontSize: 12, color: Colors.sub },
  budgetRow: { borderTopWidth: 1, borderTopColor: Colors.border, paddingTop: 12, gap: 4 },
  budgetLabel: { fontSize: 12, fontWeight: '700', color: Colors.sub },
  budgetText: { fontSize: 13, color: Colors.text },

  deviceRow: { paddingBottom: 10, gap: 4 },
  deviceRowBorder: { borderBottomWidth: 1, borderBottomColor: Colors.border, marginBottom: 2 },
  deviceName: { fontSize: 15, fontWeight: '600', color: Colors.text },
  deviceFreq: { fontSize: 13, color: Colors.sub },
});
