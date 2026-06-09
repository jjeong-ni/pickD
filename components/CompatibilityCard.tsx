import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Modal,
  ScrollView, Linking,
} from 'react-native';
import { router } from 'expo-router';
import { Colors } from '../constants/colors';
import { Profile } from '../types';
import { calcCompatibility } from '../lib/compatibility';

interface Props {
  profile: Profile | null;
  user: any;
  category: string;
  itemName: string;
  coupangUrl?: string | null;
  itemType: 'device' | 'treatment';
}

const bar = StyleSheet.create({
  track: { flex: 1, height: 8, backgroundColor: '#F0E8F5', borderRadius: 4, overflow: 'hidden' },
  fill:  { height: 8, backgroundColor: Colors.primary, borderRadius: 4 },
});

function ScoreBar({ score }: { score: number }) {
  return (
    <View style={bar.track}>
      <View style={[bar.fill, { width: `${score}%` as any }]} />
    </View>
  );
}

function hearts(n: number) {
  return '🩷'.repeat(n) + '🤍'.repeat(5 - n);
}

export default function CompatibilityCard({
  profile, user, category, itemName, coupangUrl, itemType,
}: Props) {
  const [visible, setVisible] = useState(false);
  const noun = itemType === 'device' ? '기기' : '시술';

  const compat = profile?.skin_type
    ? calcCompatibility(category, profile.skin_type, profile.face_shape, itemType)
    : null;
  const score = compat?.score ?? 0;
  const filled = compat ? Math.round(score / 20) : 0;
  const isGood = score >= 71;

  const handleOpen = () => {
    if (!user) { router.push('/(auth)/login' as any); return; }
    if (!profile?.skin_type) { router.push('/skin-analysis' as any); return; }
    setVisible(true);
  };

  const handleCta = () => {
    setVisible(false);
    if (itemType === 'device') {
      const url = coupangUrl ?? `https://www.coupang.com/np/search?q=${encodeURIComponent(itemName)}`;
      Linking.openURL(url).catch(() => null);
    } else {
      router.push({ pathname: '/clinic-map', params: { treatmentName: itemName } } as any);
    }
  };

  return (
    <>
      {/* 미니 카드 */}
      <TouchableOpacity style={s.mini} onPress={handleOpen} activeOpacity={0.82}>
        <Text style={s.miniTitle}>💕 나와의 궁합</Text>
        {compat ? (
          <>
            <Text style={s.miniScore}>{score}%</Text>
            <Text style={s.miniHearts}>{hearts(filled)}</Text>
          </>
        ) : (
          <Text style={s.miniHint}>{!user ? '로그인 후 확인 ›' : '분석 후 확인 ›'}</Text>
        )}
      </TouchableOpacity>

      {/* 상세 모달 */}
      <Modal visible={visible} transparent animationType="slide" onRequestClose={() => setVisible(false)}>
        <View style={s.overlay}>
          <View style={s.sheet}>
            <TouchableOpacity style={s.closeBtn} onPress={() => setVisible(false)}>
              <Text style={s.closeTxt}>✕</Text>
            </TouchableOpacity>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.body}>
              <Text style={s.emoji}>💕</Text>
              <Text style={s.nickLine}>{profile?.nickname ?? ''}님과</Text>
              <Text style={s.itemLine} numberOfLines={2}>{itemName}</Text>
              <Text style={s.subLine}>의 궁합은?</Text>

              <View style={s.scoreRow}>
                <Text style={s.bigHearts}>{hearts(filled)}</Text>
                <Text style={s.bigScore}>{score}%</Text>
              </View>

              {/* 피부타입 분석 */}
              <View style={s.analysisBox}>
                <Text style={s.analysisTitle}>
                  피부타입 분석 · <Text style={s.highlight}>{profile?.skin_type}</Text>
                </Text>
                <View style={s.barRow}>
                  <ScoreBar score={compat?.skinScore ?? 0} />
                  <Text style={s.barPct}>{compat?.skinScore ?? 0}%</Text>
                </View>
                <Text style={s.reason}>{compat?.skinReason}</Text>
              </View>

              {/* 얼굴형 분석 */}
              {profile?.face_shape && (
                <View style={s.analysisBox}>
                  <Text style={s.analysisTitle}>
                    얼굴형 분석 · <Text style={s.highlight}>{profile.face_shape}</Text>
                  </Text>
                  <View style={s.barRow}>
                    <ScoreBar score={compat?.faceScore ?? 0} />
                    <Text style={s.barPct}>{compat?.faceScore ?? 0}%</Text>
                  </View>
                  <Text style={s.reason}>{compat?.faceReason}</Text>
                </View>
              )}

              {/* 결론 */}
              <View style={[s.resultBox, isGood ? s.resultGood : s.resultBad]}>
                <Text style={s.resultText}>
                  {'피부타입·얼굴형 분석을 바탕으로\n'}
                  <Text style={s.resultPct}>{score}%</Text>로 산정되었습니다.
                </Text>
                <Text style={s.verdict}>
                  {isGood ? `나와 잘 맞는 ${noun}에요! 🎉` : `크게 추천하지 않아요 😢`}
                </Text>
                {!isGood && (
                  <Text style={s.otherSuggest}>다른 {noun}를 보시겠습니까?</Text>
                )}
              </View>

              {/* CTA */}
              {isGood ? (
                <TouchableOpacity style={s.ctaPrimary} onPress={handleCta}>
                  <Text style={s.ctaPrimaryTxt}>
                    {itemType === 'device' ? '더 예뻐지시겠습니까? 🛒' : '더 예뻐지시겠습니까? 💉'}
                  </Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={s.ctaSecondary}
                  onPress={() => { setVisible(false); router.push('/(tabs)/search' as any); }}
                >
                  <Text style={s.ctaSecondaryTxt}>다른 {noun} 보러가기 ›</Text>
                </TouchableOpacity>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}

const s = StyleSheet.create({
  mini: {
    width: 110, backgroundColor: '#FFF0F6',
    borderRadius: 14, borderWidth: 1.5, borderColor: '#FFB3CC',
    padding: 10, alignItems: 'center', gap: 4,
  },
  miniTitle:  { fontSize: 10, fontWeight: '700', color: Colors.primary, textAlign: 'center' },
  miniScore:  { fontSize: 22, fontWeight: '900', color: Colors.primary },
  miniHearts: { fontSize: 10, letterSpacing: 1 },
  miniHint:   { fontSize: 10, color: Colors.sub, textAlign: 'center', lineHeight: 15 },

  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  sheet:   { backgroundColor: Colors.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '88%' },
  closeBtn:{ position: 'absolute', top: 16, right: 20, zIndex: 10, width: 32, height: 32, borderRadius: 16, backgroundColor: Colors.bg, alignItems: 'center', justifyContent: 'center' },
  closeTxt: { fontSize: 14, color: Colors.text, fontWeight: '700' },
  body:    { padding: 24, paddingTop: 36, gap: 14, paddingBottom: 48 },

  emoji:    { fontSize: 36, textAlign: 'center' },
  nickLine: { fontSize: 15, color: Colors.sub, textAlign: 'center', marginTop: 4 },
  itemLine: { fontSize: 18, fontWeight: '800', color: Colors.text, textAlign: 'center', lineHeight: 24 },
  subLine:  { fontSize: 15, color: Colors.sub, textAlign: 'center' },

  scoreRow:  { alignItems: 'center', gap: 4, marginVertical: 4 },
  bigHearts: { fontSize: 26, letterSpacing: 3 },
  bigScore:  { fontSize: 54, fontWeight: '900', color: Colors.primary, lineHeight: 62 },

  analysisBox:   { backgroundColor: Colors.bg, borderRadius: 14, padding: 14, gap: 8 },
  analysisTitle: { fontSize: 13, fontWeight: '700', color: Colors.text },
  highlight:     { color: Colors.primary },
  barRow:        { flexDirection: 'row', alignItems: 'center', gap: 8 },
  barPct:        { fontSize: 12, fontWeight: '700', color: Colors.primary, minWidth: 34, textAlign: 'right' },
  reason:        { fontSize: 13, color: Colors.sub, lineHeight: 20 },

  resultBox:    { borderRadius: 14, padding: 16, gap: 6, alignItems: 'center' },
  resultGood:   { backgroundColor: '#FFF0F6', borderWidth: 1.5, borderColor: '#FFB3CC' },
  resultBad:    { backgroundColor: '#FFF8F0', borderWidth: 1.5, borderColor: '#FFCC99' },
  resultText:   { fontSize: 14, color: Colors.text, lineHeight: 22, textAlign: 'center' },
  resultPct:    { fontSize: 16, fontWeight: '800', color: Colors.primary },
  verdict:      { fontSize: 16, fontWeight: '800', color: Colors.text, textAlign: 'center' },
  otherSuggest: { fontSize: 13, color: Colors.sub, textAlign: 'center' },

  ctaPrimary:      { backgroundColor: Colors.primary, borderRadius: 14, paddingVertical: 16, alignItems: 'center' },
  ctaPrimaryTxt:   { fontSize: 16, fontWeight: '700', color: Colors.white },
  ctaSecondary:    { backgroundColor: Colors.bg, borderRadius: 14, paddingVertical: 16, alignItems: 'center', borderWidth: 1.5, borderColor: Colors.border },
  ctaSecondaryTxt: { fontSize: 16, fontWeight: '700', color: Colors.text },
});
