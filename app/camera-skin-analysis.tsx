import {
  View, Text, StyleSheet, TouchableOpacity, Image,
  ActivityIndicator, Alert, ScrollView, Platform,
} from 'react-native';
import { useState } from 'react';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { Colors, HEADER_TOP } from '../constants/colors';

interface SkinTone {
  label: string;
  desc: string;
  hex: string;
  warmth: string;
  brightness: number;
}

interface ImageQuality {
  blurred: boolean;
  underExposed: boolean;
  confidence: number;
}

interface FaceShape {
  shape: string;
  desc: string;
  confidence: number;
}

interface AnalysisResult {
  hasFace: boolean;
  imageQuality: ImageQuality | null;
  skinTone: SkinTone;
  faceShape: FaceShape | null;
  concerns: { label: string; score: number }[];
  topLabels: string[];
}

const CONCERN_CARE: Record<string, { treatments: string[]; devices: string[] }> = {
  '여드름·트러블': {
    treatments: ['PDT 광역동치료', '아쿠아필링', '레이저 여드름 치료'],
    devices: ['LED 청색광 기기', '갈바닉 클렌징 기기'],
  },
  '주름': {
    treatments: ['HIFU 리프팅', '보톡스', '필러', '레이저 리서페이싱'],
    devices: ['RF 고주파 기기', 'EMS 미세전류 기기'],
  },
  '모공': {
    treatments: ['아쿠아필링', '레이저 토닝', 'CO2 프락셀'],
    devices: ['진공흡입 기기', '초음파 클렌저'],
  },
  '홍조': {
    treatments: ['IPL 광치료', 'V빔 레이저', '진정 관리'],
    devices: ['LED 황색광 기기'],
  },
  '색소침착': {
    treatments: ['레이저 토닝', 'IPL 광치료', '피코레이저'],
    devices: ['IPL 홈케어 기기', 'LED 복합광 기기'],
  },
  '건조함': {
    treatments: ['스킨부스터 (리쥬란)', '물광주사', '수분 관리'],
    devices: ['초음파 흡수 기기', '스팀 기기', '갈바닉 흡수 모드'],
  },
};

function getToneCareAdvice(warmth: string): { foundation: string; care: string } {
  if (warmth === 'warm') return {
    foundation: '옐로우·피치 베이스 파운데이션이 잘 맞아요',
    care: '비타민C 세럼으로 피부 빛을 더욱 살려보세요',
  };
  if (warmth === 'cool') return {
    foundation: '핑크·로즈 베이스 파운데이션이 잘 맞아요',
    care: '나이아신아마이드 성분으로 피부 톤을 균일하게 해보세요',
  };
  return {
    foundation: '뉴트럴 베이스 파운데이션이 잘 맞아요',
    care: '다양한 성분 계열 모두 잘 맞는 균형 잡힌 피부예요',
  };
}

export default function CameraSkinAnalysisScreen() {
  const { user } = useAuth();
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);

  const pickImage = async (fromCamera: boolean) => {
    if (!user) {
      Alert.alert('로그인 필요', '피부 분석을 사용하려면 로그인이 필요해요.');
      return;
    }

    if (fromCamera && Platform.OS !== 'web') {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('권한 필요', '카메라 접근 권한이 필요해요. 설정에서 허용해주세요.');
        return;
      }
    }

    const picker = fromCamera && Platform.OS !== 'web'
      ? ImagePicker.launchCameraAsync
      : ImagePicker.launchImageLibraryAsync;

    const res = await picker({
      mediaTypes: ['images'] as any,
      quality: 0.7,
      base64: true,
      allowsEditing: true,
      aspect: [1, 1],
    });

    if (!res.canceled && res.assets[0]) {
      setImageUri(res.assets[0].uri);
      setImageBase64(res.assets[0].base64 ?? null);
      setResult(null);
    }
  };

  const analyze = async () => {
    if (!imageBase64) return;
    setAnalyzing(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const supabaseUrl = (supabase as any).supabaseUrl as string;
      const res = await fetch(`${supabaseUrl}/functions/v1/skin-vision`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ imageBase64 }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setResult(data as AnalysisResult);
    } catch (e: any) {
      Alert.alert('분석 실패', e.message ?? '분석 중 오류가 발생했어요. 다시 시도해주세요.');
    } finally {
      setAnalyzing(false);
    }
  };

  const reset = () => {
    setImageUri(null);
    setImageBase64(null);
    setResult(null);
  };

  return (
    <View style={styles.container}>
      {/* 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>카메라 피부 분석</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {!imageUri ? (
          /* ── 초기 화면 ── */
          <>
            <View style={styles.heroBox}>
              <Text style={styles.heroEmoji}>📸</Text>
              <Text style={styles.heroTitle}>AI 피부 사진 분석</Text>
              <Text style={styles.heroDesc}>
                셀피 또는 피부 사진을 업로드하면{'\n'}
                Google Vision AI가 피부 톤, 상태, 고민을{'\n'}
                즉시 분석해드려요
              </Text>
            </View>

            <View style={styles.tipsCard}>
              <Text style={styles.tipsTitle}>📌 좋은 분석을 위한 팁</Text>
              {[
                '밝은 자연광 또는 실내 조명 아래에서 촬영하세요',
                '메이크업을 하지 않은 맨 얼굴이 더 정확해요',
                '얼굴이 화면 중앙에 오도록 가까이 찍어주세요',
                '정면을 바라보고 표정 없이 찍어주세요',
              ].map((tip, i) => (
                <View key={i} style={styles.tipRow}>
                  <Text style={styles.tipDot}>•</Text>
                  <Text style={styles.tipText}>{tip}</Text>
                </View>
              ))}
            </View>

            <View style={styles.pickRow}>
              {Platform.OS !== 'web' && (
                <TouchableOpacity style={styles.pickBtn} onPress={() => pickImage(true)}>
                  <Ionicons name="camera" size={28} color={Colors.primary} />
                  <Text style={styles.pickBtnText}>카메라로{'\n'}촬영하기</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity style={styles.pickBtn} onPress={() => pickImage(false)}>
                <Ionicons name="image" size={28} color={Colors.primary} />
                <Text style={styles.pickBtnText}>갤러리에서{'\n'}선택하기</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.disclaimerBox}>
              <Text style={styles.disclaimerText}>
                ⚠️ 본 분석은 AI 이미지 인식 결과로, 의학적 진단이 아닙니다.
                정확한 피부 상태는 피부과 전문의 상담을 받으세요.
              </Text>
            </View>
          </>
        ) : !result ? (
          /* ── 사진 미리보기 ── */
          <>
            <View style={styles.previewWrap}>
              <Image source={{ uri: imageUri }} style={styles.previewImage} />
              <TouchableOpacity style={styles.retakeBtn} onPress={reset}>
                <Ionicons name="refresh" size={16} color={Colors.sub} />
                <Text style={styles.retakeBtnText}>다시 선택</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.analyzeBtn, analyzing && { opacity: 0.6 }]}
              onPress={analyze}
              disabled={analyzing}
            >
              {analyzing ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <ActivityIndicator color="#fff" />
                  <Text style={styles.analyzeBtnText}>AI 분석 중...</Text>
                </View>
              ) : (
                <Text style={styles.analyzeBtnText}>✨ 피부 분석 시작</Text>
              )}
            </TouchableOpacity>
          </>
        ) : (
          /* ── 결과 화면 ── */
          <>
            {/* 분석 이미지 썸네일 */}
            <View style={styles.resultThumbRow}>
              <Image source={{ uri: imageUri }} style={styles.resultThumb} />
              <View style={{ flex: 1 }}>
                <Text style={styles.resultHeaderLabel}>AI 피부 분석 완료</Text>
                <Text style={styles.resultHeaderSub}>
                  {result.hasFace ? '✅ 얼굴이 감지되었어요' : '⚠️ 얼굴을 감지하지 못했어요'}
                </Text>
                {result.imageQuality && (
                  <Text style={styles.resultHeaderSub}>
                    감지 정확도 {result.imageQuality.confidence}%
                    {result.imageQuality.blurred ? ' · 사진이 흐릿해요' : ''}
                    {result.imageQuality.underExposed ? ' · 조명이 어두워요' : ''}
                  </Text>
                )}
              </View>
            </View>

            {!result.hasFace && (
              <View style={styles.warnBox}>
                <Text style={styles.warnText}>
                  얼굴이 감지되지 않았어요. 얼굴이 잘 보이는 정면 사진을 다시 업로드하면 더 정확한 결과를 얻을 수 있어요.
                </Text>
              </View>
            )}

            {/* 피부 톤 */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>🎨 피부 톤 분석</Text>
              <View style={styles.toneRow}>
                <View style={[styles.toneCircle, { backgroundColor: result.skinTone.hex }]} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.toneLabel}>{result.skinTone.label}</Text>
                  <Text style={styles.toneDesc}>{result.skinTone.desc}</Text>
                </View>
              </View>
              {(() => {
                const care = getToneCareAdvice(result.skinTone.warmth);
                return (
                  <View style={styles.toneCareBox}>
                    <Text style={styles.toneCareItem}>💄 {care.foundation}</Text>
                    <Text style={styles.toneCareItem}>✨ {care.care}</Text>
                  </View>
                );
              })()}
            </View>

            {/* 얼굴형 */}
            {result.faceShape && result.faceShape.shape !== '분석 불가' && (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>🫦 얼굴형 분석</Text>
                <View style={styles.faceShapeRow}>
                  <View style={styles.faceShapeEmoji}>
                    <Text style={styles.faceShapeEmojiText}>
                      {({'계란형':'🥚','둥근형':'⭕','사각형':'⬜','하트형':'💖','긴형':'🖼️','다이아몬드형':'💎'} as any)[result.faceShape.shape] ?? '🫦'}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.faceShapeLabel}>{result.faceShape.shape}</Text>
                    <Text style={styles.faceShapeDesc}>{result.faceShape.desc}</Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={styles.searchBtn}
                  onPress={() => router.push('/face-analysis?viewResult=true' as any)}
                >
                  <Text style={styles.searchBtnText}>얼굴형 맞춤 시술 보기 →</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* 피부 고민 */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>🔍 감지된 피부 고민</Text>
              {result.concerns.length === 0 ? (
                <View style={styles.noConcernBox}>
                  <Text style={styles.noConcernEmoji}>🌟</Text>
                  <Text style={styles.noConcernText}>
                    특별한 피부 고민이 감지되지 않았어요{'\n'}현재 피부 상태가 양호해 보여요!
                  </Text>
                </View>
              ) : (
                result.concerns.map((c, i) => (
                  <View key={i} style={styles.concernRow}>
                    <View style={styles.concernChip}>
                      <Text style={styles.concernChipText}>{c.label}</Text>
                    </View>
                    <View style={styles.concernBarBg}>
                      <View style={[styles.concernBar, { width: `${c.score}%` as any }]} />
                    </View>
                    <Text style={styles.concernScore}>{c.score}%</Text>
                  </View>
                ))
              )}
            </View>

            {/* 맞춤 케어 추천 */}
            {result.concerns.length > 0 && (() => {
              const mainConcern = result.concerns[0].label;
              const care = CONCERN_CARE[mainConcern];
              if (!care) return null;
              return (
                <View style={styles.card}>
                  <Text style={styles.cardTitle}>💉 맞춤 케어 추천</Text>
                  <Text style={styles.careFor}>"{mainConcern}" 고민 집중 케어</Text>

                  <Text style={styles.careSubtitle}>클리닉 시술</Text>
                  {care.treatments.map((t, i) => (
                    <View key={i} style={styles.careItem}>
                      <Ionicons name="checkmark-circle" size={16} color={Colors.primary} />
                      <Text style={styles.careItemText}>{t}</Text>
                    </View>
                  ))}

                  <Text style={[styles.careSubtitle, { marginTop: 12 }]}>홈케어 기기</Text>
                  {care.devices.map((d, i) => (
                    <View key={i} style={styles.careItem}>
                      <Ionicons name="home" size={16} color={Colors.primary} />
                      <Text style={styles.careItemText}>{d}</Text>
                    </View>
                  ))}

                  <TouchableOpacity
                    style={styles.searchBtn}
                    onPress={() => router.push('/(tabs)/search' as any)}
                  >
                    <Text style={styles.searchBtnText}>픽디에서 시술·기기 검색하기 →</Text>
                  </TouchableOpacity>
                </View>
              );
            })()}

            {/* AI 감지 라벨 */}
            {result.topLabels.length > 0 && (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>🏷️ AI 감지 키워드</Text>
                <View style={styles.labelWrap}>
                  {result.topLabels.map((l, i) => (
                    <View key={i} style={styles.labelChip}>
                      <Text style={styles.labelChipText}>{l}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* 다시 분석 */}
            <TouchableOpacity style={styles.resetBtn} onPress={reset}>
              <Ionicons name="camera" size={16} color={Colors.primary} />
              <Text style={styles.resetBtnText}>다른 사진으로 다시 분석</Text>
            </TouchableOpacity>

            <View style={styles.disclaimerBox}>
              <Text style={styles.disclaimerText}>
                ⚠️ AI 이미지 분석 결과는 참고용이며 의학적 진단이 아닙니다.
                정확한 피부 진단은 피부과 전문의에게 받으세요.
              </Text>
            </View>
          </>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 16, paddingTop: HEADER_TOP, backgroundColor: Colors.white,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  title: { fontSize: 17, fontWeight: '700', color: Colors.text },
  content: { padding: 16, gap: 16 },

  heroBox: {
    backgroundColor: Colors.white, borderRadius: 20, padding: 28,
    alignItems: 'center', gap: 10,
  },
  heroEmoji: { fontSize: 56 },
  heroTitle: { fontSize: 22, fontWeight: '900', color: Colors.text },
  heroDesc: { fontSize: 14, color: Colors.sub, textAlign: 'center', lineHeight: 22 },

  tipsCard: { backgroundColor: Colors.white, borderRadius: 16, padding: 16, gap: 10 },
  tipsTitle: { fontSize: 14, fontWeight: '700', color: Colors.text, marginBottom: 2 },
  tipRow: { flexDirection: 'row', gap: 8 },
  tipDot: { fontSize: 14, color: Colors.primary, marginTop: 1 },
  tipText: { flex: 1, fontSize: 13, color: Colors.sub, lineHeight: 20 },

  pickRow: { flexDirection: 'row', gap: 12 },
  pickBtn: {
    flex: 1, backgroundColor: Colors.white, borderRadius: 16,
    paddingVertical: 24, alignItems: 'center', gap: 10,
    borderWidth: 1.5, borderColor: Colors.primaryLight,
  },
  pickBtnText: { fontSize: 13, fontWeight: '700', color: Colors.primary, textAlign: 'center' },

  disclaimerBox: {
    backgroundColor: '#FFF8E1', borderRadius: 12, padding: 14,
    borderLeftWidth: 3, borderLeftColor: '#F9A825',
  },
  disclaimerText: { fontSize: 11, color: '#7B6200', lineHeight: 18 },

  previewWrap: { alignItems: 'center', gap: 12 },
  previewImage: { width: 280, height: 280, borderRadius: 20, backgroundColor: Colors.border },
  retakeBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20,
    borderWidth: 1, borderColor: Colors.border,
  },
  retakeBtnText: { fontSize: 13, color: Colors.sub },

  analyzeBtn: {
    backgroundColor: Colors.primary, borderRadius: 16,
    paddingVertical: 16, alignItems: 'center',
  },
  analyzeBtnText: { fontSize: 16, fontWeight: '700', color: '#fff' },

  resultThumbRow: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: Colors.white, borderRadius: 16, padding: 14,
  },
  resultThumb: { width: 72, height: 72, borderRadius: 12, backgroundColor: Colors.border },
  resultHeaderLabel: { fontSize: 15, fontWeight: '800', color: Colors.text },
  resultHeaderSub: { fontSize: 12, color: Colors.sub, marginTop: 3 },

  warnBox: {
    backgroundColor: '#FFF3CD', borderRadius: 12, padding: 14,
    borderLeftWidth: 3, borderLeftColor: '#FFC107',
  },
  warnText: { fontSize: 13, color: '#856404', lineHeight: 20 },

  card: {
    backgroundColor: Colors.white, borderRadius: 16, padding: 18, gap: 12,
  },
  cardTitle: { fontSize: 15, fontWeight: '800', color: Colors.text },

  toneRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  toneCircle: {
    width: 56, height: 56, borderRadius: 28,
    borderWidth: 2, borderColor: Colors.border,
  },
  toneLabel: { fontSize: 16, fontWeight: '700', color: Colors.text },
  toneDesc: { fontSize: 13, color: Colors.sub, marginTop: 3 },
  toneCareBox: {
    backgroundColor: Colors.bg, borderRadius: 12, padding: 12, gap: 6,
  },
  toneCareItem: { fontSize: 13, color: Colors.sub, lineHeight: 20 },

  noConcernBox: { alignItems: 'center', gap: 8, paddingVertical: 8 },
  noConcernEmoji: { fontSize: 36 },
  noConcernText: { fontSize: 13, color: Colors.sub, textAlign: 'center', lineHeight: 20 },

  concernRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  concernChip: {
    backgroundColor: Colors.primaryLight, borderRadius: 8,
    paddingHorizontal: 8, paddingVertical: 3, minWidth: 90,
  },
  concernChipText: { fontSize: 11, fontWeight: '700', color: Colors.primary },
  concernBarBg: { flex: 1, height: 8, backgroundColor: Colors.border, borderRadius: 4, overflow: 'hidden' },
  concernBar: { height: 8, backgroundColor: Colors.primary, borderRadius: 4 },
  concernScore: { fontSize: 12, fontWeight: '700', color: Colors.primary, width: 36, textAlign: 'right' },

  careFor: { fontSize: 13, color: Colors.sub, marginTop: -4 },
  careSubtitle: { fontSize: 13, fontWeight: '700', color: Colors.text },
  careItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  careItemText: { fontSize: 13, color: Colors.sub },
  searchBtn: {
    backgroundColor: Colors.primaryLight, borderRadius: 12,
    paddingVertical: 12, alignItems: 'center', marginTop: 4,
  },
  searchBtnText: { fontSize: 13, fontWeight: '700', color: Colors.primary },

  labelWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  labelChip: {
    backgroundColor: Colors.bg, borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 6,
    borderWidth: 1, borderColor: Colors.border,
  },
  labelChipText: { fontSize: 12, color: Colors.sub },

  faceShapeRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  faceShapeEmoji: {
    width: 56, height: 56, borderRadius: 28, backgroundColor: Colors.primaryLight,
    alignItems: 'center', justifyContent: 'center',
  },
  faceShapeEmojiText: { fontSize: 28 },
  faceShapeLabel: { fontSize: 18, fontWeight: '800', color: Colors.text },
  faceShapeDesc: { fontSize: 13, color: Colors.sub, marginTop: 3, lineHeight: 20 },

  resetBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingVertical: 14, borderRadius: 14,
    borderWidth: 1.5, borderColor: Colors.primary,
  },
  resetBtnText: { fontSize: 14, fontWeight: '700', color: Colors.primary },
});
