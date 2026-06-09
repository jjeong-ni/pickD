import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Platform,
} from 'react-native';
import { useEffect, useState } from 'react';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { Colors, HEADER_TOP } from '../constants/colors';
import { Payment } from '../types';

const STATUS_LABEL: Record<Payment['status'], string> = {
  done: '결제 완료',
  pending: '결제 대기',
  failed: '결제 실패',
  canceled: '취소됨',
};

const STATUS_COLOR: Record<Payment['status'], string> = {
  done: Colors.success,
  pending: '#F5A623',
  failed: Colors.danger,
  canceled: Colors.sub,
};

export default function PurchasesScreen() {
  const { user } = useAuth();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);

  useEffect(() => {
    if (user) fetchPayments();
    else setLoading(false);
  }, [user]);

  const fetchPayments = async () => {
    setFetchError(false);
    const { data, error } = await supabase
      .from('payments')
      .select('*')
      .eq('user_id', user!.id)
      .order('created_at', { ascending: false });
    if (error) {
      setFetchError(true);
    } else {
      setPayments(data ?? []);
    }
    setLoading(false);
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#FF6B9D', '#D473E8', '#9B6FE8']}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.back}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>구매 내역</Text>
        <View style={{ width: 32 }} />
      </LinearGradient>

      {loading ? (
        <View style={styles.center}><ActivityIndicator color={Colors.primary} /></View>
      ) : fetchError ? (
        <View style={styles.center}>
          <Text style={styles.emptyIcon}>⚠️</Text>
          <Text style={styles.emptyTitle}>불러오기 실패</Text>
          <Text style={styles.emptyDesc}>네트워크를 확인하고 다시 시도해주세요</Text>
          <TouchableOpacity style={styles.goBtn} onPress={() => { setLoading(true); fetchPayments(); }}>
            <Text style={styles.goBtnText}>다시 시도</Text>
          </TouchableOpacity>
        </View>
      ) : payments.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyIcon}>🛒</Text>
          <Text style={styles.emptyTitle}>구매 내역이 없어요</Text>
          <Text style={styles.emptyDesc}>시술·기기를 예약하면{'\n'}여기서 내역을 확인할 수 있어요</Text>
          <TouchableOpacity style={styles.goBtn} onPress={() => router.push('/(tabs)/search' as any)}>
            <Text style={styles.goBtnText}>시술·기기 둘러보기</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={payments}
          keyExtractor={(i) => i.id}
          contentContainerStyle={{ padding: 20, gap: 12 }}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.cardTop}>
                <Text style={styles.orderName} numberOfLines={2}>{item.order_name}</Text>
                <View style={[styles.statusBadge, { backgroundColor: `${STATUS_COLOR[item.status]}18` }]}>
                  <Text style={[styles.statusText, { color: STATUS_COLOR[item.status] }]}>
                    {STATUS_LABEL[item.status]}
                  </Text>
                </View>
              </View>
              <View style={styles.cardBottom}>
                <Text style={styles.amount}>{item.amount.toLocaleString()}원</Text>
                <Text style={styles.date}>
                  {new Date(item.created_at).toLocaleDateString('ko-KR', {
                    year: 'numeric', month: 'long', day: 'numeric',
                  })}
                </Text>
              </View>
              {item.order_id && (
                <Text style={styles.orderId}>주문번호: {item.order_id}</Text>
              )}
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
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 16, paddingTop: HEADER_TOP, paddingBottom: 16,
  },
  back: { fontSize: 24, color: Colors.white, width: 32 },
  title: { fontSize: 17, fontWeight: '700', color: Colors.white },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  emptyIcon: { fontSize: 52 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: Colors.text },
  emptyDesc: { fontSize: 14, color: Colors.sub, textAlign: 'center', lineHeight: 22 },
  goBtn: { marginTop: 8, backgroundColor: Colors.primary, paddingVertical: 12, paddingHorizontal: 28, borderRadius: 12 },
  goBtnText: { color: Colors.white, fontWeight: '700', fontSize: 15 },
  card: {
    backgroundColor: Colors.white, borderRadius: 14, padding: 16,
    gap: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
  },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 },
  orderName: { flex: 1, fontSize: 15, fontWeight: '700', color: Colors.text, lineHeight: 22 },
  statusBadge: { paddingVertical: 4, paddingHorizontal: 10, borderRadius: 20 },
  statusText: { fontSize: 12, fontWeight: '700' },
  cardBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  amount: { fontSize: 17, fontWeight: '800', color: Colors.text },
  date: { fontSize: 12, color: Colors.sub },
  orderId: { fontSize: 11, color: Colors.sub, borderTopWidth: 1, borderTopColor: Colors.border, paddingTop: 8 },
});
