import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  FlatList, ActivityIndicator, Image,
} from 'react-native';
import { useEffect, useState } from 'react';
import { router } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { Colors } from '../../constants/colors';
import { useAuth } from '../../hooks/useAuth';
import { useResponsive } from '../../hooks/useResponsive';
import { Treatment, Device } from '../../types';

const TREATMENT_EMOJI: Record<string, string> = {
  '리프팅': '✨', '보톡스': '💉', '필러': '💫', '레이저': '⚡', '스킨케어': '🌿',
};
const DEVICE_EMOJI: Record<string, string> = {
  '리프팅': '✨', '제모': '🪄', 'RF': '⚡', 'LED': '💡', '초음파': '🌊',
};

export default function HomeScreen() {
  const { user, profile } = useAuth();
  const { cardWidth, hPad } = useResponsive();
  const [treatments, setTreatments] = useState<Treatment[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [recommended, setRecommended] = useState<Treatment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (profile?.skin_type) fetchRecommended();
  }, [profile]);

  const fetchData = async () => {
    const [t, d] = await Promise.all([
      supabase.from('treatments').select('*').limit(6).order('rating', { ascending: false }),
      supabase.from('devices').select('*').limit(6).order('rating', { ascending: false }),
    ]);
    setTreatments(t.data ?? []);
    setDevices(d.data ?? []);
    setLoading(false);
  };

  const fetchRecommended = async () => {
    if (!profile?.concerns?.length) return;
    const concern = profile.concerns[0];
    const { data } = await supabase
      .from('treatments')
      .select('*')
      .contains('tags', [concern])
      .order('rating', { ascending: false })
      .limit(5);
    if (data && data.length > 0) setRecommended(data);
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={Colors.primary} size="large" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* 헤더 */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>안녕하세요,</Text>
          <Text style={styles.nickname}>
            {profile?.nickname || user?.email?.split('@')[0] || (user ? '사용자' : '방문자')} 님 👋
          </Text>
        </View>
        <View style={styles.headerRight}>
          {user && (
            <TouchableOpacity style={styles.missionIcon} onPress={() => router.push('/missions' as any)} activeOpacity={0.8}>
              <Text style={styles.missionIconEmoji}>🎯</Text>
              <Text style={styles.missionIconLabel}>미션</Text>
            </TouchableOpacity>
          )}
          {user && (
            <View style={styles.pointBadge}>
              <Text style={styles.pointText}>🪙 {profile?.points ?? 0} pt</Text>
            </View>
          )}
        </View>
      </View>

      {/* 피부 프로필 완성 유도 카드 (로그인했지만 프로필 없을 때) */}
      {user && !profile?.skin_type && (
        <TouchableOpacity
          style={styles.profilePrompt}
          onPress={() => router.push('/profile-setup' as any)}
          activeOpacity={0.85}
        >
          <View style={{ flex: 1 }}>
            <Text style={styles.profilePromptTitle}>✨ 맞춤 추천을 받아보세요</Text>
            <Text style={styles.profilePromptDesc}>피부 타입과 고민을 입력하면{'\n'}나에게 딱 맞는 시술을 추천해드려요</Text>
          </View>
          <Text style={styles.profilePromptArrow}>›</Text>
        </TouchableOpacity>
      )}

      {/* 피부 타입 배너 (로그인+프로필 있을 때) */}
      {profile?.skin_type ? (
        <TouchableOpacity style={styles.banner} onPress={() => router.push('/search')}>
          <Text style={styles.bannerLabel}>내 피부 타입</Text>
          <Text style={styles.bannerValue}>{profile.skin_type}</Text>
          <Text style={styles.bannerSub}>
            {profile.concerns?.length
              ? `${profile.concerns.join(', ')} 고민 맞춤 추천 →`
              : '맞춤 시술·기기 추천 →'}
          </Text>
        </TouchableOpacity>
      ) : !user ? (
        // 비로그인 — 가입 유도 배너
        <TouchableOpacity
          style={[styles.banner, styles.bannerGuest]}
          onPress={() => router.push('/(auth)/signup')}
        >
          <Text style={styles.bannerLabel}>✨ AI 맞춤 추천</Text>
          <Text style={styles.bannerValue}>내 피부에 딱 맞는{'\n'}시술을 찾아드려요</Text>
          <Text style={styles.bannerSub}>무료 회원가입으로 시작하기 →</Text>
        </TouchableOpacity>
      ) : null}

      {/* 맞춤 추천 (프로필 고민 기반) */}
      {recommended.length > 0 && profile?.concerns?.[0] && (
        <Section title={`${profile.concerns[0]} 고민 맞춤 추천`} onMore={() => router.push('/search')}>
          <FlatList
            horizontal
            data={recommended}
            keyExtractor={(i) => i.id}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingLeft: hPad, paddingRight: hPad, gap: 12 }}
            renderItem={({ item }) => (
              <TreatmentCard item={item} width={cardWidth} onPress={() => router.push(`/treatment/${item.id}` as any)} />
            )}
          />
        </Section>
      )}

      {/* 인기 시술 */}
      <Section title="인기 시술" onMore={() => router.push('/search')}>
        {treatments.length > 0 ? (
          <FlatList
            horizontal
            data={treatments}
            keyExtractor={(i) => i.id}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingLeft: hPad, paddingRight: hPad, gap: 12 }}
            renderItem={({ item }) => (
              <TreatmentCard item={item} width={cardWidth} onPress={() => router.push(`/treatment/${item.id}` as any)} />
            )}
          />
        ) : (
          <Text style={styles.emptySection}>데이터를 불러오는 중이에요</Text>
        )}
      </Section>

      {/* 인기 기기 */}
      <Section title="인기 기기" onMore={() => router.push('/search')}>
        {devices.length > 0 ? (
          <FlatList
            horizontal
            data={devices}
            keyExtractor={(i) => i.id}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingLeft: hPad, paddingRight: hPad, gap: 12 }}
            renderItem={({ item }) => (
              <DeviceCard item={item} width={cardWidth} onPress={() => router.push(`/device/${item.id}` as any)} />
            )}
          />
        ) : (
          <Text style={styles.emptySection}>데이터를 불러오는 중이에요</Text>
        )}
      </Section>

      <View style={{ height: 20 }} />
    </ScrollView>
  );
}

function Section({
  title, onMore, children,
}: { title: string; onMore: () => void; children: React.ReactNode }) {
  return (
    <View style={{ marginTop: 28 }}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{title}</Text>
        <TouchableOpacity onPress={onMore}>
          <Text style={styles.sectionMore}>더보기</Text>
        </TouchableOpacity>
      </View>
      {children}
    </View>
  );
}

function TreatmentCard({ item, width, onPress }: { item: Treatment; width?: number; onPress: () => void }) {
  return (
    <TouchableOpacity style={[styles.card, width ? { width } : {}]} onPress={onPress}>
      <View style={styles.cardImage}>
        {item.image_url
          ? <Image source={{ uri: item.image_url }} style={StyleSheet.absoluteFill} resizeMode="cover" />
          : <Text style={styles.cardEmoji}>{TREATMENT_EMOJI[item.category] ?? '💆'}</Text>}
      </View>
      <View style={styles.cardBody}>
        <Text style={styles.cardCategory}>{item.category}</Text>
        <Text style={styles.cardTitle} numberOfLines={1}>{item.name}</Text>
        <Text style={styles.cardPrice}>
          {item.price_min.toLocaleString()}~{item.price_max.toLocaleString()}원
        </Text>
        <Text style={styles.cardRating}>⭐ {item.rating.toFixed(1)} ({item.review_count})</Text>
      </View>
    </TouchableOpacity>
  );
}

function DeviceCard({ item, width, onPress }: { item: Device; width?: number; onPress: () => void }) {
  return (
    <TouchableOpacity style={[styles.card, width ? { width } : {}]} onPress={onPress}>
      <View style={[styles.cardImage, { backgroundColor: '#EEE8FF' }]}>
        {item.image_url
          ? <Image source={{ uri: item.image_url }} style={StyleSheet.absoluteFill} resizeMode="cover" />
          : <Text style={styles.cardEmoji}>{DEVICE_EMOJI[item.category] ?? '⚡'}</Text>}
      </View>
      <View style={styles.cardBody}>
        <Text style={styles.cardCategory}>{item.brand}</Text>
        <Text style={styles.cardTitle} numberOfLines={1}>{item.name}</Text>
        <Text style={styles.cardPrice}>{item.price.toLocaleString()}원</Text>
        <Text style={styles.cardRating}>⭐ {item.rating.toFixed(1)} ({item.review_count})</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
    padding: 20, paddingTop: 60, backgroundColor: Colors.white,
  },
  greeting: { fontSize: 14, color: Colors.sub },
  nickname: { fontSize: 22, fontWeight: '800', color: Colors.text, marginTop: 2 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  missionIcon: {
    alignItems: 'center', justifyContent: 'center', gap: 2,
    backgroundColor: '#FFF0F5', borderRadius: 12,
    paddingVertical: 6, paddingHorizontal: 10,
  },
  missionIconEmoji: { fontSize: 18 },
  missionIconLabel: { fontSize: 10, fontWeight: '700', color: Colors.primary },
  pointBadge: {
    backgroundColor: Colors.primaryLight, borderRadius: 20, paddingVertical: 6, paddingHorizontal: 12,
  },
  pointText: { fontSize: 13, fontWeight: '700', color: Colors.primary },
  profilePrompt: {
    flexDirection: 'row', alignItems: 'center',
    margin: 20, marginBottom: 0, padding: 18,
    backgroundColor: Colors.white, borderRadius: 16,
    borderWidth: 1.5, borderColor: Colors.primaryLight,
  },
  profilePromptTitle: { fontSize: 14, fontWeight: '700', color: Colors.primary, marginBottom: 4 },
  profilePromptDesc: { fontSize: 12, color: Colors.sub, lineHeight: 18 },
  profilePromptArrow: { fontSize: 22, color: Colors.primary, marginLeft: 8 },
  banner: {
    margin: 20, padding: 20, backgroundColor: Colors.primary, borderRadius: 16,
  },
  bannerGuest: { backgroundColor: '#6B4EFF' },
  bannerLabel: { fontSize: 12, color: 'rgba(255,255,255,0.7)', fontWeight: '600' },
  bannerValue: { fontSize: 22, fontWeight: '800', color: Colors.white, marginTop: 4, lineHeight: 30 },
  bannerSub: { fontSize: 13, color: 'rgba(255,255,255,0.85)', marginTop: 8 },
  sectionHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, marginBottom: 12,
  },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: Colors.text },
  sectionMore: { fontSize: 14, color: Colors.primary, fontWeight: '600' },
  emptySection: { paddingHorizontal: 20, fontSize: 14, color: Colors.sub },
  card: { width: 160, backgroundColor: Colors.white, borderRadius: 12, overflow: 'hidden' },
  cardImage: {
    height: 120, backgroundColor: '#FFE8F0',
    alignItems: 'center', justifyContent: 'center',
  },
  cardEmoji: { fontSize: 40 },
  cardBody: { padding: 12 },
  cardCategory: { fontSize: 11, color: Colors.sub, fontWeight: '600' },
  cardTitle: { fontSize: 14, fontWeight: '700', color: Colors.text, marginTop: 2 },
  cardPrice: { fontSize: 13, color: Colors.primary, fontWeight: '600', marginTop: 4 },
  cardRating: { fontSize: 11, color: Colors.sub, marginTop: 4 },
});
