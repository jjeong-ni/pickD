import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  ActivityIndicator, Image, FlatList, Linking, Alert, Platform,
} from 'react-native';
import { useEffect, useState } from 'react';
import { useLocalSearchParams, router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '../../lib/supabase';
import { Colors } from '../../constants/colors';
import { APP_URL } from '../../constants/app';
import { useAuth } from '../../hooks/useAuth';
import { useCompare } from '../../hooks/useCompare';
import { Device, Treatment } from '../../types';
import MediaGallery from '../../components/MediaGallery';
import CompatibilityCard from '../../components/CompatibilityCard';

export default function DeviceDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user, profile } = useAuth();
  const { items, add } = useCompare();
  const [device, setDevice] = useState<Device | null>(null);
  const [relatedTreatments, setRelatedTreatments] = useState<Treatment[]>([]);
  const [loading, setLoading] = useState(true);
  const [networkError, setNetworkError] = useState(false);
  const [favoriteId, setFavoriteId] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, [id]);

  useEffect(() => {
    if (user && id) {
      supabase
        .from('favorites')
        .select('id')
        .eq('user_id', user.id)
        .eq('item_id', id)
        .eq('item_type', 'device')
        .maybeSingle()
        .then(({ data }) => setFavoriteId(data?.id ?? null));
    } else {
      setFavoriteId(null);
    }
  }, [user?.id, id]);

  const fetchData = async () => {
    try {
      const { data: d } = await supabase.from('devices').select('*').eq('id', id).maybeSingle();
      setDevice(d);
      if (d) {
        const { data: treats } = await supabase
          .from('treatments')
          .select('*')
          .eq('category', d.category)
          .limit(4);
        setRelatedTreatments(treats ?? []);
      }
    } catch (e) {
      console.error('fetchData network error:', e);
      setNetworkError(true);
    } finally {
      setLoading(false);
    }
  };

  const handleAddCompare = async () => {
    if (!user) { router.push('/(auth)/login' as any); return; }
    if (!device) return;
    if (items.length >= 3) {
      Alert.alert(
        '비교함이 가득 찼어요 😅',
        '비교 항목은 최대 3개까지 담을 수 있어요.\n기존 항목을 제거한 뒤 다시 시도해주세요.',
        [{ text: '확인', style: 'default' }],
      );
      return;
    }
    await add(user.id, device.id, 'device');
  };

  const handleShare = async () => {
    const url = `${APP_URL}/device/${device?.id}`;
    const msg = `${device?.name} | 픽디에서 확인해보세요 🌸\n${url}`;
    try {
      if (Platform.OS === 'web') {
        if (typeof navigator !== 'undefined' && navigator.clipboard) {
          await navigator.clipboard.writeText(url);
        } else {
          const el = (document as any).createElement('textarea');
          el.value = url;
          (document as any).body.appendChild(el);
          el.select();
          (document as any).execCommand('copy');
          (document as any).body.removeChild(el);
        }
        Alert.alert('🔗 링크 복사 완료!', '클립보드에 복사됐어요.');
      } else {
        const { Share } = require('react-native');
        await Share.share({ message: msg });
      }
    } catch {
      Alert.alert('링크', url);
    }
  };

  const handleToggleFavorite = async () => {
    if (!user) { router.push('/(auth)/login'); return; }
    if (!device) return;
    if (favoriteId) {
      await supabase.from('favorites').delete().eq('id', favoriteId);
      setFavoriteId(null);
    } else {
      const { data } = await supabase
        .from('favorites')
        .insert({ user_id: user.id, item_id: device.id, item_type: 'device' })
        .select('id')
        .maybeSingle();
      setFavoriteId(data?.id ?? null);
    }
  };

  if (loading) return <View style={styles.center}><ActivityIndicator color={Colors.primary} size="large" /></View>;
  if (networkError) return (
    <View style={styles.center}>
      <Text style={{ fontSize: 48 }}>📡</Text>
      <Text style={{ fontSize: 16, color: Colors.sub, marginTop: 12, textAlign: 'center' }}>네트워크 오류가 발생했어요{'\n'}연결 상태를 확인해주세요</Text>
      <TouchableOpacity onPress={() => { setNetworkError(false); setLoading(true); fetchData(); }} style={{ marginTop: 20, paddingVertical: 12, paddingHorizontal: 24, backgroundColor: Colors.primary, borderRadius: 12 }}>
        <Text style={{ color: '#fff', fontWeight: '700' }}>다시 시도</Text>
      </TouchableOpacity>
    </View>
  );
  if (!device) return (
    <View style={styles.center}>
      <Text style={{ fontSize: 48 }}>😢</Text>
      <Text style={{ fontSize: 16, color: Colors.sub, marginTop: 12 }}>기기를 찾을 수 없어요</Text>
      <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 20, paddingVertical: 12, paddingHorizontal: 24, backgroundColor: Colors.primary, borderRadius: 12 }}>
        <Text style={{ color: '#fff', fontWeight: '700' }}>돌아가기</Text>
      </TouchableOpacity>
    </View>
  );

  const inCompare = items.some((i) => i.item_id === device.id);

  return (
    <View style={{ flex: 1, backgroundColor: Colors.bg }}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* 미디어 갤러리 */}
        <View style={{ position: 'relative' }}>
          <MediaGallery
            imageUrl={device.image_url}
            images={device.images ?? []}
            videoUrl={device.video_url}
            fallbackEmoji="⚡"
          />
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Text style={styles.backBtnText}>←</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.shareBtn} onPress={handleShare}>
            <Text style={styles.shareBtnText}>📤</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.heartBtn} onPress={handleToggleFavorite}>
            <Text style={styles.heartBtnText}>{favoriteId ? '🩷' : '🤍'}</Text>
          </TouchableOpacity>
        </View>

        {/* 기본 정보 */}
        <View style={styles.infoCard}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <Text style={[styles.brand, { flex: 1, marginRight: 8 }]}>{device.brand}</Text>
            <CompatibilityCard
              profile={profile}
              user={user}
              category={device.category}
              itemName={device.name}
              coupangUrl={device.coupang_url}
              itemType="device"
            />
          </View>
          <Text style={styles.name}>{device.name}</Text>
          <TouchableOpacity
            style={styles.ratingRow}
            onPress={() => router.push({
              pathname: '/reviews',
              params: { itemId: id, itemType: 'device', itemName: device.name }
            } as any)}
            activeOpacity={0.7}
          >
            <Text style={styles.rating}>⭐ {(device.rating ?? 0).toFixed(1)}</Text>
            <Text style={styles.reviewCount}>리뷰 {device.review_count ?? 0}개 ›</Text>
          </TouchableOpacity>

          <View style={styles.priceRow}>
            <View>
              <Text style={styles.priceLabel}>가격 <Text style={styles.priceLabelNote}>*판매처별 상이</Text></Text>
              <Text style={styles.price}>{(device.price ?? 0).toLocaleString()}원</Text>
            </View>
            <View>
              <Text style={styles.priceLabel}>카테고리</Text>
              <Text style={styles.price}>{device.category}</Text>
            </View>
          </View>

          <View style={styles.tags}>
            {(device.tags ?? []).map((tag) => (
              <View key={tag} style={styles.tag}>
                <Text style={styles.tagText}># {tag}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* 설명 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>기기 설명</Text>
          <Text style={styles.description}>{device.description}</Text>
        </View>

        {/* 기기 상세 정보 */}
        {(device.usage_frequency || device.results_timeline || device.side_effects) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>사용 상세 정보</Text>
            <View style={styles.detailGrid}>
              {device.usage_frequency && (
                <View style={styles.detailCell}>
                  <Text style={styles.detailIcon}>📅</Text>
                  <Text style={styles.detailLabel}>사용 빈도</Text>
                  <Text style={styles.detailValue}>{device.usage_frequency}</Text>
                </View>
              )}
              {device.results_timeline && (
                <View style={styles.detailCell}>
                  <Text style={styles.detailIcon}>✨</Text>
                  <Text style={styles.detailLabel}>효과 기간</Text>
                  <Text style={styles.detailValue}>{device.results_timeline}</Text>
                </View>
              )}
            </View>
            {device.side_effects && (
              <View style={styles.sideEffectBox}>
                <Text style={styles.sideEffectTitle}>⚠️ 주의사항</Text>
                <Text style={styles.sideEffectText}>{device.side_effects}</Text>
              </View>
            )}
          </View>
        )}

        {/* 쿠팡 파트너스 구매 섹션 */}
        <View style={styles.coupangSection}>
          <View style={styles.coupangHeader}>
            <Text style={styles.coupangSectionTitle}>🛒 구매하기</Text>
            <Text style={styles.coupangAffiliateNote}>* 이 링크는 쿠팡파트너스 제휴 링크로, 구매 시 일정 수수료가 픽디에 지급됩니다.</Text>
          </View>
          <TouchableOpacity
            style={styles.coupangLargeBtn}
            onPress={() => {
              const url = device.coupang_url
                ? device.coupang_url
                : `https://www.coupang.com/np/search?q=${encodeURIComponent(device.name)}`;
              Linking.openURL(url);
            }}
          >
            <Text style={styles.coupangLargeBtnText}>🛒 쿠팡에서 최저가 확인하기</Text>
          </TouchableOpacity>
        </View>

        {/* 리뷰 — 별도 페이지로 분리 */}
        <TouchableOpacity
          style={styles.reviewLinkRow}
          onPress={() => router.push({ pathname: '/reviews', params: { itemId: id, itemType: 'device', itemName: device.name } } as any)}
          activeOpacity={0.8}
        >
          <View style={styles.reviewLinkLeft}>
            <Text style={styles.reviewLinkTitle}>리뷰</Text>
            <Text style={styles.reviewLinkCount}>총 {device.review_count ?? 0}개</Text>
          </View>
          <Text style={styles.reviewLinkArrow}>›</Text>
        </TouchableOpacity>

        {/* 관련 시술 */}
        {relatedTreatments.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>💉 클리닉 시술로 더 강력하게</Text>
            <Text style={styles.sectionSubtitle}>같은 카테고리의 전문 시술이에요</Text>
            <FlatList
              horizontal
              data={relatedTreatments}
              keyExtractor={(i) => i.id}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 10, paddingTop: 12 }}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.relatedCard}
                  onPress={() => router.push(`/treatment/${item.id}` as any)}
                >
                  <View style={styles.relatedCardImg}>
                    {item.image_url
                      ? <Image source={{ uri: item.image_url }} style={{ width: '100%', height: '100%', borderRadius: 10 }} resizeMode="cover" />
                      : <Text style={{ fontSize: 28 }}>💆</Text>}
                  </View>
                  <Text style={styles.relatedCardCategory} numberOfLines={1}>{item.category}</Text>
                  <Text style={styles.relatedCardName} numberOfLines={2}>{item.name}</Text>
                  <Text style={styles.relatedCardPrice}>{item.price_min.toLocaleString()}원~</Text>
                  <Text style={styles.relatedCardRating}>⭐ {item.rating.toFixed(1)}</Text>
                </TouchableOpacity>
              )}
            />
          </View>
        )}

        {/* 근처 피부과 찾기 배너 */}
        <TouchableOpacity
          style={styles.clinicMapBanner}
          onPress={() => router.push({
            pathname: '/clinic-map',
            params: {
              treatmentName: ({
                // 에너지 리프팅 계열 (RF 고주파·EMS·미세전류)
                '리프팅':     '리프팅',
                'RF':         '고주파 리프팅',
                'RF·EMS':     '리프팅',
                'EMS':        '리프팅',
                '미세전류':    '리프팅',
                // 광 치료 계열 (LED·IPL)
                'LED':        'LED 피부관리',
                'LED·RF':     'LED 피부관리',
                'IPL':        'IPL 제모',
                // 초음파·수분·이온 계열
                '초음파':     '초음파 피부관리',
                '이온도입':   '수분 관리',
                '스팀':       '수분 관리',
                // 모공·클렌징·필링 계열
                '진공흡입':   '모공 관리',
                '진동클렌저': '모공 클렌징',
                '필링':       '필링',
                // 제모
                '제모':       '제모',
                // 마사지·순환 계열
                '진동마사지': '마사지',
                '롤링':       '마사지',
              } as Record<string, string>)[device.category] ?? device.category,
            },
          } as any)}
          activeOpacity={0.85}
        >
          <View style={styles.clinicMapBannerLeft}>
            <Text style={styles.clinicMapBannerIcon}>📍</Text>
            <View>
              <Text style={styles.clinicMapBannerTitle}>전문가 시술 받으러 가기</Text>
              <Text style={styles.clinicMapBannerDesc}>근처 피부과 클리닉 탐색</Text>
            </View>
          </View>
          <Text style={styles.clinicMapBannerArrow}>›</Text>
        </TouchableOpacity>

        {/* 사용 주의사항 */}
        <View style={styles.disclaimer}>
          <Text style={styles.disclaimerTitle}>⚕️ 사용 전 확인하세요</Text>
          <Text style={styles.disclaimerText}>
            • 제공 정보는 일반적인 참고용이며 전문 의료 상담을 대체하지 않습니다{'\n'}
            • 임산부·수유부, 피부질환자, 금속 임플란트·심박조율기 사용자는 반드시 전문의 상담 후 사용하세요{'\n'}
            • 효과 및 민감도 반응은 개인 피부 상태에 따라 다를 수 있습니다{'\n'}
            • 가격은 판매처에 따라 실제와 다를 수 있습니다
          </Text>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* 하단 버튼 */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={[styles.compareBtn, inCompare && styles.compareBtnActive]}
          onPress={handleAddCompare}
          disabled={inCompare}
        >
          <Text style={styles.compareBtnText}>{inCompare ? '비교함에 있음' : '비교함 추가'}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.coupangBtnWrap}
          onPress={() => {
            const url = device.coupang_url
              ? device.coupang_url
              : `https://www.coupang.com/np/search?q=${encodeURIComponent(device.name)}`;
            Linking.openURL(url);
          }}
          activeOpacity={0.85}
        >
          <LinearGradient
            colors={['#FF6000', '#FF9500']}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            style={styles.coupangBtn}
          >
            <Text style={styles.coupangBtnText}>🛒 쿠팡 구매</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>

    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  backBtn: {
    position: 'absolute', top: 52, left: 16, zIndex: 10,
    width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.9)',
    alignItems: 'center', justifyContent: 'center',
  },
  backBtnText: { fontSize: 18 },
  shareBtn: {
    position: 'absolute', top: 52, right: 60, zIndex: 10,
    width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.9)',
    alignItems: 'center', justifyContent: 'center',
  },
  shareBtnText: { fontSize: 16, color: Colors.text, fontWeight: '700' },
  heartBtn: {
    position: 'absolute', top: 52, right: 16, zIndex: 10,
    width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.9)',
    alignItems: 'center', justifyContent: 'center',
  },
  heartBtnText: { fontSize: 18, color: Colors.primary },
  // 상세 정보 그리드
  detailGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 12 },
  detailCell: {
    flex: 1, minWidth: 120, backgroundColor: Colors.bg,
    borderRadius: 12, padding: 12, alignItems: 'center', gap: 4,
  },
  detailIcon: { fontSize: 22 },
  detailLabel: { fontSize: 11, color: Colors.sub, fontWeight: '600' },
  detailValue: { fontSize: 13, fontWeight: '700', color: Colors.text, textAlign: 'center' },
  sideEffectBox: {
    backgroundColor: '#FFF8E7', borderRadius: 10, padding: 12,
    borderLeftWidth: 3, borderLeftColor: '#FFC107',
  },
  sideEffectTitle: { fontSize: 12, fontWeight: '700', color: '#E65100', marginBottom: 4 },
  sideEffectText: { fontSize: 12, color: '#E65100', lineHeight: 18 },
  // 쿠팡 파트너스 섹션
  coupangSection: {
    backgroundColor: Colors.white, margin: 8, marginTop: 0, borderRadius: 14, padding: 16, gap: 10,
  },
  coupangHeader: { gap: 4 },
  coupangSectionTitle: { fontSize: 15, fontWeight: '700', color: Colors.text },
  coupangAffiliateNote: { fontSize: 10, color: Colors.sub, lineHeight: 15 },
  coupangLargeBtn: {
    backgroundColor: '#FF6000', borderRadius: 12,
    paddingVertical: 14, alignItems: 'center',
  },
  coupangLargeBtnText: { fontSize: 15, fontWeight: '700', color: Colors.white },
  infoCard: { backgroundColor: Colors.white, padding: 20 },
  brand: { fontSize: 12, fontWeight: '700', color: Colors.primary },
  name: { fontSize: 24, fontWeight: '800', color: Colors.text, marginTop: 4 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  rating: { fontSize: 15, fontWeight: '700', color: Colors.text },
  reviewCount: { fontSize: 13, color: Colors.sub },
  priceRow: { flexDirection: 'row', gap: 32, marginTop: 16 },
  priceLabel: { fontSize: 12, color: Colors.sub },
  price: { fontSize: 16, fontWeight: '700', color: Colors.text, marginTop: 4 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 16 },
  tag: { paddingVertical: 4, paddingHorizontal: 10, backgroundColor: Colors.bg, borderRadius: 8 },
  tagText: { fontSize: 12, color: Colors.sub },
  section: { backgroundColor: Colors.white, padding: 20, marginTop: 8 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: Colors.text, marginBottom: 12 },
  description: { fontSize: 14, color: Colors.sub, lineHeight: 22 },
  reviewLinkRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: Colors.white, paddingHorizontal: 20, paddingVertical: 18,
    borderTopWidth: 1, borderBottomWidth: 1, borderColor: Colors.border, marginVertical: 8,
  },
  reviewLinkLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  reviewLinkTitle: { fontSize: 16, fontWeight: '700', color: Colors.text },
  reviewLinkCount: { fontSize: 14, color: Colors.sub },
  reviewLinkArrow: { fontSize: 20, color: Colors.sub },
  priceLabelNote: { fontSize: 10, color: Colors.sub, fontWeight: '400' },
  sectionSubtitle: { fontSize: 12, color: Colors.sub, marginTop: -8 },
  relatedCard: { width: 130, backgroundColor: Colors.bg, borderRadius: 12, padding: 10, gap: 4 },
  relatedCardImg: { width: '100%', height: 90, borderRadius: 10, backgroundColor: '#FFE8F0', alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  relatedCardCategory: { fontSize: 10, color: Colors.primary, fontWeight: '700' },
  relatedCardName: { fontSize: 12, fontWeight: '700', color: Colors.text, lineHeight: 16 },
  relatedCardPrice: { fontSize: 11, color: Colors.primary, fontWeight: '600' },
  relatedCardRating: { fontSize: 10, color: Colors.sub },
  clinicMapBanner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: Colors.white, margin: 8, marginTop: 0, borderRadius: 14, padding: 16,
    borderWidth: 1.5, borderColor: Colors.primaryLight,
  },
  clinicMapBannerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  clinicMapBannerIcon: { fontSize: 28 },
  clinicMapBannerTitle: { fontSize: 15, fontWeight: '700', color: Colors.text },
  clinicMapBannerDesc: { fontSize: 12, color: Colors.sub, marginTop: 2 },
  clinicMapBannerArrow: { fontSize: 22, color: Colors.primary, fontWeight: '700' },
  disclaimer: {
    backgroundColor: '#F8F4FF', margin: 8, marginTop: 0, borderRadius: 12, padding: 16,
    borderLeftWidth: 3, borderLeftColor: Colors.primary,
  },
  disclaimerTitle: { fontSize: 13, fontWeight: '700', color: Colors.primary, marginBottom: 8 },
  disclaimerText: { fontSize: 12, color: Colors.sub, lineHeight: 20 },
  bottomBar: {
    flexDirection: 'row', gap: 10, padding: 16, paddingBottom: 32,
    backgroundColor: Colors.white, borderTopWidth: 1, borderTopColor: Colors.border,
  },
  compareBtn: {
    flex: 1, paddingVertical: 14, borderRadius: 12, borderWidth: 1.5,
    borderColor: Colors.primary, alignItems: 'center',
  },
  compareBtnActive: { borderColor: Colors.border },
  compareBtnText: { fontSize: 14, fontWeight: '700', color: Colors.primary },
  coupangBtnWrap: { flex: 2 },
  coupangBtn: { paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  coupangBtnText: { fontSize: 14, fontWeight: '700', color: Colors.white },
});
