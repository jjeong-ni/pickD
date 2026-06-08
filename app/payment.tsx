import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Colors } from '../constants/colors';

export default function PaymentScreen() {
  const { itemName, amount } = useLocalSearchParams<{ itemName?: string; amount?: string }>();

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
        <Text style={styles.backBtnText}>←</Text>
      </TouchableOpacity>

      <View style={styles.content}>
        <Text style={styles.icon}>💳</Text>
        <Text style={styles.title}>결제 기능 준비중</Text>

        {itemName && (
          <View style={styles.itemCard}>
            <Text style={styles.itemLabel}>선택 항목</Text>
            <Text style={styles.itemName}>{itemName}</Text>
            {amount && (
              <Text style={styles.itemAmount}>
                {Number(amount).toLocaleString()}원~
              </Text>
            )}
          </View>
        )}

        <Text style={styles.desc}>
          토스페이먼츠 연동 결제 기능이{'\n'}
          베타 오픈 후 추가될 예정이에요.{'\n\n'}
          지금은 해당 시술·기기를 메모해두시고{'\n'}
          병원에 직접 문의해 주세요.
        </Text>

        <TouchableOpacity style={styles.btn} onPress={() => router.back()}>
          <Text style={styles.btnText}>돌아가기</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.white },
  backBtn: { paddingTop: 56, paddingHorizontal: 20, paddingBottom: 8 },
  backBtnText: { fontSize: 24, color: Colors.text },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, padding: 32 },
  icon: { fontSize: 56 },
  title: { fontSize: 22, fontWeight: '800', color: Colors.text },
  itemCard: {
    width: '100%', backgroundColor: Colors.bg, borderRadius: 16, padding: 20,
    alignItems: 'center', gap: 6,
  },
  itemLabel: { fontSize: 12, color: Colors.sub, fontWeight: '600' },
  itemName: { fontSize: 18, fontWeight: '700', color: Colors.text, textAlign: 'center' },
  itemAmount: { fontSize: 16, color: Colors.primary, fontWeight: '700' },
  desc: { fontSize: 14, color: Colors.sub, textAlign: 'center', lineHeight: 24 },
  btn: {
    backgroundColor: Colors.primary, paddingVertical: 14, paddingHorizontal: 32, borderRadius: 12,
  },
  btnText: { color: Colors.white, fontWeight: '700', fontSize: 15 },
});
