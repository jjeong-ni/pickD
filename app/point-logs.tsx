import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Platform,
} from 'react-native';
import { useEffect, useState } from 'react';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { Colors, HEADER_TOP } from '../constants/colors';

type PointLog = {
  id: string;
  user_id: string;
  amount: number;
  reason: string;
  created_at: string;
};

export default function PointLogsScreen() {
  const { user, profile } = useAuth();
  const [logs, setLogs] = useState<PointLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);

  useEffect(() => {
    if (user) fetchLogs();
    else setLoading(false);
  }, [user]);

  const fetchLogs = async () => {
    setFetchError(false);
    const { data, error } = await supabase
      .from('point_logs')
      .select('*')
      .eq('user_id', user!.id)
      .order('created_at', { ascending: false });
    if (error) {
      setFetchError(true);
      setLoading(false);
      return;
    }
    setLogs(data ?? []);
    setLoading(false);
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#FF6B9D', '#D473E8', '#9B6FE8']}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <View style={styles.headerNav}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.back}>←</Text>
          </TouchableOpacity>
          <Text style={styles.title}>포인트 내역</Text>
          <View style={{ width: 32 }} />
        </View>
        <View style={styles.totalCard}>
          <Text style={styles.totalLabel}>보유 포인트</Text>
          <Text style={styles.totalPoints}>🪙 {profile?.points ?? 0} pt</Text>
        </View>
      </LinearGradient>

      {loading ? (
        <View style={styles.center}><ActivityIndicator color={Colors.primary} /></View>
      ) : fetchError ? (
        <View style={styles.center}>
          <Text style={{ fontSize: 40, marginBottom: 8 }}>📡</Text>
          <Text style={styles.emptyTitle}>불러오기에 실패했어요</Text>
          <TouchableOpacity onPress={fetchLogs} style={{ marginTop: 12, backgroundColor: Colors.primary, paddingVertical: 10, paddingHorizontal: 24, borderRadius: 12 }}>
            <Text style={{ color: '#fff', fontWeight: '700' }}>다시 시도</Text>
          </TouchableOpacity>
        </View>
      ) : logs.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyIcon}>🪙</Text>
          <Text style={styles.emptyTitle}>포인트 내역이 없어요</Text>
          <Text style={styles.emptyDesc}>리뷰 작성 등으로 포인트를 모아보세요</Text>
        </View>
      ) : (
        <FlatList
          data={logs}
          keyExtractor={(i) => i.id}
          contentContainerStyle={{ padding: 16, gap: 10 }}
          renderItem={({ item }) => (
            <View style={styles.logCard}>
              <View style={styles.logLeft}>
                <Text style={styles.logReason}>{item.reason}</Text>
                <Text style={styles.logDate}>
                  {new Date(item.created_at).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })}
                </Text>
              </View>
              <Text style={[styles.logAmount, item.amount > 0 ? styles.positive : styles.negative]}>
                {item.amount > 0 ? '+' : ''}{item.amount} pt
              </Text>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  header: {
    paddingTop: HEADER_TOP, paddingBottom: 24,
    paddingHorizontal: 16,
  },
  headerNav: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: 20,
  },
  back: { fontSize: 24, color: Colors.white, width: 32 },
  title: { fontSize: 17, fontWeight: '700', color: Colors.white },
  totalCard: {
    padding: 20, backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: 20, alignItems: 'center', gap: 8,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.35)',
  },
  totalLabel: { fontSize: 13, color: 'rgba(255,255,255,0.85)', fontWeight: '600' },
  totalPoints: { fontSize: 32, fontWeight: '900', color: Colors.white },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  emptyIcon: { fontSize: 52 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: Colors.text },
  emptyDesc: { fontSize: 14, color: Colors.sub },
  logCard: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: Colors.white, borderRadius: 12, padding: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  logLeft: { gap: 4 },
  logReason: { fontSize: 14, fontWeight: '600', color: Colors.text },
  logDate: { fontSize: 12, color: Colors.sub },
  logAmount: { fontSize: 16, fontWeight: '800' },
  positive: { color: Colors.primary },
  negative: { color: Colors.sub },
});
