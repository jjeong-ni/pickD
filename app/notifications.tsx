import {
  View, Text, StyleSheet, Switch, ScrollView, TouchableOpacity,
  Alert, ActivityIndicator,
} from 'react-native';
import { useEffect, useState } from 'react';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { Colors, HEADER_TOP } from '../constants/colors';

const SETTINGS_KEY = 'notification_settings';

interface NotifSettings {
  community: boolean;
  review: boolean;
  event: boolean;
  point: boolean;
  newContent: boolean;
}

const DEFAULT_SETTINGS: NotifSettings = {
  community: true, review: true, event: true, point: true, newContent: false,
};

const SETTING_ITEMS: { key: keyof NotifSettings; icon: string; title: string; desc: string }[] = [
  { key: 'community', icon: 'chatbubble-outline', title: '커뮤니티 알림', desc: '내 글에 댓글이 달렸을 때' },
  { key: 'review', icon: 'star-outline', title: '리뷰 알림', desc: '관심 시술·기기에 새 리뷰 등록 시' },
  { key: 'point', icon: 'cash-outline', title: '포인트 알림', desc: '포인트 적립·미션 완료' },
  { key: 'event', icon: 'gift-outline', title: '이벤트·혜택 알림', desc: '픽디 이벤트 및 프로모션' },
  { key: 'newContent', icon: 'newspaper-outline', title: '신규 콘텐츠 알림', desc: '새 시술·기기 등록 시' },
];

const TYPE_META: Record<string, { icon: string; color: string }> = {
  comment:  { icon: 'chatbubble-outline', color: '#3B82F6' },
  review:   { icon: 'star-outline', color: '#F59E0B' },
  point:    { icon: 'cash-outline', color: Colors.success },
  event:    { icon: 'gift-outline', color: Colors.primary },
  default:  { icon: 'notifications-outline', color: Colors.sub },
};

interface Notif {
  id: string;
  type: string;
  title: string;
  body: string;
  link: string | null;
  is_read: boolean;
  created_at: string;
}

function timeAgo(iso: string): string {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return '방금 전';
  if (diff < 3600) return `${Math.floor(diff / 60)}분 전`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}일 전`;
  const d = new Date(iso);
  return `${d.getMonth() + 1}.${d.getDate()}`;
}

type Tab = 'inbox' | 'settings';

export default function NotificationsScreen() {
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>('inbox');
  const [notifs, setNotifs] = useState<Notif[]>([]);
  const [notifLoading, setNotifLoading] = useState(true);
  const [settings, setSettings] = useState<NotifSettings>(DEFAULT_SETTINGS);
  const [settingsLoaded, setSettingsLoaded] = useState(false);

  // 알림 목록 로드
  useEffect(() => {
    if (!user) { setNotifLoading(false); return; }
    supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50)
      .then(({ data }) => {
        setNotifs(data ?? []);
        setNotifLoading(false);
      });
  }, [user?.id]);

  // 설정 로드
  useEffect(() => {
    AsyncStorage.getItem(SETTINGS_KEY).then((raw) => {
      if (raw) {
        try { setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(raw) }); } catch { /* ignore */ }
      }
      setSettingsLoaded(true);
    });
  }, []);

  const toggleSetting = async (key: keyof NotifSettings) => {
    const next = { ...settings, [key]: !settings[key] };
    setSettings(next);
    await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
  };

  const markAllRead = async () => {
    if (!user || notifs.every((n) => n.is_read)) return;
    setNotifs((prev) => prev.map((n) => ({ ...n, is_read: true })));
    await supabase.from('notifications').update({ is_read: true }).eq('user_id', user.id);
  };

  const markRead = async (notif: Notif) => {
    if (!notif.is_read) {
      setNotifs((prev) => prev.map((n) => n.id === notif.id ? { ...n, is_read: true } : n));
      await supabase.from('notifications').update({ is_read: true }).eq('id', notif.id);
    }
    if (notif.link) {
      router.push(notif.link as any);
    }
  };

  const clearAll = () => {
    if (!user) return;
    Alert.alert('알림 전체 삭제', '모든 알림을 삭제할까요?', [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제', style: 'destructive',
        onPress: async () => {
          setNotifs([]);
          await supabase.from('notifications').delete().eq('user_id', user.id);
        },
      },
    ]);
  };

  const unreadCount = notifs.filter((n) => !n.is_read).length;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>알림</Text>
        <View style={{ width: 32 }} />
      </View>

      {/* 탭 */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tabBtn, tab === 'inbox' && styles.tabBtnActive]}
          onPress={() => setTab('inbox')}
        >
          <Text style={[styles.tabText, tab === 'inbox' && styles.tabTextActive]}>알림함</Text>
          {unreadCount > 0 && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadBadgeText}>{unreadCount}</Text>
            </View>
          )}
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabBtn, tab === 'settings' && styles.tabBtnActive]}
          onPress={() => setTab('settings')}
        >
          <Text style={[styles.tabText, tab === 'settings' && styles.tabTextActive]}>알림 설정</Text>
        </TouchableOpacity>
      </View>

      {tab === 'inbox' ? (
        notifLoading ? (
          <View style={styles.center}><ActivityIndicator color={Colors.primary} /></View>
        ) : notifs.length === 0 ? (
          <View style={styles.center}>
            <Text style={styles.emptyEmoji}>🔔</Text>
            <Text style={styles.emptyTitle}>알림이 없어요</Text>
            <Text style={styles.emptyDesc}>커뮤니티 활동, 포인트 적립 등의{'\n'}소식이 여기에 표시됩니다</Text>
          </View>
        ) : (
          <ScrollView showsVerticalScrollIndicator={false}>
            {/* 상단 액션 */}
            <View style={styles.inboxActions}>
              {unreadCount > 0 && (
                <TouchableOpacity onPress={markAllRead}>
                  <Text style={styles.markAllText}>모두 읽음 처리</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity onPress={clearAll}>
                <Text style={styles.clearAllText}>전체 삭제</Text>
              </TouchableOpacity>
            </View>

            {notifs.map((n) => {
              const meta = TYPE_META[n.type] ?? TYPE_META.default;
              return (
                <TouchableOpacity
                  key={n.id}
                  style={[styles.notifRow, !n.is_read && styles.notifRowUnread]}
                  onPress={() => markRead(n)}
                  activeOpacity={0.75}
                >
                  <View style={[styles.notifIcon, { backgroundColor: meta.color + '20' }]}>
                    <Ionicons name={meta.icon as any} size={20} color={meta.color} />
                  </View>
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={styles.notifTitle}>{n.title}</Text>
                    <Text style={styles.notifBody} numberOfLines={2}>{n.body}</Text>
                    <Text style={styles.notifTime}>{timeAgo(n.created_at)}</Text>
                  </View>
                  {!n.is_read && <View style={styles.unreadDot} />}
                  {n.link && <Ionicons name="chevron-forward" size={14} color={Colors.sub} />}
                </TouchableOpacity>
              );
            })}
            <View style={{ height: 40 }} />
          </ScrollView>
        )
      ) : (
        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={styles.noticeBox}>
            <Text style={styles.noticeText}>
              🔔 현재 인앱 알림이 지원됩니다.{'\n'}
              향후 업데이트에서 푸시 알림이 추가될 예정이에요.
            </Text>
          </View>

          <View style={styles.sectionLabel}>
            <Text style={styles.sectionLabelText}>알림 종류</Text>
          </View>

          {settingsLoaded && SETTING_ITEMS.map((item, index) => (
            <View key={item.key} style={[styles.row, index === SETTING_ITEMS.length - 1 && styles.rowLast]}>
              <View style={styles.rowIcon}>
                <Ionicons name={item.icon as any} size={20} color={Colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowTitle}>{item.title}</Text>
                <Text style={styles.rowDesc}>{item.desc}</Text>
              </View>
              <Switch
                value={settings[item.key]}
                onValueChange={() => toggleSetting(item.key)}
                trackColor={{ false: Colors.border, true: Colors.primary }}
                thumbColor={Colors.white}
              />
            </View>
          ))}
          <View style={{ height: 40 }} />
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 16, paddingTop: HEADER_TOP, backgroundColor: Colors.white,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  title: { fontSize: 17, fontWeight: '700', color: Colors.text },

  /* 탭 */
  tabs: {
    flexDirection: 'row', backgroundColor: Colors.white,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  tabBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 13, gap: 6,
    borderBottomWidth: 2, borderBottomColor: 'transparent',
  },
  tabBtnActive: { borderBottomColor: Colors.primary },
  tabText: { fontSize: 14, fontWeight: '600', color: Colors.sub },
  tabTextActive: { color: Colors.primary },
  unreadBadge: {
    backgroundColor: Colors.primary, borderRadius: 10,
    paddingHorizontal: 6, paddingVertical: 1, minWidth: 18, alignItems: 'center',
  },
  unreadBadgeText: { fontSize: 10, fontWeight: '800', color: '#fff' },

  /* 알림 목록 */
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
  emptyEmoji: { fontSize: 40 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: Colors.text },
  emptyDesc: { fontSize: 13, color: Colors.sub, textAlign: 'center', lineHeight: 20 },

  inboxActions: {
    flexDirection: 'row', justifyContent: 'flex-end', gap: 16,
    paddingHorizontal: 16, paddingVertical: 10,
  },
  markAllText: { fontSize: 13, fontWeight: '600', color: Colors.primary },
  clearAllText: { fontSize: 13, fontWeight: '600', color: Colors.danger },

  notifRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: Colors.white, paddingVertical: 14, paddingHorizontal: 16,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  notifRowUnread: { backgroundColor: '#FFF5F9' },
  notifIcon: {
    width: 42, height: 42, borderRadius: 21,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  notifTitle: { fontSize: 14, fontWeight: '700', color: Colors.text },
  notifBody: { fontSize: 13, color: Colors.sub, lineHeight: 18 },
  notifTime: { fontSize: 11, color: Colors.sub },
  unreadDot: {
    width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.primary, flexShrink: 0,
  },

  /* 설정 */
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
    width: 40, height: 40, borderRadius: 10, backgroundColor: Colors.primaryLight,
    alignItems: 'center', justifyContent: 'center',
  },
  rowTitle: { fontSize: 14, fontWeight: '700', color: Colors.text },
  rowDesc: { fontSize: 12, color: Colors.sub, marginTop: 2 },
});
