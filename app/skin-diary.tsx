import React, { useState, useEffect, useCallback } from 'react';
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

interface DiaryEntry {
  id: string;
  diary_date: string;
  moisture: number | null;
  oiliness: number | null;
  trouble: number | null;
  sensitivity: number | null;
  notes: string | null;
}

const CONDITION_LABELS: { key: keyof Omit<DiaryEntry, 'id' | 'diary_date' | 'notes'>; label: string; emoji: string; low: string; high: string }[] = [
  { key: 'moisture', label: '수분감', emoji: '💧', low: '건조함', high: '촉촉함' },
  { key: 'oiliness', label: '유분감', emoji: '✨', low: '뽀송', high: '번들번들' },
  { key: 'trouble', label: '트러블', emoji: '🔴', low: '깨끗함', high: '심함' },
  { key: 'sensitivity', label: '민감도', emoji: '🌡️', low: '안정적', high: '예민함' },
];

function toISODate(d: Date) {
  return d.toISOString().split('T')[0];
}

function addDays(d: Date, n: number) {
  const copy = new Date(d);
  copy.setDate(copy.getDate() + n);
  return copy;
}

export default function SkinDiaryScreen() {
  const { user } = useAuth();
  const [date, setDate] = useState(new Date());
  const [entry, setEntry] = useState<Partial<DiaryEntry>>({});
  const [history, setHistory] = useState<DiaryEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const loadEntry = useCallback(async (d: Date) => {
    if (!user) return;
    setLoading(true);
    const dateStr = toISODate(d);
    const { data } = await supabase
      .from('skin_diary')
      .select('*')
      .eq('user_id', user.id)
      .eq('diary_date', dateStr)
      .maybeSingle();
    setEntry(data ?? { diary_date: dateStr, moisture: null, oiliness: null, trouble: null, sensitivity: null, notes: null });
    setLoading(false);
  }, [user]);

  const loadHistory = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('skin_diary')
      .select('*')
      .eq('user_id', user.id)
      .order('diary_date', { ascending: false })
      .limit(14);
    setHistory(data ?? []);
  }, [user]);

  useEffect(() => {
    loadEntry(date);
  }, [date, loadEntry]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const handleSetRating = (key: string, value: number) => {
    setEntry((prev) => ({ ...prev, [key]: prev[key as keyof DiaryEntry] === value ? null : value }));
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    const dateStr = toISODate(date);
    const payload = {
      user_id: user.id,
      diary_date: dateStr,
      moisture: entry.moisture ?? null,
      oiliness: entry.oiliness ?? null,
      trouble: entry.trouble ?? null,
      sensitivity: entry.sensitivity ?? null,
      notes: entry.notes ?? null,
    };
    const { error } = await supabase.from('skin_diary').upsert(payload, { onConflict: 'user_id,diary_date' });
    if (error) {
      Alert.alert('오류', '저장에 실패했어요. 다시 시도해주세요.');
    } else {
      Alert.alert('저장 완료', '오늘의 피부 일기가 저장됐어요!');
      loadHistory();
    }
    setSaving(false);
  };

  const isToday = toISODate(date) === toISODate(new Date());
  const isFuture = date > new Date();

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
        <Text style={styles.navTitle}>피부 일기</Text>
        <View style={{ width: 32 }} />
      </LinearGradient>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
        {/* 날짜 네비게이션 */}
        <View style={styles.dateNav}>
          <TouchableOpacity onPress={() => setDate((d) => addDays(d, -1))} style={styles.dateArrow}>
            <Ionicons name="chevron-back" size={22} color={Colors.primary} />
          </TouchableOpacity>
          <View style={styles.dateCenterWrap}>
            <Text style={styles.dateMain}>
              {date.getFullYear()}.{String(date.getMonth() + 1).padStart(2, '0')}.{String(date.getDate()).padStart(2, '0')}
            </Text>
            {isToday && <View style={styles.todayBadge}><Text style={styles.todayBadgeTxt}>오늘</Text></View>}
          </View>
          <TouchableOpacity
            onPress={() => setDate((d) => addDays(d, 1))}
            style={[styles.dateArrow, isToday && { opacity: 0.3 }]}
            disabled={isToday}
          >
            <Ionicons name="chevron-forward" size={22} color={Colors.primary} />
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.center}><ActivityIndicator color={Colors.primary} /></View>
        ) : (
          <View style={styles.content}>
            {/* 피부 상태 평가 */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>오늘의 피부 상태</Text>
              {CONDITION_LABELS.map(({ key, label, emoji, low, high }) => (
                <View key={key} style={styles.conditionRow}>
                  <View style={styles.conditionLabelWrap}>
                    <Text style={styles.conditionEmoji}>{emoji}</Text>
                    <Text style={styles.conditionLabel}>{label}</Text>
                  </View>
                  <View style={styles.dotsRow}>
                    {[1, 2, 3, 4, 5].map((v) => (
                      <TouchableOpacity key={v} onPress={() => handleSetRating(key, v)}>
                        <View style={[styles.dot, entry[key as keyof DiaryEntry] != null && (entry[key as keyof DiaryEntry] as number) >= v && styles.dotFilled]} />
                      </TouchableOpacity>
                    ))}
                  </View>
                  <View style={styles.conditionScale}>
                    <Text style={styles.conditionScaleTxt}>{low}</Text>
                    <Text style={styles.conditionScaleTxt}>{high}</Text>
                  </View>
                </View>
              ))}
            </View>

            {/* 메모 */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>메모</Text>
              <TextInput
                style={styles.notesInput}
                placeholder="오늘 피부 상태나 사용 제품을 기록해보세요..."
                placeholderTextColor={Colors.sub}
                value={entry.notes ?? ''}
                onChangeText={(v) => setEntry((prev) => ({ ...prev, notes: v }))}
                multiline
                textAlignVertical="top"
              />
            </View>

            {/* 히스토리 */}
            {history.length > 0 && (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>최근 기록</Text>
                {history.map((h) => (
                  <TouchableOpacity
                    key={h.id}
                    style={styles.historyRow}
                    onPress={() => {
                      const [y, m, d] = h.diary_date.split('-').map(Number);
                      setDate(new Date(y, m - 1, d));
                    }}
                  >
                    <Text style={styles.historyDate}>{h.diary_date}</Text>
                    <View style={styles.historyDots}>
                      {CONDITION_LABELS.map(({ key, emoji }) => (
                        <Text key={key} style={styles.historyEmoji}>
                          {emoji}{h[key as keyof DiaryEntry] ?? '-'}
                        </Text>
                      ))}
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {!isFuture && (
        <View style={styles.saveWrap}>
          <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving}>
            {saving
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.saveBtnTxt}>저장하기</Text>}
          </TouchableOpacity>
        </View>
      )}
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
  dateNav: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 16, backgroundColor: Colors.white,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  dateArrow: { padding: 8 },
  dateCenterWrap: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dateMain: { fontSize: 17, fontWeight: '800', color: Colors.text },
  todayBadge: {
    backgroundColor: Colors.primary, borderRadius: 10,
    paddingVertical: 2, paddingHorizontal: 8,
  },
  todayBadgeTxt: { fontSize: 11, fontWeight: '700', color: '#fff' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 40 },
  content: { padding: 16, gap: 12 },
  card: {
    backgroundColor: Colors.white, borderRadius: 16, padding: 16, gap: 14,
    borderWidth: 1, borderColor: Colors.border,
  },
  cardTitle: { fontSize: 15, fontWeight: '800', color: Colors.text },
  conditionRow: { gap: 6 },
  conditionLabelWrap: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  conditionEmoji: { fontSize: 16 },
  conditionLabel: { fontSize: 14, fontWeight: '700', color: Colors.text },
  dotsRow: { flexDirection: 'row', gap: 10 },
  dot: {
    width: 32, height: 32, borderRadius: 16,
    borderWidth: 2, borderColor: Colors.border,
    backgroundColor: Colors.bg,
  },
  dotFilled: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  conditionScale: { flexDirection: 'row', justifyContent: 'space-between' },
  conditionScaleTxt: { fontSize: 10, color: Colors.sub },
  notesInput: {
    borderWidth: 1, borderColor: Colors.border, borderRadius: 10,
    padding: 12, fontSize: 14, color: Colors.text, minHeight: 80, lineHeight: 22,
  },
  historyRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 10, borderTopWidth: 1, borderTopColor: Colors.border,
  },
  historyDate: { fontSize: 13, fontWeight: '700', color: Colors.text },
  historyDots: { flexDirection: 'row', gap: 8 },
  historyEmoji: { fontSize: 12, color: Colors.sub },
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
