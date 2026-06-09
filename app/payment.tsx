import {
  View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { Colors, HEADER_TOP } from '../constants/colors';

const REPORT_COST = 990;

export default function PaymentScreen() {
  const { user, profile, fetchProfile } = useAuth();
  const { itemName, amount, returnTo } = useLocalSearchParams<{
    itemName?: string; amount?: string; returnTo?: string;
  }>();
  const isReport = returnTo === 'skin-report' || itemName === '맞춤 분석 보고서';
  const cost = isReport ? REPORT_COST : Number(amount ?? 0);
  const hasEnough = (profile?.points ?? 0) >= cost;
  const [loading, setLoading] = useState(false);

  const handlePointPay = async () => {
    if (!user || !profile) {
      router.push('/(auth)/login' as any);
      return;
    }
    if (!hasEnough) {
      Alert.alert('포인트 부족', `보유 포인트(${profile.points}pt)가 부족해요.\n미션을 완료해서 포인트를 모아보세요!`, [
        { text: '미션 가기', onPress: () => router.push('/missions' as any) },
        { text: '닫기', style: 'cancel' },
      ]);
      return;
    }
    setLoading(true);
    const newPoints = profile.points - cost;
    const { error } = await supabase
      .from('profiles')
      .update({ points: newPoints })
      .eq('user_id', user.id);
    if (error) {
      setLoading(false);
      Alert.alert('오류', '포인트 처리 중 문제가 발생했어요');
      return;
    }
    await supabase.from('point_logs').insert({
      user_id: profile.id,
      amount: -cost,
      reason: `맞춤 피부 분석 보고서`,
    }).throwOnError().catch(() => null);
    await fetchProfile(user.id);
    setLoading(false);
    router.replace('/skin-report' as any);
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
        <Ionicons name="arrow-back" size={24} color={Colors.text} />
      </TouchableOpacity>

      <View style={styles.content}>
        <Ionicons name="document-text-outline" size={56} color={Colors.primary} />
        <Text style={styles.title}>맞춤 피부 분석 보고서</Text>
        <Text style={styles.subtitle}>얼굴형 + 피부타입 기반{'\n'}AI 맞춤 보고서</Text>

        {itemName && (
          <View style={styles.itemCard}>
            <Text style={styles.itemLabel}>결제 항목</Text>
            <Text style={styles.itemName}>{itemName}</Text>
            <Text style={styles.itemAmount}>{cost.toLocaleString()} pt</Text>
          </View>
        )}

        {user && profile && (
          <View style={styles.balanceRow}>
            <Text style={styles.balanceLabel}>보유 포인트</Text>
            <Text style={[styles.balanceValue, !hasEnough && styles.balanceInsufficient]}>
              {profile.points.toLocaleString()} pt
            </Text>
          </View>
        )}

        {!user ? (
          <TouchableOpacity style={styles.mainBtn} onPress={() => router.push('/(auth)/login' as any)}>
            <Text style={styles.mainBtnText}>로그인하고 결제하기</Text>
          </TouchableOpacity>
        ) : isReport ? (
          <TouchableOpacity
            style={[styles.mainBtn, (!hasEnough || loading) && styles.mainBtnDisabled]}
            onPress={handlePointPay}
            disabled={!hasEnough || loading}
          >
            {loading
              ? <ActivityIndicator color={Colors.white} />
              : <Text style={styles.mainBtnText}>{cost}pt로 보고서 받기</Text>}
          </TouchableOpacity>
        ) : (
          <View style={styles.comingSoonBox}>
            <Text style={styles.comingSoonText}>토스페이먼츠 결제 기능이{'\n'}베타 오픈 후 추가될 예정이에요.</Text>
          </View>
        )}

        {!hasEnough && user && isReport && (
          <TouchableOpacity style={styles.missionBtn} onPress={() => router.push('/missions' as any)}>
            <Ionicons name="trophy-outline" size={16} color={Colors.primary} />
            <Text style={styles.missionBtnText}>미션 완료하고 포인트 모으기</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity style={styles.backTextBtn} onPress={() => router.back()}>
          <Text style={styles.backTextBtnText}>돌아가기</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.white },
  backBtn: { paddingTop: HEADER_TOP, paddingHorizontal: 20, paddingBottom: 8 },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14, padding: 32 },
  title: { fontSize: 22, fontWeight: '800', color: Colors.text },
  subtitle: { fontSize: 14, color: Colors.sub, textAlign: 'center', lineHeight: 22 },
  itemCard: {
    width: '100%', backgroundColor: Colors.bg, borderRadius: 16, padding: 20,
    alignItems: 'center', gap: 6,
  },
  itemLabel: { fontSize: 12, color: Colors.sub, fontWeight: '600' },
  itemName: { fontSize: 16, fontWeight: '700', color: Colors.text, textAlign: 'center' },
  itemAmount: { fontSize: 20, color: Colors.primary, fontWeight: '800' },
  balanceRow: {
    width: '100%', flexDirection: 'row', justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  balanceLabel: { fontSize: 14, color: Colors.sub },
  balanceValue: { fontSize: 14, fontWeight: '700', color: Colors.text },
  balanceInsufficient: { color: Colors.danger },
  mainBtn: {
    width: '100%', backgroundColor: Colors.primary,
    paddingVertical: 16, borderRadius: 14, alignItems: 'center',
  },
  mainBtnDisabled: { backgroundColor: Colors.border },
  mainBtnText: { color: Colors.white, fontSize: 16, fontWeight: '700' },
  comingSoonBox: {
    width: '100%', backgroundColor: Colors.bg, borderRadius: 12,
    padding: 16, alignItems: 'center',
  },
  comingSoonText: { fontSize: 14, color: Colors.sub, textAlign: 'center', lineHeight: 22 },
  missionBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingVertical: 10, paddingHorizontal: 16,
    borderRadius: 20, borderWidth: 1.5, borderColor: Colors.primary,
  },
  missionBtnText: { fontSize: 13, color: Colors.primary, fontWeight: '600' },
  backTextBtn: { paddingVertical: 8 },
  backTextBtnText: { fontSize: 14, color: Colors.sub },
});
