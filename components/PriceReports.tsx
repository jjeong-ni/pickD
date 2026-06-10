import {
  View, Text, StyleSheet, TouchableOpacity, Modal, TextInput,
  ActivityIndicator, Alert, ScrollView,
} from 'react-native';
import { useState, useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { Colors } from '../constants/colors';

const REGIONS = ['강남·서초', '홍대·마포', '신촌·이대', '분당·판교', '부산', '기타'];

interface PriceReport {
  id: string;
  user_id: string | null;
  clinic_name: string;
  region: string;
  price: number;
  visited_at: string;
  notes: string | null;
  created_at: string;
}

interface Props {
  itemId: string;
  itemType: 'treatment' | 'device';
  itemName: string;
}

function formatPrice(p: number) {
  if (p >= 10000) return `${(p / 10000).toFixed(p % 10000 === 0 ? 0 : 1)}만원`;
  return `${p.toLocaleString()}원`;
}

function formatDate(d: string) {
  const dt = new Date(d);
  return `${dt.getFullYear()}.${String(dt.getMonth() + 1).padStart(2, '0')}`;
}

export default function PriceReports({ itemId, itemType, itemName }: Props) {
  const { user } = useAuth();
  const [reports, setReports] = useState<PriceReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [expanded, setExpanded] = useState(false);

  // Form state
  const [clinicName, setClinicName] = useState('');
  const [region, setRegion] = useState('강남·서초');
  const [priceText, setPriceText] = useState('');
  const [visitedAt, setVisitedAt] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch();
  }, [itemId]);

  const fetch = async () => {
    const { data } = await supabase
      .from('price_reports')
      .select('*')
      .eq('item_id', itemId)
      .eq('item_type', itemType)
      .order('created_at', { ascending: false })
      .limit(30);
    setReports(data ?? []);
    setLoading(false);
  };

  const handleSubmit = async () => {
    if (!user) { Alert.alert('로그인 필요', '가격 제보를 하려면 로그인이 필요해요.'); return; }
    const price = parseInt(priceText.replace(/[^0-9]/g, ''), 10);
    if (!clinicName.trim()) { Alert.alert('', '병원/클리닉 이름을 입력해주세요.'); return; }
    if (!price || price <= 0) { Alert.alert('', '올바른 가격을 입력해주세요.'); return; }

    setSubmitting(true);
    const visitedDate = visitedAt.length === 7 ? `${visitedAt}-01` : visitedAt;
    const { error } = await supabase.from('price_reports').insert({
      user_id: user.id,
      item_id: itemId,
      item_type: itemType,
      item_name: itemName,
      clinic_name: clinicName.trim(),
      region,
      price,
      visited_at: visitedDate,
      notes: notes.trim() || null,
    });
    setSubmitting(false);
    if (error) { Alert.alert('오류', '제보 등록 중 문제가 발생했어요.'); return; }
    setShowForm(false);
    setClinicName(''); setPriceText(''); setNotes('');
    await fetch();
    Alert.alert('✅ 제보 완료', '소중한 가격 정보 감사해요!');
  };

  const visibleReports = expanded ? reports : reports.slice(0, 3);

  // 통계 계산
  const avgPrice = reports.length > 0
    ? Math.round(reports.reduce((s, r) => s + r.price, 0) / reports.length)
    : null;
  const minPrice = reports.length > 0 ? Math.min(...reports.map((r) => r.price)) : null;
  const maxPrice = reports.length > 0 ? Math.max(...reports.map((r) => r.price)) : null;

  return (
    <View style={styles.wrap}>
      {/* 헤더 */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>💰 커뮤니티 가격 정보</Text>
          <Text style={styles.subtitle}>실제 방문자 제보 기반 · {reports.length}건</Text>
        </View>
        <TouchableOpacity style={styles.reportBtn} onPress={() => setShowForm(true)}>
          <Ionicons name="add" size={15} color={Colors.primary} />
          <Text style={styles.reportBtnText}>제보하기</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator color={Colors.primary} style={{ marginVertical: 20 }} />
      ) : reports.length === 0 ? (
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyText}>아직 가격 제보가 없어요{'\n'}첫 번째로 가격을 알려주세요 🙏</Text>
          <TouchableOpacity style={styles.firstReportBtn} onPress={() => setShowForm(true)}>
            <Text style={styles.firstReportBtnText}>가격 제보하기</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          {/* 요약 통계 */}
          {avgPrice !== null && (
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={styles.statNum}>{formatPrice(avgPrice)}</Text>
                <Text style={styles.statLabel}>평균</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={[styles.statNum, { color: Colors.success }]}>{formatPrice(minPrice!)}</Text>
                <Text style={styles.statLabel}>최저</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={[styles.statNum, { color: Colors.danger }]}>{formatPrice(maxPrice!)}</Text>
                <Text style={styles.statLabel}>최고</Text>
              </View>
            </View>
          )}

          {/* 제보 목록 */}
          {visibleReports.map((r) => (
            <View key={r.id} style={styles.reportRow}>
              <View style={styles.reportLeft}>
                <Text style={styles.clinicName}>{r.clinic_name}</Text>
                <View style={styles.reportMeta}>
                  <View style={styles.regionChip}>
                    <Text style={styles.regionChipText}>{r.region}</Text>
                  </View>
                  <Text style={styles.visitDate}>{formatDate(r.visited_at)}</Text>
                </View>
                {r.notes && <Text style={styles.reportNotes} numberOfLines={2}>{r.notes}</Text>}
              </View>
              <Text style={styles.reportPrice}>{formatPrice(r.price)}</Text>
            </View>
          ))}

          {reports.length > 3 && (
            <TouchableOpacity style={styles.expandBtn} onPress={() => setExpanded((e) => !e)}>
              <Text style={styles.expandBtnText}>
                {expanded ? '접기' : `더보기 (${reports.length - 3}건)`}
              </Text>
              <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={14} color={Colors.sub} />
            </TouchableOpacity>
          )}

          <Text style={styles.disclaimer}>* 제보된 가격은 시기·패키지에 따라 다를 수 있어요</Text>
        </>
      )}

      {/* 제보 모달 */}
      <Modal visible={showForm} transparent animationType="slide" onRequestClose={() => setShowForm(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.formSheet}>
            <View style={styles.formHandle} />
            <Text style={styles.formTitle}>가격 제보하기</Text>
            <Text style={styles.formItem}>{itemName}</Text>

            <Text style={styles.fieldLabel}>병원·클리닉 이름 *</Text>
            <TextInput
              style={styles.textInput}
              placeholder="예: ○○피부과 강남점"
              placeholderTextColor={Colors.sub}
              value={clinicName}
              onChangeText={setClinicName}
              maxLength={30}
            />

            <Text style={styles.fieldLabel}>지역 *</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.regionRow}>
              {REGIONS.map((r) => (
                <TouchableOpacity
                  key={r}
                  style={[styles.regionPill, region === r && styles.regionPillActive]}
                  onPress={() => setRegion(r)}
                >
                  <Text style={[styles.regionPillText, region === r && styles.regionPillTextActive]}>{r}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={styles.fieldLabel}>가격 (원) *</Text>
            <TextInput
              style={styles.textInput}
              placeholder="예: 150000"
              placeholderTextColor={Colors.sub}
              value={priceText}
              onChangeText={setPriceText}
              keyboardType="numeric"
              maxLength={10}
            />

            <Text style={styles.fieldLabel}>방문 시기 (YYYY-MM)</Text>
            <TextInput
              style={styles.textInput}
              placeholder="예: 2026-05"
              placeholderTextColor={Colors.sub}
              value={visitedAt}
              onChangeText={setVisitedAt}
              maxLength={7}
            />

            <Text style={styles.fieldLabel}>메모 (선택)</Text>
            <TextInput
              style={[styles.textInput, styles.notesInput]}
              placeholder="패키지 구성, 할인 여부 등 자유롭게"
              placeholderTextColor={Colors.sub}
              value={notes}
              onChangeText={setNotes}
              multiline
              maxLength={100}
            />

            <TouchableOpacity
              style={[styles.submitBtn, (!clinicName.trim() || !priceText || submitting) && { opacity: 0.45 }]}
              onPress={handleSubmit}
              disabled={!clinicName.trim() || !priceText || submitting}
            >
              {submitting
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.submitBtnText}>제보 등록</Text>}
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowForm(false)}>
              <Text style={styles.cancelBtnText}>취소</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: Colors.white, borderRadius: 16, padding: 18,
    borderWidth: 1, borderColor: Colors.border, gap: 12,
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  title: { fontSize: 15, fontWeight: '800', color: Colors.text },
  subtitle: { fontSize: 12, color: Colors.sub, marginTop: 2 },
  reportBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingVertical: 6, paddingHorizontal: 12, borderRadius: 16,
    borderWidth: 1.5, borderColor: Colors.primary, backgroundColor: Colors.primaryLight,
  },
  reportBtnText: { fontSize: 12, fontWeight: '700', color: Colors.primary },

  emptyWrap: { alignItems: 'center', gap: 10, paddingVertical: 10 },
  emptyText: { fontSize: 13, color: Colors.sub, textAlign: 'center', lineHeight: 20 },
  firstReportBtn: {
    backgroundColor: Colors.primary, paddingVertical: 10, paddingHorizontal: 24, borderRadius: 12,
  },
  firstReportBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },

  statsRow: {
    flexDirection: 'row', backgroundColor: Colors.bg, borderRadius: 12,
    paddingVertical: 14, justifyContent: 'space-around', alignItems: 'center',
  },
  statItem: { alignItems: 'center', gap: 3 },
  statNum: { fontSize: 16, fontWeight: '800', color: Colors.text },
  statLabel: { fontSize: 11, color: Colors.sub, fontWeight: '600' },
  statDivider: { width: 1, height: 28, backgroundColor: Colors.border },

  reportRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
    paddingVertical: 10, borderTopWidth: 1, borderTopColor: Colors.border,
  },
  reportLeft: { flex: 1, gap: 4 },
  clinicName: { fontSize: 14, fontWeight: '700', color: Colors.text },
  reportMeta: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  regionChip: {
    backgroundColor: Colors.primaryLight, borderRadius: 8, paddingHorizontal: 7, paddingVertical: 2,
  },
  regionChipText: { fontSize: 11, color: Colors.primary, fontWeight: '600' },
  visitDate: { fontSize: 11, color: Colors.sub },
  reportNotes: { fontSize: 12, color: Colors.sub, lineHeight: 17 },
  reportPrice: { fontSize: 16, fontWeight: '800', color: Colors.primary, paddingLeft: 12 },
  expandBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 4, paddingVertical: 8,
  },
  expandBtnText: { fontSize: 13, color: Colors.sub, fontWeight: '600' },
  disclaimer: { fontSize: 11, color: Colors.sub, textAlign: 'center', marginTop: -4 },

  /* 모달 */
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  formSheet: {
    backgroundColor: Colors.white, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 20, paddingBottom: 48, gap: 6,
  },
  formHandle: {
    width: 36, height: 4, borderRadius: 2, backgroundColor: Colors.border,
    alignSelf: 'center', marginBottom: 10,
  },
  formTitle: { fontSize: 18, fontWeight: '800', color: Colors.text },
  formItem: { fontSize: 13, color: Colors.sub, marginBottom: 8 },
  fieldLabel: { fontSize: 13, fontWeight: '700', color: Colors.text, marginTop: 6 },
  textInput: {
    borderWidth: 1.5, borderColor: Colors.border, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 11, fontSize: 14, color: Colors.text,
  },
  notesInput: { minHeight: 72, textAlignVertical: 'top' },
  regionRow: { flexDirection: 'row', marginBottom: 2 },
  regionPill: {
    paddingVertical: 7, paddingHorizontal: 14, borderRadius: 20, marginRight: 8,
    borderWidth: 1.5, borderColor: Colors.border, backgroundColor: Colors.bg,
  },
  regionPillActive: { borderColor: Colors.primary, backgroundColor: Colors.primaryLight },
  regionPillText: { fontSize: 13, color: Colors.sub, fontWeight: '600' },
  regionPillTextActive: { color: Colors.primary },
  submitBtn: {
    backgroundColor: Colors.primary, borderRadius: 14, paddingVertical: 14,
    alignItems: 'center', marginTop: 8,
  },
  submitBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  cancelBtn: { alignItems: 'center', paddingVertical: 8 },
  cancelBtnText: { fontSize: 14, color: Colors.sub },
});
