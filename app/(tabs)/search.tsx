import {
  View, Text, TextInput, FlatList, StyleSheet,
  TouchableOpacity, ActivityIndicator, Image, Platform,
} from 'react-native';
import { useState, useEffect, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { Colors, HEADER_TOP } from '../../constants/colors';
import { useAuth } from '../../hooks/useAuth';
import { useCompare } from '../../hooks/useCompare';
import { useResponsive } from '../../hooks/useResponsive';
import { Treatment, Device } from '../../types';

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

type Tab = 'treatment' | 'device';
type CategoryOption = { label: string; value: string };
const CATEGORY_OPTIONS: Record<Tab, CategoryOption[]> = {
  treatment: [
    { label: '전체', value: '전체' },
    { label: '✨ 리프팅', value: '리프팅' },
    { label: '💉 보톡스', value: '보톡스' },
    { label: '💫 필러', value: '필러' },
    { label: '⚡ 레이저', value: '레이저' },
    { label: '🌿 스킨케어', value: '스킨케어' },
  ],
  device: [
    { label: '전체', value: '전체' },
    { label: '✨ 리프팅·탄력', value: '리프팅' },
    { label: '💪 모공·피지', value: 'RF' },
    { label: '🌟 미백·잡티', value: 'LED' },
    { label: '💧 수분·보습', value: '초음파' },
    { label: '🪄 제모', value: '제모' },
  ],
};

const RECENT_KEY = 'pickdi_recent';

export default function SearchScreen() {
  const { user } = useAuth();
  const { items: compareItems, add } = useCompare();
  const { hPad } = useResponsive();
  const [tab, setTab] = useState<Tab>('treatment');
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('전체');
  const [results, setResults] = useState<(Treatment | Device)[]>([]);
  const [loading, setLoading] = useState(false);
  const [inputFocused, setInputFocused] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const blurTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(RECENT_KEY).then((raw) => {
      if (raw) setRecentSearches(JSON.parse(raw));
    });
  }, []);

  // 검색어·탭·카테고리 변경 시 자동 검색 (검색어는 300ms 디바운스)
  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      setLoading(true);
      try {
        const table = tab === 'treatment' ? 'treatments' : 'devices';
        let req = supabase.from(table).select('*');
        if (query.trim()) {
          if (tab === 'device') {
            req = (req as any).or(`name.ilike.%${query.trim()}%,brand.ilike.%${query.trim()}%`);
          } else {
            req = req.ilike('name', `%${query.trim()}%`);
          }
        }
        if (category !== '전체') req = (req as any).eq('category', category);
        const { data } = await req.order('rating', { ascending: false }).limit(20);
        if (!cancelled) setResults(data ?? []);
      } catch {
        if (!cancelled) setResults([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    const delay = query.trim() ? 300 : 0;
    const timer = setTimeout(run, delay);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [query, tab, category]);

  const switchTab = (t: Tab) => {
    setTab(t);
    setCategory('전체');
    setQuery('');
  };

  const handleAddCompare = async (item: Treatment | Device) => {
    if (!user) {
      router.push('/(auth)/login');
      return;
    }
    if (compareItems.length >= 3 || compareItems.some((ci) => ci.item_id === item.id)) return;
    await add(user.id, item.id, tab === 'treatment' ? 'treatment' : 'device');
  };

  const saveSearch = async (q: string) => {
    if (!q.trim()) return;
    const updated = [q.trim(), ...recentSearches.filter((s) => s !== q.trim())].slice(0, 10);
    setRecentSearches(updated);
    await AsyncStorage.setItem(RECENT_KEY, JSON.stringify(updated));
  };

  const deleteRecent = async (term: string) => {
    const updated = recentSearches.filter((s) => s !== term);
    setRecentSearches(updated);
    await AsyncStorage.setItem(RECENT_KEY, JSON.stringify(updated));
  };

  const clearAllRecent = async () => {
    setRecentSearches([]);
    await AsyncStorage.removeItem(RECENT_KEY);
  };

  const handleFocus = () => {
    if (blurTimer.current) clearTimeout(blurTimer.current);
    setInputFocused(true);
  };

  const handleBlur = () => {
    blurTimer.current = setTimeout(() => setInputFocused(false), 150);
  };

  const showRecent = inputFocused && !query.trim() && recentSearches.length > 0;

  return (
    <View style={styles.container}>
      {/* 검색바 */}
      <View style={styles.searchWrap}>
        <View style={styles.searchBar}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder={tab === 'treatment' ? '피부 고민을 검색하세요 (예: 모공, 주름)' : '기기명 또는 브랜드를 검색하세요'}
            placeholderTextColor={Colors.sub}
            value={query}
            onChangeText={setQuery}
            onFocus={handleFocus}
            onBlur={handleBlur}
            onSubmitEditing={() => { if (query.trim()) saveSearch(query); }}
            returnKeyType="search"
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery('')}>
              <Text style={{ color: Colors.sub, fontSize: 16 }}>✕</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* 최근 검색어 드롭다운 */}
        {showRecent && (
          <View style={styles.recentWrap}>
            <View style={styles.recentHeader}>
              <Text style={styles.recentTitle}>최근 검색어</Text>
              <TouchableOpacity onPress={clearAllRecent}>
                <Text style={styles.clearAll}>전체 삭제</Text>
              </TouchableOpacity>
            </View>
            {recentSearches.map((term) => (
              <View key={term} style={styles.recentRow}>
                <TouchableOpacity
                  style={{ flex: 1 }}
                  onPress={() => {
                    if (blurTimer.current) clearTimeout(blurTimer.current);
                    setQuery(term);
                    setInputFocused(false);
                  }}
                >
                  <Text style={styles.recentTerm}>🕐  {term}</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => deleteRecent(term)} style={{ padding: 4 }}>
                  <Text style={styles.recentDelete}>✕</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* 탭 */}
      <View style={styles.tabs}>
        {(['treatment', 'device'] as Tab[]).map((t) => (
          <TouchableOpacity
            key={t}
            style={[styles.tab, tab === t && styles.tabActive]}
            onPress={() => switchTab(t)}
          >
            <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
              {t === 'treatment' ? '시술' : '기기'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* 카테고리 필터 + 지도 버튼 */}
      <View style={styles.filtersRow}>
        <View style={styles.filtersWrap}>
          <FlatList
            horizontal
            data={CATEGORY_OPTIONS[tab]}
            keyExtractor={(i) => i.value}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filtersContent}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[styles.filter, item.value === category && styles.filterActive]}
                onPress={() => setCategory(item.value)}
              >
                <Text style={[styles.filterText, item.value === category && styles.filterTextActive]}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            )}
          />
        </View>
        {tab === 'treatment' && (
          <TouchableOpacity
            style={styles.mapBtn}
            onPress={() => router.push({
              pathname: '/clinic-map',
              params: { treatmentName: category !== '전체' ? category : query.trim() || undefined },
            } as any)}
          >
            <Text style={styles.mapBtnText}>📍</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* 결과 */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={Colors.primary} />
        </View>
      ) : results.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyIcon}>😢</Text>
          <Text style={styles.emptyText}>검색 결과가 없어요</Text>
        </View>
      ) : (
        <FlatList
          data={results}
          keyExtractor={(i) => i.id}
          contentContainerStyle={{ paddingHorizontal: hPad, paddingVertical: 16, gap: 10 }}
          renderItem={({ item }) => (
            <ResultRow
              item={item}
              type={tab}
              inCompare={compareItems.some((ci) => ci.item_id === item.id)}
              onPress={() => router.push(`/${tab === 'treatment' ? 'treatment' : 'device'}/${item.id}`)}
              onAddCompare={() => handleAddCompare(item)}
            />
          )}
        />
      )}
    </View>
  );
}

function ResultRow({
  item, type, inCompare, onPress, onAddCompare,
}: {
  item: Treatment | Device;
  type: Tab;
  inCompare: boolean;
  onPress: () => void;
  onAddCompare: () => void;
}) {
  const treatment = item as Treatment;
  const device = item as Device;
  return (
    <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.8}>
      <View style={[styles.rowImage, type === 'device' && { backgroundColor: '#EEE8FF' }]}>
        {(item as any).image_url
          ? <Image source={{ uri: (item as any).image_url }} style={{ width: '100%', height: '100%', borderRadius: 12 }} resizeMode="cover" />
          : <Ionicons
              name={(type === 'treatment'
                ? (TREATMENT_ICON[(item as any).category] ?? 'medical-outline')
                : (DEVICE_ICON[(item as any).category] ?? 'hardware-chip-outline')) as any}
              size={28}
              color={type === 'treatment' ? Colors.primary : '#9B6FE8'}
            />}
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.rowTitle}>{item.name}</Text>
        <Text style={styles.rowSub}>
          {type === 'treatment'
            ? `${(treatment.price_min ?? 0).toLocaleString()}~${(treatment.price_max ?? 0).toLocaleString()}원`
            : `${(device.price ?? 0).toLocaleString()}원`}
        </Text>
        <Text style={styles.rowRating}>⭐ {(item.rating ?? 0).toFixed(1)} ({item.review_count ?? 0})</Text>
      </View>
      <TouchableOpacity
        style={[styles.compareBtn, inCompare && styles.compareBtnActive]}
        onPress={(e) => { e.stopPropagation?.(); onAddCompare(); }}
        disabled={inCompare}
      >
        <Text style={[styles.compareBtnText, inCompare && styles.compareBtnTextActive]}>
          {inCompare ? '✓' : '+비교'}
        </Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  searchWrap: { backgroundColor: Colors.white, padding: 16, paddingTop: HEADER_TOP },
  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#F2F2F7', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12,
  },
  searchIcon: { fontSize: 16 },
  searchInput: { flex: 1, fontSize: 15, color: Colors.text },
  recentWrap: {
    marginTop: 8, borderRadius: 12, overflow: 'hidden',
    borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.white,
  },
  recentHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  recentTitle: { fontSize: 12, fontWeight: '700', color: Colors.sub },
  clearAll: { fontSize: 12, color: Colors.sub },
  recentRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 11,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  recentTerm: { fontSize: 14, color: Colors.text },
  recentDelete: { fontSize: 13, color: Colors.sub },
  tabs: {
    flexDirection: 'row', backgroundColor: Colors.white,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  tab: {
    flex: 1, paddingVertical: 12, alignItems: 'center',
    borderBottomWidth: 2, borderBottomColor: 'transparent',
  },
  tabActive: { borderBottomColor: Colors.primary },
  tabText: { fontSize: 14, fontWeight: '600', color: Colors.sub },
  tabTextActive: { color: Colors.primary },
  filtersRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.white },
  filtersWrap: { flex: 1, height: 52, backgroundColor: Colors.white },
  filtersContent: { paddingHorizontal: 16, paddingVertical: 10, gap: 8, alignItems: 'center' },
  mapBtn: {
    paddingHorizontal: 14, paddingVertical: 10,
    borderLeftWidth: 1, borderLeftColor: Colors.border,
    height: 52, justifyContent: 'center', alignItems: 'center',
  },
  mapBtnText: { fontSize: 20 },
  filter: {
    paddingVertical: 6, paddingHorizontal: 16, borderRadius: 20,
    borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.white,
  },
  filterActive: { borderColor: Colors.primary, backgroundColor: 'rgba(255,107,157,0.08)' },
  filterText: { fontSize: 13, color: Colors.sub },
  filterTextActive: { color: Colors.primary, fontWeight: '600' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  emptyIcon: { fontSize: 48 },
  emptyText: { fontSize: 15, color: Colors.sub, textAlign: 'center', lineHeight: 22 },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: Colors.white, borderRadius: 12, padding: 14,
  },
  rowImage: {
    width: 52, height: 52, borderRadius: 12, backgroundColor: '#FFE8F0',
    alignItems: 'center', justifyContent: 'center',
  },
  rowTitle: { fontSize: 15, fontWeight: '700', color: Colors.text },
  rowSub: { fontSize: 13, color: Colors.primary, fontWeight: '600', marginTop: 2 },
  rowRating: { fontSize: 11, color: Colors.sub, marginTop: 2 },
  compareBtn: {
    paddingVertical: 6, paddingHorizontal: 12, borderRadius: 16,
    borderWidth: 1.5, borderColor: Colors.primary,
  },
  compareBtnActive: { borderColor: Colors.border, backgroundColor: Colors.bg },
  compareBtnText: { fontSize: 12, fontWeight: '700', color: Colors.primary },
  compareBtnTextActive: { color: Colors.sub },
});
