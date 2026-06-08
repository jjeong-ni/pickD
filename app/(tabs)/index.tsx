import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  FlatList, ActivityIndicator, Image, Platform,
} from 'react-native';
import { useEffect, useState } from 'react';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { Colors, HEADER_TOP } from '../../constants/colors';
import { useAuth } from '../../hooks/useAuth';
import { useResponsive } from '../../hooks/useResponsive';
import { GlassCard } from '../../components/GlassCard';
import { Treatment, Device } from '../../types';

type PairBundle = {
  concern: string;
  icon: string;
  color: string;
  treatment: Treatment | null;
  device: Device | null;
};

const CONCERN_PAIRS: { concern: string; icon: string; color: string; treatmentCat: string; deviceCat: string }[] = [
  { concern: '리프팅·탄력', treatmentCat: '리프팅', deviceCat: '리프팅', icon: 'trending-up-outline', color: '#FF6B9D' },
  { concern: '미백·잡티', treatmentCat: '레이저', deviceCat: 'LED', icon: 'sunny-outline', color: '#FFB347' },
  { concern: '수분·보습', treatmentCat: '스킨케어', deviceCat: '초음파', icon: 'water-outline', color: '#5B9BD5' },
  { concern: '주름·모공', treatmentCat: '보톡스', deviceCat: 'RF', icon: 'medical-outline', color: '#9B6FE8' },
];

const TREATMENT_ICON: Record<string, string> = {
  '리프팅': 'trending-up-outline',
  '보톡스': 'medical-outline',
  '필러': 'water-outline',
  '레이저': 'flash-outline',
  '스킨케어': 'leaf-outline',
};
const DEVICE_ICON: Record<string, string> = {
  '리프팅': 'trending-up-outline',
  '제모': 'cut-outline',
  'RF': 'radio-outline',
  'LED': 'bulb-outline',
  '초음파': 'pulse-outline',
};

export default function HomeScreen() {
  const { user, profile } = useAuth();
  const { cardWidth, hPad } = useResponsive();
  const [treatments, setTreatments] = useState<Treatment[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [recommended, setRecommended] = useState<Treatment[]>([]);
  const [pairs, setPairs] = useState<PairBundle[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchData(); }, []);
  useEffect(() => { if (profile?.skin_type) fetchRecommended(); }, [profile]);

  const fetchData = async () => {
    const [t, d] = await Promise.all([
      supabase.from('treatments').select('*').limit(6).order('rating', { ascending: false }),
      supabase.from('devices').select('*').limit(6).order('rating', { ascending: false }),
    ]);
    const tData: Treatment[] = t.data ?? [];
    const dData: Device[] = d.data ?? [];
    setTreatments(tData);
    setDevices(dData);

    const built: PairBundle[] = [];
    for (const p of CONCERN_PAIRS) {
      const treatment = tData.find((x) => x.category === p.treatmentCat) ?? null;
      const device = dData.find((x) => x.category === p.deviceCat) ?? null;
      if (treatment || device) {
        built.push({ concern: p.concern, icon: p.icon, color: p.color, treatment, device });
      }
    }
    setPairs(built);
    setLoading(false);
  };

  const fetchRecommended = async () => {
    if (!profile?.concerns?.length) return;
    const concern = profile.concerns[0];
    const { data } = await supabase
      .from('treatments').select('*').contains('tags', [concern])
      .order('rating', { ascending: false }).limit(5);
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
      {/* 그라데이션 헤더 */}
      <LinearGradient
        colors={['#FF6B9D', '#D473E8', '#9B6FE8']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        {/* 장식 오브 */}
        <View style={styles.headerOrb1} />
        <View style={styles.headerOrb2} />

        <View style={styles.headerTop}>
          <View>
            <Text style={styles.greeting}>안녕하세요 👋</Text>
            <Text style={styles.nickname}>
              {profile?.nickname || user?.email?.split('@')[0] || (user ? '사용자' : '방문자')} 님
            </Text>
          </View>
          <View style={styles.headerRight}>
            {user && (
              <TouchableOpacity onPress={() => router.push('/missions' as any)} activeOpacity={0.8}>
                <GlassCard style={styles.missionBadge} intensity="low">
                  <Text style={styles.missionEmoji}>🎯</Text>
                  <Text style={styles.missionLabel}>미션</Text>
                </GlassCard>
              </TouchableOpacity>
            )}
            {user && (
              <GlassCard style={styles.pointBadge} intensity="low">
                <Text style={styles.pointText}>🪙 {profile?.points ?? 0}</Text>
              </GlassCard>
            )}
          </View>
        </View>

        {/* 배너 영역 */}
        {profile?.skin_type ? (
          <TouchableOpacity onPress={() => router.push('/search' as any)} activeOpacity={0.85}>
            <GlassCard style={styles.banner} intensity="low">
              <Text style={styles.bannerLabel}>내 피부 타입 · {profile.skin_type}</Text>
              <Text style={styles.bannerValue}>
                {profile.concerns?.length
                  ? `${profile.concerns.join(', ')} 맞춤 추천 →`
                  : '맞춤 시술·기기 보러가기 →'}
              </Text>
            </GlassCard>
          </TouchableOpacity>
        ) : user && !profile?.skin_type ? (
          <TouchableOpacity onPress={() => router.push('/profile-setup' as any)} activeOpacity={0.85}>
            <GlassCard style={styles.banner} intensity="low">
              <Text style={styles.bannerLabel}>✨ 피부 프로필 완성하기</Text>
              <Text style={styles.bannerValue}>맞춤 시술·기기 추천을 받아보세요 →</Text>
            </GlassCard>
          </TouchableOpacity>
        ) : !user ? (
          <TouchableOpacity onPress={() => router.push('/(auth)/signup' as any)} activeOpacity={0.85}>
            <GlassCard style={styles.banner} intensity="low">
              <Text style={styles.bannerLabel}>🌸 AI 맞춤 추천</Text>
              <Text style={styles.bannerValue}>무료 가입으로 내 피부 분석 받기 →</Text>
            </GlassCard>
          </TouchableOpacity>
        ) : null}
      </LinearGradient>

      {/* 시술 + 기기 묶음 추천 */}
      {pairs.length > 0 && (
        <Section title="시술 + 홈케어 기기 함께 추천" onMore={() => router.push('/search' as any)} hPad={hPad}>
          <FlatList
            horizontal data={pairs} keyExtractor={(i) => i.concern}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingLeft: hPad, paddingRight: hPad, gap: 12 }}
            renderItem={({ item }) => (
              <PairCard bundle={item} width={Math.min(cardWidth * 1.4, 260)} />
            )}
          />
        </Section>
      )}

      {/* 맞춤 추천 */}
      {recommended.length > 0 && profile?.concerns?.[0] && (
        <Section title={`${profile.concerns[0]} 맞춤 추천`} onMore={() => router.push('/search' as any)} hPad={hPad}>
          <FlatList
            horizontal data={recommended} keyExtractor={(i) => i.id}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingLeft: hPad, paddingRight: hPad, gap: 12 }}
            renderItem={({ item }) => (
              <TreatmentCard item={item} width={cardWidth} onPress={() => router.push(`/treatment/${item.id}` as any)} />
            )}
          />
        </Section>
      )}

      {/* 인기 시술 */}
      <Section title="인기 시술" onMore={() => router.push('/search' as any)} hPad={hPad}>
        {treatments.length > 0 ? (
          <FlatList
            horizontal data={treatments} keyExtractor={(i) => i.id}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingLeft: hPad, paddingRight: hPad, gap: 12 }}
            renderItem={({ item }) => (
              <TreatmentCard item={item} width={cardWidth} onPress={() => router.push(`/treatment/${item.id}` as any)} />
            )}
          />
        ) : <Text style={styles.emptySection}>데이터를 불러오는 중이에요</Text>}
      </Section>

      {/* 인기 기기 */}
      <Section title="인기 기기" onMore={() => router.push('/search' as any)} hPad={hPad}>
        {devices.length > 0 ? (
          <FlatList
            horizontal data={devices} keyExtractor={(i) => i.id}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingLeft: hPad, paddingRight: hPad, gap: 12 }}
            renderItem={({ item }) => (
              <DeviceCard item={item} width={cardWidth} onPress={() => router.push(`/device/${item.id}` as any)} />
            )}
          />
        ) : <Text style={styles.emptySection}>데이터를 불러오는 중이에요</Text>}
      </Section>

      <View style={{ height: 24 }} />
    </ScrollView>
  );
}

function Section({ title, onMore, children, hPad = 20 }: { title: string; onMore: () => void; children: React.ReactNode; hPad?: number }) {
  return (
    <View style={{ marginTop: 28 }}>
      <View style={[styles.sectionHeader, { paddingHorizontal: hPad }]}>
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
    <TouchableOpacity style={[styles.card, width ? { width } : {}]} onPress={onPress} activeOpacity={0.85}>
      <View style={styles.cardImage}>
        {item.image_url
          ? <Image source={{ uri: item.image_url }} style={StyleSheet.absoluteFill} resizeMode="cover" />
          : <Ionicons name={(TREATMENT_ICON[item.category] ?? 'medical-outline') as any} size={38} color={Colors.primary} />}
        {/* 카테고리 뱃지 */}
        <View style={styles.cardBadge}>
          <Text style={styles.cardBadgeText}>{item.category}</Text>
        </View>
      </View>
      <View style={styles.cardBody}>
        <Text style={styles.cardTitle} numberOfLines={1}>{item.name}</Text>
        <Text style={styles.cardPrice}>
          {(item.price_min ?? 0).toLocaleString()}~{(item.price_max ?? 0).toLocaleString()}원
        </Text>
        <Text style={styles.cardRating}>⭐ {(item.rating ?? 0).toFixed(1)} ({item.review_count ?? 0})</Text>
      </View>
    </TouchableOpacity>
  );
}

function PairCard({ bundle, width }: { bundle: PairBundle; width?: number }) {
  return (
    <View style={[styles.pairCard, width ? { width } : {}]}>
      <View style={[styles.pairHeader, { backgroundColor: bundle.color + '18' }]}>
        <Ionicons name={bundle.icon as any} size={18} color={bundle.color} />
        <Text style={[styles.pairConcern, { color: bundle.color }]}>{bundle.concern}</Text>
      </View>
      {bundle.treatment && (
        <TouchableOpacity
          style={styles.pairRow}
          onPress={() => router.push(`/treatment/${bundle.treatment!.id}` as any)}
          activeOpacity={0.8}
        >
          <View style={[styles.pairRowIcon, { backgroundColor: '#FFE8F0' }]}>
            <Ionicons name={(TREATMENT_ICON[bundle.treatment.category] ?? 'medical-outline') as any} size={18} color={Colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.pairRowLabel}>병원 시술</Text>
            <Text style={styles.pairRowName} numberOfLines={1}>{bundle.treatment.name}</Text>
            <Text style={styles.pairRowPrice}>{bundle.treatment.price_min.toLocaleString()}원~</Text>
          </View>
        </TouchableOpacity>
      )}
      {bundle.treatment && bundle.device && (
        <View style={styles.pairDivider}>
          <View style={styles.pairDividerLine} />
          <Text style={styles.pairDividerText}>또는 집에서</Text>
          <View style={styles.pairDividerLine} />
        </View>
      )}
      {bundle.device && (
        <TouchableOpacity
          style={styles.pairRow}
          onPress={() => router.push(`/device/${bundle.device!.id}` as any)}
          activeOpacity={0.8}
        >
          <View style={[styles.pairRowIcon, { backgroundColor: '#EEE8FF' }]}>
            <Ionicons name={(DEVICE_ICON[bundle.device.category] ?? 'hardware-chip-outline') as any} size={18} color="#9B6FE8" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.pairRowLabel}>홈케어 기기</Text>
            <Text style={styles.pairRowName} numberOfLines={1}>{bundle.device.name}</Text>
            <Text style={styles.pairRowPrice}>{bundle.device.price.toLocaleString()}원</Text>
          </View>
        </TouchableOpacity>
      )}
    </View>
  );
}

function DeviceCard({ item, width, onPress }: { item: Device; width?: number; onPress: () => void }) {
  return (
    <TouchableOpacity style={[styles.card, width ? { width } : {}]} onPress={onPress} activeOpacity={0.85}>
      <View style={[styles.cardImage, { backgroundColor: '#EEE8FF' }]}>
        {item.image_url
          ? <Image source={{ uri: item.image_url }} style={StyleSheet.absoluteFill} resizeMode="cover" />
          : <Ionicons name={(DEVICE_ICON[item.category] ?? 'hardware-chip-outline') as any} size={38} color="#9B6FE8" />}
        <View style={[styles.cardBadge, { backgroundColor: 'rgba(155,111,232,0.85)' }]}>
          <Text style={styles.cardBadgeText}>{item.brand}</Text>
        </View>
      </View>
      <View style={styles.cardBody}>
        <Text style={styles.cardTitle} numberOfLines={1}>{item.name}</Text>
        <Text style={styles.cardPrice}>{(item.price ?? 0).toLocaleString()}원</Text>
        <Text style={styles.cardRating}>⭐ {(item.rating ?? 0).toFixed(1)} ({item.review_count ?? 0})</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.bg },

  // 헤더 (그라데이션)
  header: {
    paddingTop: HEADER_TOP,
    paddingHorizontal: 20, paddingBottom: 24,
    overflow: 'hidden',
  },
  headerOrb1: {
    position: 'absolute', width: 200, height: 200, borderRadius: 100,
    backgroundColor: 'rgba(255,255,255,0.08)', top: -60, right: -40,
  },
  headerOrb2: {
    position: 'absolute', width: 130, height: 130, borderRadius: 65,
    backgroundColor: 'rgba(155,111,232,0.15)', bottom: -20, left: -20,
  },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  greeting: { fontSize: 13, color: 'rgba(255,255,255,0.75)', fontWeight: '500' },
  nickname: { fontSize: 22, fontWeight: '800', color: '#fff', marginTop: 2 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  missionBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 14 },
  missionEmoji: { fontSize: 16 },
  missionLabel: { fontSize: 12, fontWeight: '700', color: 'rgba(255,255,255,0.9)' },
  pointBadge: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 14 },
  pointText: { fontSize: 13, fontWeight: '700', color: 'rgba(255,255,255,0.9)' },

  // 배너 (글래스)
  banner: { padding: 16, gap: 6 },
  bannerLabel: { fontSize: 12, fontWeight: '600', color: 'rgba(255,255,255,0.75)' },
  bannerValue: { fontSize: 16, fontWeight: '700', color: '#fff' },

  // 섹션
  sectionHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, marginBottom: 14,
  },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: Colors.text },
  sectionMore: { fontSize: 13, color: Colors.primary, fontWeight: '700' },
  emptySection: { paddingHorizontal: 20, fontSize: 14, color: Colors.sub },

  // 카드
  card: {
    width: 160, backgroundColor: Colors.white, borderRadius: 18, overflow: 'hidden',
    shadowColor: Colors.cardShadow,
    shadowOffset: { width: 0, height: 6 }, shadowOpacity: 1, shadowRadius: 16, elevation: 4,
  },
  cardImage: { height: 120, backgroundColor: '#FFE8F0', alignItems: 'center', justifyContent: 'center' },
  cardEmoji: { fontSize: 38 },
  cardBadge: {
    position: 'absolute', bottom: 8, left: 8,
    backgroundColor: 'rgba(255,107,157,0.85)', borderRadius: 10,
    paddingVertical: 3, paddingHorizontal: 8,
  },
  cardBadgeText: { fontSize: 10, fontWeight: '700', color: '#fff' },
  cardBody: { padding: 12, gap: 3 },
  cardTitle: { fontSize: 14, fontWeight: '700', color: Colors.text },
  cardPrice: { fontSize: 12, color: Colors.primary, fontWeight: '600' },
  cardRating: { fontSize: 11, color: Colors.sub },

  // 묶음 카드
  pairCard: {
    width: 220, backgroundColor: Colors.white, borderRadius: 18, overflow: 'hidden',
    shadowColor: Colors.cardShadow,
    shadowOffset: { width: 0, height: 6 }, shadowOpacity: 1, shadowRadius: 16, elevation: 4,
  },
  pairHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 10,
  },
  pairConcern: { fontSize: 13, fontWeight: '800' },
  pairRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 14, paddingVertical: 10,
  },
  pairRowIcon: {
    width: 36, height: 36, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  pairRowLabel: { fontSize: 10, color: Colors.sub, fontWeight: '600' },
  pairRowName: { fontSize: 13, fontWeight: '700', color: Colors.text, marginTop: 1 },
  pairRowPrice: { fontSize: 11, color: Colors.primary, fontWeight: '600', marginTop: 1 },
  pairDivider: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 14, marginVertical: 2,
  },
  pairDividerLine: { flex: 1, height: 1, backgroundColor: Colors.border },
  pairDividerText: { fontSize: 10, color: Colors.sub, fontWeight: '600' },
});
