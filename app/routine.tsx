import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  TextInput, Alert, ActivityIndicator, Platform,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { Colors, HEADER_TOP } from '../constants/colors';

type Step = { id: string; category: string; product: string; tip: string };

const DEFAULT_ROUTINES: Record<string, { am: Step[]; pm: Step[] }> = {
  지성: {
    am: [
      { id: '1', category: '세안', product: '폼 클렌저', tip: '과잉 피지 제거, 2분간 마사지' },
      { id: '2', category: '토너', product: '수렴 토너', tip: '모공 수렴 + 피지 억제' },
      { id: '3', category: '에센스', product: '수분 에센스', tip: '오일-프리 제형 선택' },
      { id: '4', category: '수분크림', product: '젤 타입 보습제', tip: '가벼운 수분막 형성' },
      { id: '5', category: '선크림', product: 'SPF50+ PA++++', tip: '지성 전용 논코메도제닉 제품' },
    ],
    pm: [
      { id: '1', category: '1차 클렌징', product: '클렌징 워터', tip: '메이크업·자외선 차단제 제거' },
      { id: '2', category: '2차 클렌징', product: '폼 클렌저', tip: '딥클렌징, 주 1회 효소세안 권장' },
      { id: '3', category: '토너', product: '모공 케어 토너', tip: 'BHA 성분으로 모공 관리' },
      { id: '4', category: '세럼', product: '나이아신아마이드 세럼', tip: '피지 분비 조절 + 피부 톤 균일화' },
      { id: '5', category: '수분크림', product: '오일 컨트롤 크림', tip: '가볍게 마무리' },
    ],
  },
  건성: {
    am: [
      { id: '1', category: '세안', product: '저자극 크림 클렌저', tip: '미지근한 물로 부드럽게' },
      { id: '2', category: '토너', product: '수분 공급 토너', tip: '히알루론산 함유 제품 권장' },
      { id: '3', category: '앰플', product: '히알루론산 앰플', tip: '촉촉한 피부 속 채우기' },
      { id: '4', category: '수분크림', product: '리치 보습 크림', tip: '세라마이드·콜레스테롤 함유 제품' },
      { id: '5', category: '선크림', product: 'SPF50+ 크림 타입', tip: '보습+자외선 차단 동시에' },
    ],
    pm: [
      { id: '1', category: '클렌징', product: '클렌징 밀크/오일', tip: '건조함 없이 부드럽게 제거' },
      { id: '2', category: '토너', product: '수분 토너', tip: '3번 레이어링으로 수분 충전' },
      { id: '3', category: '앰플', product: '보습 앰플', tip: '레티놀 세럼 주 2~3회 추가' },
      { id: '4', category: '아이크림', product: '보습 아이크림', tip: '눈가 건조함 집중 케어' },
      { id: '5', category: '수면팩', product: '수분 슬리핑팩', tip: '주 2~3회 집중 수분 보충' },
    ],
  },
  복합성: {
    am: [
      { id: '1', category: '세안', product: '젤 타입 클렌저', tip: 'T존 중심으로 세안, U존은 가볍게' },
      { id: '2', category: '토너', product: '밸런싱 토너', tip: '피지·수분 균형 조절' },
      { id: '3', category: '에센스', product: '밸런싱 에센스', tip: '오일-프리 or 경량 제형' },
      { id: '4', category: '수분크림', product: '밸런싱 크림', tip: 'T존엔 얇게, U존엔 두껍게' },
      { id: '5', category: '선크림', product: 'SPF50+ PA++++', tip: '논코메도제닉 제품 선택' },
    ],
    pm: [
      { id: '1', category: '1차 클렌징', product: '클렌징 오일', tip: 'T존 모공 딥클렌징' },
      { id: '2', category: '2차 클렌징', product: '폼 클렌저', tip: '잔여물 깨끗하게 제거' },
      { id: '3', category: '토너', product: '밸런싱 토너', tip: 'BHA 함유 제품으로 모공 관리' },
      { id: '4', category: '세럼', product: '나이아신아마이드 세럼', tip: '피부 균일화' },
      { id: '5', category: '수분크림', product: '가벼운 보습 크림', tip: '건조 부위엔 더 덧바르기' },
    ],
  },
  민감성: {
    am: [
      { id: '1', category: '세안', product: '약산성 저자극 클렌저', tip: '미지근한 물, 마찰 최소화' },
      { id: '2', category: '토너', product: '진정 토너 (무향)', tip: '시카·판테놀 함유 제품' },
      { id: '3', category: '에센스', product: '진정 에센스', tip: '알코올·향료 없는 제품 필수' },
      { id: '4', category: '수분크림', product: '무향 진정 크림', tip: '세라마이드 함유 피부 장벽 강화' },
      { id: '5', category: '선크림', product: '미네럴 SPF50+', tip: '물리적 자외선 차단제 권장' },
    ],
    pm: [
      { id: '1', category: '클렌징', product: '약산성 클렌징 워터', tip: '저자극으로 부드럽게' },
      { id: '2', category: '토너', product: '진정 토너', tip: '알로에·시카 성분' },
      { id: '3', category: '세럼', product: '피부 장벽 강화 세럼', tip: '세라마이드 듀오 제품 추천' },
      { id: '4', category: '수분크림', product: '진정 보습 크림', tip: '수면 중 장벽 재생 집중' },
    ],
  },
  중성: {
    am: [
      { id: '1', category: '세안', product: '젤/폼 클렌저', tip: '부드럽게 세안' },
      { id: '2', category: '토너', product: '수분 토너', tip: '기초 수분 공급' },
      { id: '3', category: '세럼', product: '비타민C 세럼', tip: '밝은 피부 톤 유지' },
      { id: '4', category: '수분크림', product: '데일리 크림', tip: '가볍게 보습' },
      { id: '5', category: '선크림', product: 'SPF50+', tip: '노화 예방 핵심' },
    ],
    pm: [
      { id: '1', category: '클렌징', product: '클렌징 오일/밀크', tip: '더블 클렌징 권장' },
      { id: '2', category: '토너', product: '수분 토너', tip: '충분히 흡수시키기' },
      { id: '3', category: '세럼', product: '레티놀 세럼', tip: '주 2회부터 시작' },
      { id: '4', category: '수분크림', product: '나이트 크림', tip: '수면 중 재생 집중' },
    ],
  },
};

export default function RoutineScreen() {
  const { user, profile, setProfile } = useAuth();
  const [mode, setMode] = useState<'am' | 'pm'>('am');
  const [steps, setSteps] = useState<Step[]>([]);
  const [saving, setSaving] = useState(false);
  const [notes, setNotes] = useState<Record<string, string>>({});

  const skinType = profile?.skin_type ?? '중성';
  const defaultRoutine = DEFAULT_ROUTINES[skinType] ?? DEFAULT_ROUTINES['중성'];

  useEffect(() => {
    const saved = profile?.routine as any;
    if (saved?.[mode]) {
      setSteps(saved[mode]);
    } else {
      setSteps(defaultRoutine[mode]);
    }
    setNotes({});
  }, [mode, profile?.routine]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    const existing = (profile?.routine as any) ?? {};
    const newRoutine = { ...existing, [mode]: steps };
    const { error } = await supabase
      .from('profiles')
      .update({ routine: newRoutine })
      .eq('user_id', user.id);
    if (error) {
      Alert.alert('오류', '루틴 저장에 실패했어요.');
    } else {
      setProfile({ ...profile!, routine: newRoutine } as any);
      Alert.alert('저장 완료', `${mode.toUpperCase()} 루틴이 저장됐어요!`);
    }
    setSaving(false);
  };

  const handleReset = () => {
    Alert.alert('루틴 초기화', '기본 루틴으로 되돌릴까요?', [
      { text: '취소', style: 'cancel' },
      { text: '초기화', onPress: () => setSteps(defaultRoutine[mode]) },
    ]);
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
        <Text style={styles.navTitle}>나만의 루틴</Text>
        <TouchableOpacity onPress={handleReset}>
          <Text style={styles.resetBtn}>초기화</Text>
        </TouchableOpacity>
      </LinearGradient>

      <View style={styles.amPmRow}>
        <TouchableOpacity
          style={[styles.amPmBtn, mode === 'am' && styles.amPmBtnActive]}
          onPress={() => setMode('am')}
        >
          <Text style={[styles.amPmTxt, mode === 'am' && styles.amPmTxtActive]}>🌅 AM 루틴</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.amPmBtn, mode === 'pm' && styles.amPmBtnActive]}
          onPress={() => setMode('pm')}
        >
          <Text style={[styles.amPmTxt, mode === 'pm' && styles.amPmTxtActive]}>🌙 PM 루틴</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.skinBadge}>
        <Text style={styles.skinBadgeTxt}>{skinType} 피부 맞춤 루틴</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {steps.map((step, idx) => (
          <View key={step.id} style={styles.stepCard}>
            <View style={styles.stepNumWrap}>
              <Text style={styles.stepNum}>{idx + 1}</Text>
            </View>
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={styles.stepCategory}>{step.category}</Text>
              <Text style={styles.stepProduct}>{step.product}</Text>
              <Text style={styles.stepTip}>{step.tip}</Text>
            </View>
          </View>
        ))}

        <View style={styles.noteCard}>
          <Text style={styles.noteTitle}>메모</Text>
          <TextInput
            style={styles.noteInput}
            placeholder="루틴 메모를 입력해보세요..."
            placeholderTextColor={Colors.sub}
            value={notes[mode] ?? ''}
            onChangeText={(v) => setNotes((prev) => ({ ...prev, [mode]: v }))}
            multiline
          />
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      <View style={styles.saveWrap}>
        <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving}>
          {saving
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.saveBtnTxt}>루틴 저장하기</Text>}
        </TouchableOpacity>
      </View>
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
  resetBtn: { fontSize: 14, color: 'rgba(255,255,255,0.8)', fontWeight: '600' },
  amPmRow: {
    flexDirection: 'row', margin: 16, gap: 10,
    backgroundColor: Colors.white, borderRadius: 16,
    padding: 4, borderWidth: 1, borderColor: Colors.border,
  },
  amPmBtn: { flex: 1, paddingVertical: 10, borderRadius: 12, alignItems: 'center' },
  amPmBtnActive: { backgroundColor: Colors.primary },
  amPmTxt: { fontSize: 14, fontWeight: '700', color: Colors.sub },
  amPmTxtActive: { color: '#fff' },
  skinBadge: {
    alignSelf: 'center', backgroundColor: Colors.primaryLight,
    paddingVertical: 4, paddingHorizontal: 14, borderRadius: 20,
    marginBottom: 8,
  },
  skinBadgeTxt: { fontSize: 12, fontWeight: '700', color: Colors.primary },
  content: { paddingHorizontal: 16, gap: 10 },
  stepCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 14,
    backgroundColor: Colors.white, borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: Colors.border,
  },
  stepNumWrap: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center',
  },
  stepNum: { fontSize: 13, fontWeight: '800', color: '#fff' },
  stepCategory: { fontSize: 11, fontWeight: '700', color: Colors.primary, textTransform: 'uppercase', letterSpacing: 0.5 },
  stepProduct: { fontSize: 15, fontWeight: '700', color: Colors.text },
  stepTip: { fontSize: 12, color: Colors.sub, lineHeight: 18 },
  noteCard: {
    backgroundColor: Colors.white, borderRadius: 14, padding: 14, gap: 8,
    borderWidth: 1, borderColor: Colors.border, marginTop: 4,
  },
  noteTitle: { fontSize: 13, fontWeight: '700', color: Colors.text },
  noteInput: {
    minHeight: 80, fontSize: 14, color: Colors.text, lineHeight: 22,
    borderWidth: 1, borderColor: Colors.border, borderRadius: 10, padding: 10,
  },
  saveWrap: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    padding: 16, paddingBottom: Platform.OS === 'ios' ? 32 : 16,
    backgroundColor: Colors.white, borderTopWidth: 1, borderTopColor: Colors.border,
  },
  saveBtn: {
    backgroundColor: Colors.primary, borderRadius: 14,
    paddingVertical: 16, alignItems: 'center',
  },
  saveBtnTxt: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
