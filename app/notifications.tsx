import {
  View, Text, StyleSheet, Switch, ScrollView, TouchableOpacity, Alert,
} from 'react-native';
import { useEffect, useState } from 'react';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors } from '../constants/colors';

const STORAGE_KEY = 'notification_settings';

interface NotifSettings {
  community: boolean;
  review: boolean;
  event: boolean;
  point: boolean;
  newContent: boolean;
}

const DEFAULT_SETTINGS: NotifSettings = {
  community: true,
  review: true,
  event: true,
  point: true,
  newContent: false,
};

const ITEMS: { key: keyof NotifSettings; icon: string; title: string; desc: string }[] = [
  { key: 'community', icon: '💬', title: '커뮤니티 알림', desc: '내 글에 댓글이 달렸을 때 알림' },
  { key: 'review', icon: '⭐', title: '리뷰 알림', desc: '관심 시술·기기에 새 리뷰가 등록될 때' },
  { key: 'point', icon: '🪙', title: '포인트 알림', desc: '포인트 적립·미션 완료 알림' },
  { key: 'event', icon: '🎁', title: '이벤트·혜택 알림', desc: '픽디 이벤트 및 프로모션 소식' },
  { key: 'newContent', icon: '✨', title: '신규 콘텐츠 알림', desc: '새 시술·기기 등록 알림' },
];

export default function NotificationsScreen() {
  const [settings, setSettings] = useState<NotifSettings>(DEFAULT_SETTINGS);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
      if (raw) {
        try { setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(raw) }); } catch { /* ignore */ }
      }
      setLoaded(true);
    });
  }, []);

  const toggle = async (key: keyof NotifSettings) => {
    const next = { ...settings, [key]: !settings[key] };
    setSettings(next);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  };

  const handleAllOff = () => {
    Alert.alert('모든 알림 끄기', '모든 알림을 끄시겠어요?', [
      { text: '취소', style: 'cancel' },
      {
        text: '끄기',
        style: 'destructive',
        onPress: async () => {
          const allOff: NotifSettings = {
            community: false, review: false, event: false, point: false, newContent: false,
          };
          setSettings(allOff);
          await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(allOff));
        },
      },
    ]);
  };

  if (!loaded) return null;

  const anyOn = Object.values(settings).some(Boolean);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.back}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>알림 설정</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.noticeBox}>
          <Text style={styles.noticeText}>
            🔔 알림은 앱 설정에서 허용된 경우에만 전달됩니다.{'\n'}
            픽디 베타 기간 중에는 일부 알림이 제한될 수 있어요.
          </Text>
        </View>

        <View style={styles.sectionLabel}>
          <Text style={styles.sectionLabelText}>알림 종류</Text>
        </View>

        {ITEMS.map((item, index) => (
          <View key={item.key} style={[styles.row, index === ITEMS.length - 1 && styles.rowLast]}>
            <View style={styles.rowIcon}>
              <Text style={{ fontSize: 20 }}>{item.icon}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowTitle}>{item.title}</Text>
              <Text style={styles.rowDesc}>{item.desc}</Text>
            </View>
            <Switch
              value={settings[item.key]}
              onValueChange={() => toggle(item.key)}
              trackColor={{ false: Colors.border, true: Colors.primary }}
              thumbColor={Colors.white}
            />
          </View>
        ))}

        {anyOn && (
          <TouchableOpacity style={styles.allOffBtn} onPress={handleAllOff}>
            <Text style={styles.allOffText}>모든 알림 끄기</Text>
          </TouchableOpacity>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 16, paddingTop: 56, backgroundColor: Colors.white,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  back: { fontSize: 24, color: Colors.text, width: 32 },
  title: { fontSize: 17, fontWeight: '700', color: Colors.text },
  noticeBox: {
    margin: 16, padding: 14, backgroundColor: '#FFF8E1', borderRadius: 12,
    borderLeftWidth: 3, borderLeftColor: '#F9A825',
  },
  noticeText: { fontSize: 12, color: '#7B6200', lineHeight: 18 },
  sectionLabel: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 },
  sectionLabelText: { fontSize: 12, fontWeight: '700', color: Colors.sub, textTransform: 'uppercase', letterSpacing: 0.5 },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: Colors.white, paddingVertical: 14, paddingHorizontal: 20,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  rowLast: { borderBottomWidth: 0 },
  rowIcon: {
    width: 40, height: 40, borderRadius: 10, backgroundColor: Colors.bg,
    alignItems: 'center', justifyContent: 'center',
  },
  rowTitle: { fontSize: 14, fontWeight: '700', color: Colors.text },
  rowDesc: { fontSize: 12, color: Colors.sub, marginTop: 2 },
  allOffBtn: {
    margin: 16, padding: 14, borderRadius: 12,
    borderWidth: 1.5, borderColor: Colors.danger, alignItems: 'center',
  },
  allOffText: { fontSize: 14, fontWeight: '700', color: Colors.danger },
});
