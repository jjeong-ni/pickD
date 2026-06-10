import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  Alert, ActivityIndicator, Platform, Image,
} from 'react-native';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, HEADER_TOP } from '../constants/colors';

interface IngredientResult {
  good: string[];
  caution: string[];
  avoid: string[];
  rawText: string;
}

const GOOD_INGREDIENTS = [
  ['hyaluronic acid', '히알루론산'],
  ['niacinamide', '나이아신아마이드'],
  ['ceramide', '세라마이드'],
  ['vitamin c', '비타민C'],
  ['ascorbic acid', '아스코빅애씨드'],
  ['retinol', '레티놀'],
  ['retinyl', '레티닐'],
  ['peptide', '펩타이드'],
  ['adenosine', '아데노신'],
  ['panthenol', '판테놀'],
  ['centella', '센텔라'],
  ['cica', '시카'],
  ['squalane', '스쿠알란'],
  ['allantoin', '알란토인'],
  ['glycerin', '글리세린'],
  ['glycerine', '글리세린'],
  ['neem', '님'],
  ['green tea', '녹차'],
  ['aloe', '알로에'],
  ['beta-glucan', '베타글루칸'],
];

const CAUTION_INGREDIENTS = [
  ['alcohol denat', '알코올(변성)'],
  ['denatured alcohol', '변성알코올'],
  ['sd alcohol', 'SD알코올'],
  ['ethanol', '에탄올(고농도)'],
  ['parfum', '향료(합성)'],
  ['fragrance', '프래그런스'],
  ['limonene', '리모넨'],
  ['linalool', '리나롤'],
  ['eugenol', '유제놀'],
  ['propylene glycol', '프로필렌글리콜'],
  ['essential oil', '에센셜오일'],
];

const AVOID_INGREDIENTS = [
  ['sodium lauryl sulfate', 'SLS(황산염)'],
  ['sodium laureth sulfate', 'SLES'],
  ['sls', 'SLS'],
  ['sles', 'SLES'],
  ['methylparaben', '메틸파라벤'],
  ['propylparaben', '프로필파라벤'],
  ['butylparaben', '부틸파라벤'],
  ['formaldehyde', '포름알데히드'],
  ['dmdm hydantoin', 'DMDM하이단토인'],
  ['mineral oil', '미네랄오일'],
  ['petrolatum', '페트롤라툼'],
  ['oxybenzone', '옥시벤존'],
];

function analyzeIngredients(text: string): IngredientResult {
  const lower = text.toLowerCase();
  const good: string[] = [];
  const caution: string[] = [];
  const avoid: string[] = [];

  for (const [en, ko] of GOOD_INGREDIENTS) {
    if (lower.includes(en) || lower.includes(ko)) good.push(ko || en);
  }
  for (const [en, ko] of CAUTION_INGREDIENTS) {
    if (lower.includes(en) || lower.includes(ko)) caution.push(ko || en);
  }
  for (const [en, ko] of AVOID_INGREDIENTS) {
    if (lower.includes(en) || lower.includes(ko)) avoid.push(ko || en);
  }

  return { good, caution, avoid, rawText: text };
}

export default function IngredientAnalysisScreen() {
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<IngredientResult | null>(null);
  const [showRaw, setShowRaw] = useState(false);

  const pickImage = async (source: 'camera' | 'gallery') => {
    if (source === 'camera') {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) { Alert.alert('권한 필요', '카메라 권한이 필요해요.'); return; }
      const r = await ImagePicker.launchCameraAsync({ quality: 0.9 });
      if (!r.canceled) setImageUri(r.assets[0].uri);
    } else {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) { Alert.alert('권한 필요', '갤러리 권한이 필요해요.'); return; }
      const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'] as any, quality: 0.9 });
      if (!r.canceled) setImageUri(r.assets[0].uri);
    }
    setResult(null);
  };

  const handleAnalyze = async () => {
    if (!imageUri) return;
    setLoading(true);
    try {
      const resp = await fetch(imageUri);
      const blob = await resp.blob();
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const b64 = (reader.result as string).split(',')[1];
          resolve(b64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });

      const apiUrl = `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/skin-vision`;
      const res = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({ imageBase64: base64, feature: 'text' }),
      });

      if (!res.ok) throw new Error('API 오류');
      const data = await res.json();
      if (!data.text) {
        Alert.alert('텍스트 인식 실패', '성분표 텍스트를 인식할 수 없었어요. 더 선명한 사진으로 시도해주세요.');
        setLoading(false);
        return;
      }
      setResult(analyzeIngredients(data.text));
    } catch {
      Alert.alert('오류', '분석 중 오류가 발생했어요. 다시 시도해주세요.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#FF6B9D', '#D473E8', '#9B6FE8']}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backBtn}>←</Text>
        </TouchableOpacity>
        <Text style={styles.navTitle}>성분 분석</Text>
        <View style={{ width: 32 }} />
      </LinearGradient>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <View style={styles.descCard}>
          <Text style={styles.descTitle}>🔬 AI 성분 분석기</Text>
          <Text style={styles.descTxt}>
            화장품 성분표를 카메라로 찍으면 AI가{'\n'}주요 성분을 분석해드려요
          </Text>
        </View>

        {/* 이미지 영역 */}
        <View style={styles.imgArea}>
          {imageUri ? (
            <TouchableOpacity onPress={() => setImageUri(null)} activeOpacity={0.9}>
              <Image source={{ uri: imageUri }} style={styles.previewImg} resizeMode="contain" />
              <View style={styles.retakeOverlay}>
                <Ionicons name="refresh-outline" size={18} color="#fff" />
                <Text style={styles.retakeTxt}>다시 선택</Text>
              </View>
            </TouchableOpacity>
          ) : (
            <View style={styles.imgPlaceholder}>
              <Ionicons name="document-text-outline" size={52} color={Colors.border} />
              <Text style={styles.imgPlaceholderTxt}>성분표 사진을 선택해주세요</Text>
            </View>
          )}
        </View>

        {/* 버튼 영역 */}
        {!imageUri ? (
          <View style={styles.btnRow}>
            <TouchableOpacity style={styles.sourceBtn} onPress={() => pickImage('camera')}>
              <Ionicons name="camera-outline" size={22} color={Colors.primary} />
              <Text style={styles.sourceBtnTxt}>카메라</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.sourceBtn} onPress={() => pickImage('gallery')}>
              <Ionicons name="images-outline" size={22} color={Colors.primary} />
              <Text style={styles.sourceBtnTxt}>앨범</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity style={styles.analyzeBtn} onPress={handleAnalyze} disabled={loading}>
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.analyzeBtnTxt}>성분 분석하기</Text>}
          </TouchableOpacity>
        )}

        {/* 결과 */}
        {result && (
          <View style={styles.resultSection}>
            {result.good.length > 0 && (
              <View style={[styles.resultCard, styles.resultGood]}>
                <Text style={styles.resultTitle}>✅ 좋은 성분 ({result.good.length})</Text>
                <View style={styles.tagRow}>
                  {result.good.map((g) => (
                    <View key={g} style={[styles.tag, styles.tagGood]}><Text style={styles.tagTxt}>{g}</Text></View>
                  ))}
                </View>
              </View>
            )}
            {result.caution.length > 0 && (
              <View style={[styles.resultCard, styles.resultCaution]}>
                <Text style={styles.resultTitle}>⚠️ 주의 성분 ({result.caution.length})</Text>
                <Text style={styles.resultNote}>민감성 피부라면 패치테스트를 권장해요</Text>
                <View style={styles.tagRow}>
                  {result.caution.map((c) => (
                    <View key={c} style={[styles.tag, styles.tagCaution]}><Text style={styles.tagTxt}>{c}</Text></View>
                  ))}
                </View>
              </View>
            )}
            {result.avoid.length > 0 && (
              <View style={[styles.resultCard, styles.resultAvoid]}>
                <Text style={styles.resultTitle}>🚫 민감성 주의 성분 ({result.avoid.length})</Text>
                <Text style={styles.resultNote}>예민한 피부라면 사용 전 전문가 상담을 권장해요</Text>
                <View style={styles.tagRow}>
                  {result.avoid.map((a) => (
                    <View key={a} style={[styles.tag, styles.tagAvoid]}><Text style={styles.tagTxt}>{a}</Text></View>
                  ))}
                </View>
              </View>
            )}
            {result.good.length === 0 && result.caution.length === 0 && result.avoid.length === 0 && (
              <View style={styles.resultCard}>
                <Text style={styles.resultTitle}>인식된 주요 성분이 없어요</Text>
                <Text style={styles.resultNote}>성분표가 잘 보이도록 찍고 다시 시도해보세요</Text>
              </View>
            )}
            <TouchableOpacity onPress={() => setShowRaw(!showRaw)} style={styles.rawToggle}>
              <Text style={styles.rawToggleTxt}>{showRaw ? '원문 숨기기' : '인식된 텍스트 보기'}</Text>
              <Ionicons name={showRaw ? 'chevron-up' : 'chevron-down'} size={14} color={Colors.sub} />
            </TouchableOpacity>
            {showRaw && (
              <View style={styles.rawBox}>
                <Text style={styles.rawTxt}>{result.rawText}</Text>
              </View>
            )}
          </View>
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
    paddingTop: HEADER_TOP, paddingHorizontal: 16, paddingBottom: 16,
  },
  backBtn: { fontSize: 24, color: '#fff', width: 32 },
  navTitle: { fontSize: 17, fontWeight: '700', color: '#fff' },
  content: { padding: 16, gap: 14 },
  descCard: {
    backgroundColor: Colors.white, borderRadius: 16, padding: 16, gap: 6,
    borderWidth: 1, borderColor: Colors.border,
  },
  descTitle: { fontSize: 15, fontWeight: '800', color: Colors.text },
  descTxt: { fontSize: 13, color: Colors.sub, lineHeight: 20 },
  imgArea: {
    backgroundColor: Colors.white, borderRadius: 16,
    borderWidth: 1.5, borderColor: Colors.border, overflow: 'hidden',
    minHeight: 180, alignItems: 'center', justifyContent: 'center',
  },
  imgPlaceholder: { alignItems: 'center', gap: 10, paddingVertical: 40 },
  imgPlaceholderTxt: { fontSize: 14, color: Colors.sub },
  previewImg: { width: '100%', height: 220 },
  retakeOverlay: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: 'rgba(0,0,0,0.45)', paddingVertical: 8,
  },
  retakeTxt: { color: '#fff', fontSize: 13, fontWeight: '700' },
  btnRow: { flexDirection: 'row', gap: 10 },
  sourceBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: Colors.white, borderRadius: 14, paddingVertical: 14,
    borderWidth: 1.5, borderColor: Colors.primary,
  },
  sourceBtnTxt: { fontSize: 15, fontWeight: '700', color: Colors.primary },
  analyzeBtn: {
    backgroundColor: Colors.primary, borderRadius: 14,
    paddingVertical: 16, alignItems: 'center',
  },
  analyzeBtnTxt: { color: '#fff', fontSize: 16, fontWeight: '700' },
  resultSection: { gap: 10 },
  resultCard: {
    backgroundColor: Colors.white, borderRadius: 14, padding: 14, gap: 10,
    borderWidth: 1, borderColor: Colors.border,
  },
  resultGood: { borderColor: '#27AE60', backgroundColor: 'rgba(39,174,96,0.04)' },
  resultCaution: { borderColor: '#F5A623', backgroundColor: 'rgba(245,166,35,0.04)' },
  resultAvoid: { borderColor: Colors.danger, backgroundColor: 'rgba(255,59,48,0.04)' },
  resultTitle: { fontSize: 14, fontWeight: '800', color: Colors.text },
  resultNote: { fontSize: 12, color: Colors.sub },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  tag: { paddingVertical: 4, paddingHorizontal: 10, borderRadius: 20 },
  tagGood: { backgroundColor: 'rgba(39,174,96,0.12)' },
  tagCaution: { backgroundColor: 'rgba(245,166,35,0.12)' },
  tagAvoid: { backgroundColor: 'rgba(255,59,48,0.10)' },
  tagTxt: { fontSize: 12, fontWeight: '700', color: Colors.text },
  rawToggle: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 4 },
  rawToggleTxt: { fontSize: 12, color: Colors.sub },
  rawBox: {
    backgroundColor: Colors.white, borderRadius: 10, padding: 12,
    borderWidth: 1, borderColor: Colors.border,
  },
  rawTxt: { fontSize: 11, color: Colors.sub, lineHeight: 18 },
});
