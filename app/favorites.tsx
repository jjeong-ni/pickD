import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Image, Platform,
} from 'react-native';
import { useEffect, useState } from 'react';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { Colors, HEADER_TOP } from '../constants/colors';
import { Treatment, Device } from '../types';

type FavoriteItem = {
  id: string;
  item_id: string;
  item_type: 'treatment' | 'device';
  item: Treatment | Device | null;
};

export default function FavoritesScreen() {
  const { user } = useAuth();
  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) fetchFavorites();
    else setLoading(false);
  }, [user]);

  const fetchFavorites = async () => {
    const { data: favs } = await supabase
      .from('favorites')
      .select('*')
      .eq('user_id', user!.id)
      .order('created_at', { ascending: false });

    if (!favs || favs.length === 0) {
      setFavorites([]);
      setLoading(false);
      return;
    }

    const treatmentIds = favs.filter((f) => f.item_type === 'treatment').map((f) => f.item_id);
    const deviceIds = favs.filter((f) => f.item_type === 'device').map((f) => f.item_id);

    const [treatRes, devRes] = await Promise.all([
      treatmentIds.length > 0
        ? supabase.from('treatments').select('*').in('id', treatmentIds)
        : { data: [] as Treatment[] },
      deviceIds.length > 0
        ? supabase.from('devices').select('*').in('id', deviceIds)
        : { data: [] as Device[] },
    ]);

    const treatMap = Object.fromEntries((treatRes.data ?? []).map((t: Treatment) => [t.id, t]));
    const devMap = Object.fromEntries((devRes.data ?? []).map((d: Device) => [d.id, d]));

    setFavorites(favs.map((f) => ({
      id: f.id,
      item_id: f.item_id,
      item_type: f.item_type,
      item: f.item_type === 'treatment' ? (treatMap[f.item_id] ?? null) : (devMap[f.item_id] ?? null),
    })));
    setLoading(false);
  };

  const handleRemove = async (favId: string) => {
    await supabase.from('favorites').delete().eq('id', favId);
    setFavorites((prev) => prev.filter((f) => f.id !== favId));
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
        <Text style={styles.title}>찜한 목록</Text>
        <View style={{ width: 32 }} />
      </LinearGradient>

      {loading ? (
        <View style={styles.center}><ActivityIndicator color={Colors.primary} /></View>
      ) : favorites.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="heart-outline" size={52} color={Colors.primary} />
          <Text style={styles.emptyTitle}>찜한 항목이 없어요</Text>
          <Text style={styles.emptyDesc}>마음에 드는 시술·기기를 찜해보세요</Text>
          <TouchableOpacity style={styles.goBtn} onPress={() => router.push('/(tabs)/search' as any)}>
            <Text style={styles.goBtnText}>검색하러 가기</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={favorites}
          keyExtractor={(i) => i.id}
          contentContainerStyle={{ padding: 16, gap: 10 }}
          renderItem={({ item }) => {
            const isTreatment = item.item_type === 'treatment';
            const name = item.item?.name ?? '(삭제된 항목)';
            return (
              <TouchableOpacity
                style={styles.card}
                activeOpacity={0.8}
                onPress={() => item.item && router.push(`/${isTreatment ? 'treatment' : 'device'}/${item.item_id}` as any)}
              >
                <View style={[styles.cardImg, !isTreatment && { backgroundColor: '#EEE8FF' }]}>
                  {(item.item as any)?.image_url
                    ? <Image source={{ uri: (item.item as any).image_url }} style={{ width: '100%', height: '100%', borderRadius: 10 }} resizeMode="cover" />
                    : <Ionicons name={isTreatment ? 'medical-outline' : 'hardware-chip-outline'} size={28} color={isTreatment ? Colors.primary : '#9B6FE8'} />}
                </View>
                <View style={{ flex: 1 }}>
                  <View style={styles.typeBadge}>
                    <Text style={styles.typeText}>{isTreatment ? '시술' : '기기'}</Text>
                  </View>
                  <Text style={styles.cardName} numberOfLines={2}>{name}</Text>
                  {item.item && (
                    <Text style={styles.cardPrice}>
                      {isTreatment
                        ? `${((item.item as Treatment).price_min ?? 0).toLocaleString()}~${((item.item as Treatment).price_max ?? 0).toLocaleString()}원`
                        : `${((item.item as Device).price ?? 0).toLocaleString()}원`}
                    </Text>
                  )}
                </View>
                <TouchableOpacity onPress={() => handleRemove(item.id)} style={styles.heartBtn}>
                  <Text style={styles.heartBtnText}>♥</Text>
                </TouchableOpacity>
              </TouchableOpacity>
            );
          }}
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
  emptyIcon: { marginBottom: 4 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: Colors.text },
  emptyDesc: { fontSize: 14, color: Colors.sub },
  goBtn: { marginTop: 8, backgroundColor: Colors.primary, paddingVertical: 12, paddingHorizontal: 28, borderRadius: 12 },
  goBtnText: { color: Colors.white, fontWeight: '700', fontSize: 15 },
  card: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: Colors.white, borderRadius: 14, padding: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  cardImg: {
    width: 60, height: 60, borderRadius: 10, backgroundColor: '#FFE8F0',
    alignItems: 'center', justifyContent: 'center',
  },
  typeBadge: {
    backgroundColor: Colors.primaryLight, paddingVertical: 2, paddingHorizontal: 8,
    borderRadius: 10, alignSelf: 'flex-start', marginBottom: 4,
  },
  typeText: { fontSize: 10, fontWeight: '700', color: Colors.primary },
  cardName: { fontSize: 14, fontWeight: '700', color: Colors.text, lineHeight: 20 },
  cardPrice: { fontSize: 12, color: Colors.primary, fontWeight: '600', marginTop: 2 },
  heartBtn: { padding: 8 },
  heartBtnText: { fontSize: 22, color: Colors.primary },
});
