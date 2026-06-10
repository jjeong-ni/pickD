import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator,
} from 'react-native';
import { useEffect, useState } from 'react';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { Colors, HEADER_TOP } from '../constants/colors';

interface HistoryEntry {
  id: string;
  skin_type: string;
  baumann_code: string;
  skin_metrics: Record<string, number> | null;
  skin_dehydration: boolean;
  analyzed_at: string;
}

const METRIC_META: Record<string, { emoji: string; color: string; label: string }> = {
  모공:      { emoji: '🔵', color: '#3B82F6', label: '모공' },
  주름:      { emoji: '〰️', color: '#9B59B6', label: '주름' },
  색소침착:  { emoji: '🟤', color: '#C0392B', label: '색소침착' },
  UV색소침착:{ emoji: '☀️', color: '#E67E22', label: 'UV색소' },
  탄력:      { emoji: '💪', color: Colors.primary, label: '탄력' },
  피부톤:    { emoji: '🔴', color: '#E74C3C', label: '피부톤' },
};

const BAUMANN_DESC: Record<string, string> = {
  D: '건성', O: '지성', S: '민감성', R: '저항성',
  P: '색소성', N: '비색소성', T: '주름성', W: '팽팽',
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
}

function MetricBar({ label, value, prevValue, color }: {
  label: string; value: number; prevValue?: number; color: string;
}) {
  const pct = Math.max(0, Math.min(100, value));
  const diff = prevValue !== undefined ? value - prevValue : null;
  return (
    <View style={styles.metricRow}>
      <Text style={styles.metricLabel}>{label}</Text>
      <View style={styles.metricBarBg}>
        <View style={[styles.metricBarFill, { width: `${pct}%` as any, backgroundColor: color }]} />
      </View>
      <View style={styles.metricRight}>
        <Text style={styles.metricNum}>{value}</Text>
        {diff !== null && (
          <Text style={[styles.metricDiff, { color: diff > 0 ? Colors.success : diff < 0 ? Colors.danger : Colors.sub }]}>
            {diff > 0 ? `+${diff}` : diff < 0 ? `${diff}` : '±0'}
          </Text>
        )}
      </View>
    </View>
  );
}

function HistoryCard({ entry, prev, index, isLatest }: {
  entry: HistoryEntry; prev?: HistoryEntry; index: number; isLatest: boolean;
}) {
  const [expanded, setExpanded] = useState(isLatest);
  const metrics = entry.skin_metrics;
  const prevMetrics = prev?.skin_metrics;

  return (
    <View style={[styles.card, isLatest && styles.cardLatest]}>
      {/* 타임라인 점 */}
      <View style={styles.timelineDot}>
        <View style={[styles.dot, isLatest && styles.dotLatest]} />
      </View>

      <TouchableOpacity style={styles.cardHeader} onPress={() => setExpanded(e => !e)} activeOpacity={0.8}>
        <View style={styles.cardHeaderLeft}>
          {isLatest && <View style={styles.latestBadge}><Text style={styles.latestBadgeText}>최근</Text></View>}
          <Text style={styles.cardDate}>{formatDate(entry.analyzed_at)}</Text>
          <Text style={styles.cardNum}>#{index + 1}회차</Text>
        </View>
        <View style={styles.cardHeaderRight}>
          <View style={styles.codeBadge}>
            <Text style={styles.codeBadgeText}>{entry.baumann_code}</Text>
          </View>
          <Text style={styles.skinTypeText}>{entry.skin_type}</Text>
          <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={16} color={Colors.sub} />
        </View>
      </TouchableOpacity>

      {expanded && metrics && (
        <View style={styles.cardBody}>
          {entry.skin_dehydration && (
            <View style={styles.dehydrationBadge}>
              <Text style={styles.dehydrationText}>⚠️ 속건조 경향</Text>
            </View>
          )}
          <Text style={styles.metricsTitle}>6대 피부 지표</Text>
          {Object.keys(METRIC_META).map((key) => (
            <MetricBar
              key={key}
              label={METRIC_META[key].label}
              value={metrics[key] ?? 50}
              prevValue={prevMetrics?.[key]}
              color={METRIC_META[key].color}
            />
          ))}
          {prev && (
            <Text style={styles.prevNote}>* 화살표는 {formatDate(prev.analyzed_at)} 대비 변화</Text>
          )}
        </View>
      )}
    </View>
  );
}

export default function SkinHistoryScreen() {
  const { user } = useAuth();
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    supabase
      .from('skin_analysis_history')
      .select('*')
      .eq('user_id', user.id)
      .order('analyzed_at', { ascending: false })
      .then(({ data }) => {
        setHistory(data ?? []);
        setLoading(false);
      });
  }, [user?.id]);

  const totalCount = history.length;
  const first = history[history.length - 1];
  const latest = history[0];

  return (
    <View style={styles.container}>
      {/* 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>피부 변화 기록</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={Colors.primary} size="large" />
        </View>
      ) : totalCount === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyEmoji}>📊</Text>
          <Text style={styles.emptyTitle}>아직 분석 기록이 없어요</Text>
          <Text style={styles.emptyDesc}>피부타입 분석을 완료하면{'\n'}변화 추이를 여기서 확인할 수 있어요</Text>
          <TouchableOpacity style={styles.goBtn} onPress={() => router.push('/skin-analysis' as any)}>
            <Text style={styles.goBtnText}>지금 분석하기</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scroll}>
          {/* 요약 카드 */}
          <View style={styles.summaryCard}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryNum}>{totalCount}회</Text>
              <Text style={styles.summaryLabel}>총 분석 횟수</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Text style={styles.summaryNum}>{latest?.baumann_code ?? '-'}</Text>
              <Text style={styles.summaryLabel}>현재 타입</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Text style={styles.summaryNum}>{first ? formatDate(first.analyzed_at) : '-'}</Text>
              <Text style={styles.summaryLabel}>첫 분석일</Text>
            </View>
          </View>

          {/* 최근 2회 변화 비교 (2회 이상 있을 때) */}
          {totalCount >= 2 && history[0].skin_metrics && history[1].skin_metrics && (
            <View style={styles.diffCard}>
              <Text style={styles.diffTitle}>📈 최근 분석 변화</Text>
              <Text style={styles.diffSubtitle}>
                {formatDate(history[1].analyzed_at)} → {formatDate(history[0].analyzed_at)}
              </Text>
              {Object.keys(METRIC_META).map((key) => {
                const curr = history[0].skin_metrics![key] ?? 50;
                const prev = history[1].skin_metrics![key] ?? 50;
                const diff = curr - prev;
                if (diff === 0) return null;
                return (
                  <View key={key} style={styles.diffRow}>
                    <Text style={styles.diffMetric}>{METRIC_META[key].label}</Text>
                    <Text style={[
                      styles.diffValue,
                      { color: diff > 0 ? Colors.success : Colors.danger },
                    ]}>
                      {diff > 0 ? `+${diff}` : `${diff}`}점
                    </Text>
                  </View>
                );
              })}
              {history[0].baumann_code !== history[1].baumann_code && (
                <View style={styles.diffRow}>
                  <Text style={styles.diffMetric}>바우만 코드</Text>
                  <Text style={styles.diffValue}>
                    {history[1].baumann_code} → {history[0].baumann_code}
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* 타임라인 */}
          <View style={styles.timelineWrap}>
            <View style={styles.timelineLine} />
            {history.map((entry, i) => (
              <HistoryCard
                key={entry.id}
                entry={entry}
                prev={history[i + 1]}
                index={totalCount - 1 - i}
                isLatest={i === 0}
              />
            ))}
          </View>

          <TouchableOpacity style={styles.reAnalyzeBtn} onPress={() => router.push('/skin-analysis' as any)}>
            <Ionicons name="refresh-outline" size={18} color={Colors.primary} />
            <Text style={styles.reAnalyzeBtnText}>재분석하기</Text>
          </TouchableOpacity>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: HEADER_TOP, paddingBottom: 12, paddingHorizontal: 16,
    backgroundColor: Colors.white, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  backBtn: { width: 40, alignItems: 'flex-start' },
  headerTitle: { fontSize: 17, fontWeight: '700', color: Colors.text },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 32 },
  emptyEmoji: { fontSize: 48 },
  emptyTitle: { fontSize: 17, fontWeight: '800', color: Colors.text },
  emptyDesc: { fontSize: 14, color: Colors.sub, textAlign: 'center', lineHeight: 22 },
  goBtn: {
    marginTop: 8, backgroundColor: Colors.primary,
    paddingVertical: 14, paddingHorizontal: 32, borderRadius: 14,
  },
  goBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  scroll: { padding: 20, gap: 16 },

  /* 요약 카드 */
  summaryCard: {
    backgroundColor: Colors.white, borderRadius: 16, padding: 20,
    flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center',
    borderWidth: 1, borderColor: Colors.border,
  },
  summaryItem: { alignItems: 'center', gap: 4 },
  summaryNum: { fontSize: 18, fontWeight: '800', color: Colors.primary },
  summaryLabel: { fontSize: 11, color: Colors.sub, fontWeight: '600' },
  summaryDivider: { width: 1, height: 36, backgroundColor: Colors.border },

  /* 변화 비교 카드 */
  diffCard: {
    backgroundColor: Colors.white, borderRadius: 16, padding: 18,
    borderWidth: 1, borderColor: Colors.primaryLight, gap: 10,
  },
  diffTitle: { fontSize: 15, fontWeight: '800', color: Colors.text },
  diffSubtitle: { fontSize: 12, color: Colors.sub, marginTop: -6 },
  diffRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  diffMetric: { fontSize: 14, color: Colors.text, fontWeight: '600' },
  diffValue: { fontSize: 14, fontWeight: '800' },

  /* 타임라인 */
  timelineWrap: { gap: 0, position: 'relative', paddingLeft: 24 },
  timelineLine: {
    position: 'absolute', left: 30, top: 12, bottom: 12, width: 2,
    backgroundColor: Colors.border,
  },
  card: {
    backgroundColor: Colors.white, borderRadius: 16, marginBottom: 14,
    borderWidth: 1, borderColor: Colors.border,
    overflow: 'hidden',
  },
  cardLatest: { borderColor: Colors.primary, borderWidth: 1.5 },
  timelineDot: {
    position: 'absolute', left: -18, top: 20, zIndex: 2,
  },
  dot: {
    width: 12, height: 12, borderRadius: 6,
    backgroundColor: Colors.border, borderWidth: 2, borderColor: Colors.white,
  },
  dotLatest: { backgroundColor: Colors.primary },
  cardHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 16,
  },
  cardHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardHeaderRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  latestBadge: {
    backgroundColor: Colors.primaryLight, borderRadius: 6,
    paddingHorizontal: 7, paddingVertical: 2,
  },
  latestBadgeText: { fontSize: 11, fontWeight: '700', color: Colors.primary },
  cardDate: { fontSize: 14, fontWeight: '700', color: Colors.text },
  cardNum: { fontSize: 12, color: Colors.sub },
  codeBadge: {
    backgroundColor: '#1A1A2E', borderRadius: 8,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  codeBadgeText: { fontSize: 13, fontWeight: '800', color: '#fff', letterSpacing: 1 },
  skinTypeText: { fontSize: 13, fontWeight: '600', color: Colors.sub },

  cardBody: { paddingHorizontal: 16, paddingBottom: 16, gap: 8, borderTopWidth: 1, borderTopColor: Colors.border },
  dehydrationBadge: {
    backgroundColor: '#FFF3CD', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4,
    alignSelf: 'flex-start', marginTop: 8,
  },
  dehydrationText: { fontSize: 12, fontWeight: '600', color: '#856404' },
  metricsTitle: { fontSize: 13, fontWeight: '700', color: Colors.text, marginTop: 4 },

  /* 지표 바 */
  metricRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  metricLabel: { width: 52, fontSize: 12, color: Colors.sub, fontWeight: '600' },
  metricBarBg: {
    flex: 1, height: 7, borderRadius: 4, backgroundColor: Colors.border, overflow: 'hidden',
  },
  metricBarFill: { height: '100%', borderRadius: 4 },
  metricRight: { flexDirection: 'row', alignItems: 'center', gap: 4, width: 54 },
  metricNum: { fontSize: 12, fontWeight: '700', color: Colors.text, width: 26, textAlign: 'right' },
  metricDiff: { fontSize: 11, fontWeight: '700', width: 28 },
  prevNote: { fontSize: 11, color: Colors.sub, marginTop: 4 },

  /* 재분석 버튼 */
  reAnalyzeBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingVertical: 14, borderRadius: 14,
    borderWidth: 1.5, borderColor: Colors.primary,
    backgroundColor: Colors.white,
  },
  reAnalyzeBtnText: { fontSize: 15, fontWeight: '700', color: Colors.primary },
});
