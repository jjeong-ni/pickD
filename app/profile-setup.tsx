import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  Alert, ActivityIndicator,
} from 'react-native';
import { useState } from 'react';
import { router } from 'expo-router';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { Colors } from '../constants/colors';
import { SkinType } from '../types';

const SKIN_TYPES: SkinType[] = ['지성', '건성', '중성', '복합성', '민감성'];
const SKIN_CONCERNS = ['주름', '색소침착', '모공', '리프팅', '수분', '홍조', '트러블', '탄력'];
const AGE_GROUPS = ['20대 초반', '20대 후반', '30대 초반', '30대 중반', '30대 후반', '40대 이상'];

export default function ProfileSetupScreen() {
  const { user, profile, fetchProfile } = useAuth();
  const [skinType, setSkinType] = useState(profile?.skin_type ?? '');
  const [concerns, setConcerns] = useState<string[]>(profile?.concerns ?? []);
  const [ageGroup, setAgeGroup] = useState(profile?.age_group ?? '');
  const [loading, setLoading] = useState(false);

  const toggleConcern = (c: string) => {
    setConcerns((prev) => prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]);
  };

  const handleSave = async () => {
    if (!user || !skinType) return;
    setLoading(true);
    const { error } = await supabase.from('profiles').upsert({
      id: user.id,
      user_id: user.id,
      skin_type: skinType,
      concerns,
      age_group: ageGroup || null,
    }, { onConflict: 'user_id' });
    if (error) {
      Alert.alert('오류', '저장 중 오류가 발생했어요');
      setLoading(false);
      return;
    }
    await fetchProfile(user.id);
    setLoading(false);
    router.back();
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.back}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>피부 프로필 설정</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.intro}>
          피부 프로필을 입력하면 나에게 맞는{'\n'}시술·기기를 추천해드려요 ✨
        </Text>

        {/* 피부 타입 */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>피부 타입 *</Text>
          <View style={styles.chipRow}>
            {SKIN_TYPES.map((s) => (
              <TouchableOpacity
                key={s}
                style={[styles.chip, skinType === s && styles.chipActive]}
                onPress={() => setSkinType(s)}
              >
                <Text style={[styles.chipText, skinType === s && styles.chipTextActive]}>{s}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* 연령대 */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>연령대 (선택)</Text>
          <View style={styles.chipRow}>
            {AGE_GROUPS.map((a) => (
              <TouchableOpacity
                key={a}
                style={[styles.chip, ageGroup === a && styles.chipActive]}
                onPress={() => setAgeGroup(ageGroup === a ? '' : a)}
              >
                <Text style={[styles.chipText, ageGroup === a && styles.chipTextActive]}>{a}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* 피부 고민 */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>피부 고민 (복수 선택)</Text>
          <View style={styles.chipRow}>
            {SKIN_CONCERNS.map((c) => {
              const active = concerns.includes(c);
              return (
                <TouchableOpacity
                  key={c}
                  style={[styles.chip, active && styles.chipActive]}
                  onPress={() => toggleConcern(c)}
                >
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>{c}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.saveBtn, !skinType && styles.saveBtnDisabled]}
          onPress={handleSave}
          disabled={!skinType || loading}
        >
          {loading
            ? <ActivityIndicator color={Colors.white} />
            : <Text style={styles.saveBtnText}>저장하고 추천받기</Text>
          }
        </TouchableOpacity>
        <TouchableOpacity style={styles.skipBtn} onPress={() => router.back()}>
          <Text style={styles.skipBtnText}>나중에 하기</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.white },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: 56, paddingHorizontal: 16, paddingBottom: 12,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  back: { fontSize: 24, color: Colors.text, width: 32 },
  title: { fontSize: 17, fontWeight: '700', color: Colors.text },
  content: { padding: 24, gap: 28 },
  intro: { fontSize: 15, color: Colors.sub, lineHeight: 24, marginBottom: -4 },
  section: { gap: 12 },
  sectionLabel: { fontSize: 14, fontWeight: '700', color: Colors.text },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  chip: {
    paddingVertical: 10, paddingHorizontal: 18, borderRadius: 24,
    borderWidth: 1.5, borderColor: Colors.border, backgroundColor: Colors.white,
  },
  chipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  chipText: { fontSize: 14, fontWeight: '500', color: Colors.text },
  chipTextActive: { color: Colors.white },
  footer: { padding: 20, paddingBottom: 40, gap: 10, backgroundColor: Colors.white, borderTopWidth: 1, borderTopColor: Colors.border },
  saveBtn: { backgroundColor: Colors.primary, borderRadius: 12, padding: 16, alignItems: 'center' },
  saveBtnDisabled: { backgroundColor: Colors.border },
  saveBtnText: { color: Colors.white, fontSize: 16, fontWeight: '700' },
  skipBtn: { alignItems: 'center', paddingVertical: 8 },
  skipBtnText: { fontSize: 14, color: Colors.sub },
});
