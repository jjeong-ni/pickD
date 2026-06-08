import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Colors } from '../constants/colors';

export default function ComingSoonScreen() {
  const { title } = useLocalSearchParams<{ title?: string }>();

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
        <Text style={styles.backBtnText}>←</Text>
      </TouchableOpacity>

      <View style={styles.content}>
        <Text style={styles.icon}>🚧</Text>
        <Text style={styles.title}>{title ?? '준비 중'}</Text>
        <Text style={styles.desc}>
          현재 열심히 개발 중이에요.{'\n'}곧 만나볼 수 있어요!
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
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 40 },
  icon: { fontSize: 64 },
  title: { fontSize: 22, fontWeight: '800', color: Colors.text },
  desc: { fontSize: 15, color: Colors.sub, textAlign: 'center', lineHeight: 24 },
  btn: {
    marginTop: 16, backgroundColor: Colors.primary,
    paddingVertical: 14, paddingHorizontal: 32, borderRadius: 12,
  },
  btnText: { color: Colors.white, fontWeight: '700', fontSize: 15 },
});
