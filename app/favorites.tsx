import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Image,
  Alert, Modal, TextInput, ScrollView,
} from 'react-native';
import { useEffect, useState } from 'react';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { Colors, HEADER_TOP } from '../constants/colors';
import { Treatment, Device } from '../types';

const DEFAULT_FOLDERS = ['기본', '비교 후보', '관심 시술', '홈케어 기기'];
const MAX_FOLDERS = 8;

type FavoriteItem = {
  id: string;
  item_id: string;
  item_type: 'treatment' | 'device';
  folder: string;
  item: Treatment | Device | null;
};

export default function FavoritesScreen() {
  const { user } = useAuth();
  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFolder, setActiveFolder] = useState('전체');
  const [folders, setFolders] = useState<string[]>(['전체', ...DEFAULT_FOLDERS]);

  // 폴더 이동 모달
  const [movingItem, setMovingItem] = useState<FavoriteItem | null>(null);
  // 새 폴더 생성 모달
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');

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

    const merged: FavoriteItem[] = favs.map((f) => ({
      id: f.id,
      item_id: f.item_id,
      item_type: f.item_type,
      folder: f.folder ?? '기본',
      item: f.item_type === 'treatment' ? (treatMap[f.item_id] ?? null) : (devMap[f.item_id] ?? null),
    }));

    setFavorites(merged);

    // 실제 사용 중인 폴더 목록 계산
    const usedFolders = [...new Set(merged.map((f) => f.folder))];
    const allFolders = ['전체', ...DEFAULT_FOLDERS, ...usedFolders.filter((f) => !DEFAULT_FOLDERS.includes(f))];
    setFolders(allFolders);
    setLoading(false);
  };

  const handleRemove = async (favId: string) => {
    Alert.alert('찜 해제', '이 항목을 찜 목록에서 제거할까요?', [
      { text: '취소', style: 'cancel' },
      {
        text: '제거', style: 'destructive',
        onPress: async () => {
          const prev = favorites;
          setFavorites((p) => p.filter((f) => f.id !== favId));
          const { error } = await supabase.from('favorites').delete().eq('id', favId);
          if (error) {
            setFavorites(prev);
            Alert.alert('오류', '찜 해제 중 문제가 발생했어요.');
          }
        },
      },
    ]);
  };

  const handleMoveFolder = async (item: FavoriteItem, targetFolder: string) => {
    setMovingItem(null);
    const prev = favorites;
    setFavorites((p) => p.map((f) => f.id === item.id ? { ...f, folder: targetFolder } : f));
    const { error } = await supabase.from('favorites').update({ folder: targetFolder }).eq('id', item.id);
    if (error) {
      setFavorites(prev);
      Alert.alert('오류', '폴더 이동 중 문제가 발생했어요.');
    }
  };

  const handleAddFolder = () => {
    const name = newFolderName.trim();
    if (!name) return;
    if (folders.includes(name)) {
      Alert.alert('중복', '이미 같은 이름의 폴더가 있어요.');
      return;
    }
    if (folders.length >= MAX_FOLDERS + 1) {
      Alert.alert('한도 초과', `폴더는 최대 ${MAX_FOLDERS}개까지 만들 수 있어요.`);
      return;
    }
    setFolders((prev) => [...prev, name]);
    setNewFolderName('');
    setShowNewFolder(false);
  };

  const visibleItems = activeFolder === '전체'
    ? favorites
    : favorites.filter((f) => f.folder === activeFolder);

  const folderCount = (folder: string) =>
    folder === '전체' ? favorites.length : favorites.filter((f) => f.folder === folder).length;

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
        <TouchableOpacity onPress={() => setShowNewFolder(true)} style={styles.addFolderBtn}>
          <Ionicons name="folder-open-outline" size={20} color="#fff" />
        </TouchableOpacity>
      </LinearGradient>

      {/* 폴더 탭 */}
      {!loading && favorites.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.folderTabsWrap}
        >
          {folders.map((folder) => {
            const count = folderCount(folder);
            if (folder !== '전체' && count === 0) return null;
            return (
              <TouchableOpacity
                key={folder}
                style={[styles.folderTab, activeFolder === folder && styles.folderTabActive]}
                onPress={() => setActiveFolder(folder)}
              >
                <Text style={[styles.folderTabText, activeFolder === folder && styles.folderTabTextActive]}>
                  {folder}
                </Text>
                <View style={[styles.folderTabBadge, activeFolder === folder && styles.folderTabBadgeActive]}>
                  <Text style={[styles.folderTabBadgeText, activeFolder === folder && styles.folderTabBadgeTextActive]}>
                    {count}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}

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
      ) : visibleItems.length === 0 ? (
        <View style={styles.center}>
          <Text style={{ fontSize: 36 }}>📂</Text>
          <Text style={styles.emptyTitle}>이 폴더가 비어있어요</Text>
          <Text style={styles.emptyDesc}>다른 폴더에서 항목을 이동해보세요</Text>
        </View>
      ) : (
        <FlatList
          data={visibleItems}
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
                  <TouchableOpacity
                    style={styles.folderChip}
                    onPress={() => setMovingItem(item)}
                  >
                    <Ionicons name="folder-outline" size={11} color={Colors.sub} />
                    <Text style={styles.folderChipText}>{item.folder}</Text>
                    <Ionicons name="chevron-down" size={10} color={Colors.sub} />
                  </TouchableOpacity>
                </View>
                <TouchableOpacity onPress={() => handleRemove(item.id)} style={styles.heartBtn}>
                  <Text style={styles.heartBtnText}>♥</Text>
                </TouchableOpacity>
              </TouchableOpacity>
            );
          }}
        />
      )}

      {/* 폴더 이동 모달 */}
      <Modal visible={!!movingItem} transparent animationType="slide" onRequestClose={() => setMovingItem(null)}>
        <TouchableOpacity style={styles.modalOverlay} onPress={() => setMovingItem(null)} activeOpacity={1}>
          <View style={styles.moveSheet}>
            <View style={styles.moveSheetHandle} />
            <Text style={styles.moveSheetTitle}>폴더 선택</Text>
            <Text style={styles.moveSheetSub}>{movingItem?.item?.name ?? ''}</Text>
            {folders.filter((f) => f !== '전체').map((folder) => (
              <TouchableOpacity
                key={folder}
                style={[styles.moveFolderRow, movingItem?.folder === folder && styles.moveFolderRowActive]}
                onPress={() => movingItem && handleMoveFolder(movingItem, folder)}
              >
                <Ionicons
                  name={movingItem?.folder === folder ? 'folder' : 'folder-outline'}
                  size={20}
                  color={movingItem?.folder === folder ? Colors.primary : Colors.sub}
                />
                <Text style={[styles.moveFolderName, movingItem?.folder === folder && { color: Colors.primary }]}>
                  {folder}
                </Text>
                {movingItem?.folder === folder && (
                  <Ionicons name="checkmark" size={16} color={Colors.primary} />
                )}
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={styles.addFolderRow} onPress={() => { setMovingItem(null); setShowNewFolder(true); }}>
              <Ionicons name="add-circle-outline" size={20} color={Colors.primary} />
              <Text style={styles.addFolderRowText}>새 폴더 만들기</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* 새 폴더 생성 모달 */}
      <Modal visible={showNewFolder} transparent animationType="fade" onRequestClose={() => setShowNewFolder(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.newFolderSheet}>
            <Text style={styles.moveSheetTitle}>새 폴더 이름</Text>
            <TextInput
              style={styles.newFolderInput}
              placeholder="예: 리프팅 관심 목록"
              placeholderTextColor={Colors.sub}
              value={newFolderName}
              onChangeText={setNewFolderName}
              maxLength={12}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={handleAddFolder}
            />
            <Text style={styles.newFolderCount}>{newFolderName.length}/12</Text>
            <View style={styles.newFolderBtns}>
              <TouchableOpacity style={styles.newFolderCancel} onPress={() => { setShowNewFolder(false); setNewFolderName(''); }}>
                <Text style={styles.newFolderCancelText}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.newFolderOk, !newFolderName.trim() && { opacity: 0.4 }]} onPress={handleAddFolder} disabled={!newFolderName.trim()}>
                <Text style={styles.newFolderOkText}>만들기</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  addFolderBtn: { width: 32, alignItems: 'flex-end' },

  /* 폴더 탭 */
  folderTabsWrap: {
    flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 12,
    gap: 8, backgroundColor: Colors.white, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  folderTab: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingVertical: 7, paddingHorizontal: 14, borderRadius: 20,
    borderWidth: 1.5, borderColor: Colors.border, backgroundColor: Colors.bg,
  },
  folderTabActive: { borderColor: Colors.primary, backgroundColor: Colors.primaryLight },
  folderTabText: { fontSize: 13, fontWeight: '600', color: Colors.sub },
  folderTabTextActive: { color: Colors.primary },
  folderTabBadge: {
    backgroundColor: Colors.border, borderRadius: 10,
    paddingHorizontal: 6, paddingVertical: 1,
  },
  folderTabBadgeActive: { backgroundColor: Colors.primary },
  folderTabBadgeText: { fontSize: 10, fontWeight: '700', color: Colors.sub },
  folderTabBadgeTextActive: { color: '#fff' },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
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
  folderChip: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    marginTop: 5, alignSelf: 'flex-start',
    paddingVertical: 3, paddingHorizontal: 8, borderRadius: 10,
    backgroundColor: Colors.bg, borderWidth: 1, borderColor: Colors.border,
  },
  folderChipText: { fontSize: 11, color: Colors.sub, fontWeight: '600' },
  heartBtn: { padding: 8 },
  heartBtnText: { fontSize: 22, color: Colors.primary },

  /* 이동 모달 */
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  moveSheet: {
    backgroundColor: Colors.white, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 20, paddingBottom: 48, gap: 4,
  },
  moveSheetHandle: {
    width: 36, height: 4, borderRadius: 2, backgroundColor: Colors.border,
    alignSelf: 'center', marginBottom: 12,
  },
  moveSheetTitle: { fontSize: 17, fontWeight: '800', color: Colors.text, marginBottom: 2 },
  moveSheetSub: { fontSize: 13, color: Colors.sub, marginBottom: 12 },
  moveFolderRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 13, paddingHorizontal: 12, borderRadius: 12,
  },
  moveFolderRowActive: { backgroundColor: Colors.primaryLight },
  moveFolderName: { flex: 1, fontSize: 15, fontWeight: '600', color: Colors.text },
  addFolderRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 13, paddingHorizontal: 12, marginTop: 4,
    borderTopWidth: 1, borderTopColor: Colors.border,
  },
  addFolderRowText: { fontSize: 15, fontWeight: '600', color: Colors.primary },

  /* 새 폴더 모달 */
  newFolderSheet: {
    backgroundColor: Colors.white, borderRadius: 20, margin: 24,
    padding: 24, gap: 12,
  },
  newFolderInput: {
    borderWidth: 1.5, borderColor: Colors.border, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: Colors.text,
  },
  newFolderCount: { fontSize: 11, color: Colors.sub, textAlign: 'right', marginTop: -8 },
  newFolderBtns: { flexDirection: 'row', gap: 10, marginTop: 4 },
  newFolderCancel: {
    flex: 1, paddingVertical: 13, borderRadius: 12,
    borderWidth: 1.5, borderColor: Colors.border, alignItems: 'center',
  },
  newFolderCancelText: { fontSize: 15, fontWeight: '600', color: Colors.sub },
  newFolderOk: {
    flex: 1, paddingVertical: 13, borderRadius: 12,
    backgroundColor: Colors.primary, alignItems: 'center',
  },
  newFolderOkText: { fontSize: 15, fontWeight: '700', color: '#fff' },
});
