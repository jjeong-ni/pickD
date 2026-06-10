import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  ActivityIndicator, Image, FlatList, Alert, Platform,
} from 'react-native';
import { useEffect, useState } from 'react';
import { useLocalSearchParams, router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '../../lib/supabase';
import { Colors } from '../../constants/colors';
import { APP_URL } from '../../constants/app';
import { useAuth } from '../../hooks/useAuth';
import { useCompare } from '../../hooks/useCompare';
import { Treatment, Device } from '../../types';
import MediaGallery from '../../components/MediaGallery';
import CompatibilityCard from '../../components/CompatibilityCard';
import PriceReports from '../../components/PriceReports';

export default function TreatmentDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user, profile } = useAuth();
  const { items, add } = useCompare();
  const [treatment, setTreatment] = useState<Treatment | null>(null);
  const [relatedDevices, setRelatedDevices] = useState<Device[]>([]);
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
        .eq('item_type', 'treatment')
        .maybeSingle()
        .then(({ data }) => setFavoriteId(data?.id ?? null))
        .catch(() => {});
    } else {
      setFavoriteId(null);
    }
  }, [user?.id, id]);

  const fetchData = async () => {
    try {
      const { data: t } = await supabase.from('treatments').select('*').eq('id', id).maybeSingle();
      setTreatment(t);
      if (t) {
        const { data: devs } = await supabase
          .from('devices')
          .select('*')
          .eq('category', t.category)
          .limit(4);
        setRelatedDevices(devs ?? []);
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
    if (!treatment) return;
    if (items.length >= 3) {
      Alert.alert(
        '비교함이 가득 찼어요 😅',
        '비교 항목은 최대 3개까지 담을 수 있어요.\n기존 항목을 제거한 뒤 다시 시도해주세요.',
        [{ text: '확인', style: 'default' }],
      );
      return;
    }
    await add(user.id, treatment.id, 'treatment');
  };

  const handleShare = async () => {
    const url = `${APP_URL}/treatment/${treatment?.id}`;
    const msg = `${treatment?.name} | 픽디에서 확인해보세요 🌸\n${url}`;
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
    if (!treatment) return;
    if (favoriteId) {
      const prev = favoriteId;
      setFavoriteId(null);
      const { error } = await supabase.from('favorites').delete().eq('id', favoriteId);
      if (error) setFavoriteId(prev);
    } else {
      const { data, error } = await supabase
        .from('favorites')
        .insert({ user_id: user.id, item_id: treatment.id, item_type: 'treatment' })
        .select('id')
        .maybeSingle();
      if (!error && data) setFavoriteId(data.id);
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
  if (!treatment) return (
    <View style={styles.center}>
      <Text style={{ fontSize: 48 }}>😢</Text>
      <Text style={{ fontSize: 16, color: Colors.sub, marginTop: 12 }}>시술을 찾을 수 없어요</Text>
      <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 20, paddingVertical: 12, paddingHorizontal: 24, backgroundColor: Colors.primary, borderRadius: 12 }}>
        <Text style={{ color: '#fff', fontWeight: '700' }}>돌아가기</Text>
      </TouchableOpacity>
    </View>
  );

  const inCompare = items.some((i) => i.item_id === treatment.id);

  return (
    <View style={{ flex: 1, backgroundColor: Colors.bg }}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* 미디어 갤러리 (이미지 캐러셀 + 동영상) */}
        <View style={{ position: 'relative' }}>
          <MediaGallery
            imageUrl={treatment.image_url}
            images={treatment.images ?? []}
            videoUrl={treatment.video_url}
            fallbackEmoji="💆"
          />
          {/* 뒤로가기 버튼 */}
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Text style={styles.backBtnText}>←</Text>
          </TouchableOpacity>
          {/* 공유 버튼 */}
          <TouchableOpacity style={styles.shareBtn} onPress={handleShare}>
            <Text style={styles.shareBtnText}>📤</Text>
          </TouchableOpacity>
          {/* 찜하기 버튼 */}
          <TouchableOpacity style={styles.heartBtn} onPress={handleToggleFavorite}>
            <Text style={styles.heartBtnText}>{favoriteId ? '🩷' : '🤍'}</Text>
          </TouchableOpacity>
        </View>

        {/* 기본 정보 */}
        <View style={styles.infoCard}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <Text style={[styles.category, { flex: 1, marginRight: 8 }]}>{treatment.category}</Text>
            <CompatibilityCard
              profile={profile}
              user={user}
              category={treatment.category}
              itemName={treatment.name}
              itemType="treatment"
            />
          </View>
          <Text style={styles.name}>{treatment.name}</Text>
          <TouchableOpacity
            style={styles.ratingRow}
            onPress={() => router.push({
              pathname: '/reviews',
              params: { itemId: id, itemType: 'treatment', itemName: treatment.name }
            } as any)}
            activeOpacity={0.7}
          >
            <Text style={styles.rating}>⭐ {(treatment.rating ?? 0).toFixed(1)}</Text>
            <Text style={styles.reviewCount}>리뷰 {treatment.review_count ?? 0}개 ›</Text>
          </TouchableOpacity>

          <View style={styles.priceRow}>
            <View>
              <Text style={styles.priceLabel}>예상 비용 <Text style={styles.priceLabelNote}>*지역·병원별 상이</Text></Text>
              <Text style={styles.price}>
                {(treatment.price_min ?? 0).toLocaleString()}~{(treatment.price_max ?? 0).toLocaleString()}원
              </Text>
            </View>
            <View>
              <Text style={styles.priceLabel}>시술 시간</Text>
              <Text style={styles.price}>{treatment.duration_min ?? '-'}~{treatment.duration_max ?? '-'}분</Text>
            </View>
          </View>

          <View style={styles.tags}>
            {(treatment.tags ?? []).map((tag) => (
              <View key={tag} style={styles.tag}>
                <Text style={styles.tagText}># {tag}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* 설명 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>시술 설명</Text>
          <Text style={styles.description}>{treatment.description}</Text>
        </View>

        {/* 시술 상세 정보 */}
        {(treatment.pain_level || treatment.downtime || treatment.sessions || treatment.side_effects) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>시술 상세 정보</Text>
            <View style={styles.detailGrid}>
              {treatment.pain_level && (
                <View style={styles.detailCell}>
                  <Text style={styles.detailIcon}>😣</Text>
                  <Text style={styles.detailLabel}>통증 수준</Text>
                  <Text style={styles.detailValue}>{treatment.pain_level}</Text>
                </View>
              )}
              {treatment.downtime && (
                <View style={styles.detailCell}>
                  <Text style={styles.detailIcon}>🛌</Text>
                  <Text style={styles.detailLabel}>다운타임</Text>
                  <Text style={styles.detailValue}>{treatment.downtime}</Text>
                </View>
              )}
              {treatment.sessions && (
                <View style={styles.detailCell}>
                  <Text style={styles.detailIcon}>📅</Text>
                  <Text style={styles.detailLabel}>권장 횟수</Text>
                  <Text style={styles.detailValue}>{treatment.sessions}</Text>
                </View>
              )}
              {treatment.duration && (
                <View style={styles.detailCell}>
                  <Text style={styles.detailIcon}>⏱</Text>
                  <Text style={styles.detailLabel}>유지 기간</Text>
                  <Text style={styles.detailValue}>{treatment.duration}</Text>
                </View>
              )}
            </View>
            {treatment.side_effects && (
              <View style={styles.sideEffectBox}>
                <Text style={styles.sideEffectTitle}>⚠️ 부작용·주의</Text>
                <Text style={styles.sideEffectText}>{treatment.side_effects}</Text>
              </View>
            )}
          </View>
        )}

        {/* 리뷰 — 별도 페이지로 분리 */}
        <TouchableOpacity
          style={styles.reviewLinkRow}
          onPress={() => router.push({ pathname: '/reviews', params: { itemId: id, itemType: 'treatment', itemName: treatment.name } } as any)}
          activeOpacity={0.8}
        >
          <View style={styles.reviewLinkLeft}>
            <Text style={styles.reviewLinkTitle}>리뷰</Text>
            <Text style={styles.reviewLinkCount}>총 {treatment.review_count ?? 0}개</Text>
          </View>
          <Text style={styles.reviewLinkArrow}>›</Text>
        </TouchableOpacity>

        {/* 커뮤니티 가격 제보 */}
        <View style={{ paddingHorizontal: 8, marginTop: 0 }}>
          <PriceReports itemId={id!} itemType="treatment" itemName={treatment.name} />
        </View>

        {/* 집에서 비슷한 효과 — 관련 기기 */}
        {relatedDevices.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🏠 집에서도 비슷한 효과</Text>
            <Text style={styles.sectionSubtitle}>같은 카테고리의 홈케어 기기예요</Text>
            <FlatList
              horizontal
              data={relatedDevices}
              keyExtractor={(i) => i.id}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 10, paddingTop: 12 }}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.relatedCard}
                  onPress={() => router.push(`/device/${item.id}` as any)}
                >
                  <View style={styles.relatedCardImg}>
                    {item.image_url
                      ? <Image source={{ uri: item.image_url }} style={{ width: '100%', height: '100%', borderRadius: 10 }} resizeMode="cover" />
                      : <Text style={{ fontSize: 28 }}>⚡</Text>}
                  </View>
                  <Text style={styles.relatedCardBrand} numberOfLines={1}>{item.brand}</Text>
                  <Text style={styles.relatedCardName} numberOfLines={2}>{item.name}</Text>
                  <Text style={styles.relatedCardPrice}>{item.price.toLocaleString()}원</Text>
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
            params: { treatmentName: treatment.name },
          } as any)}
          activeOpacity={0.85}
        >
          <View style={styles.clinicMapBannerLeft}>
            <Text style={styles.clinicMapBannerIcon}>📍</Text>
            <View>
              <Text style={styles.clinicMapBannerTitle}>근처 피부과 찾기</Text>
              <Text style={styles.clinicMapBannerDesc}>"{treatment.name}" 시술 가능한 클리닉 탐색</Text>
            </View>
          </View>
          <Text style={styles.clinicMapBannerArrow}>›</Text>
        </TouchableOpacity>

        {/* 의료 면책 안내 */}
        <View style={styles.disclaimer}>
          <Text style={styles.disclaimerTitle}>⚕️ 시술 전 확인하세요</Text>
          <Text style={styles.disclaimerText}>
            • 제공 정보는 일반적인 참고용이며 의료 상담을 대체하지 않습니다{'\n'}
            • 임산부·수유부, 피부질환자, 면역억제제·혈액희석제 복용자는 반드시 전문의 상담 후 결정하세요{'\n'}
            • 효과 및 부작용은 개인 피부 상태에 따라 다를 수 있습니다{'\n'}
            • 가격은 지역·병원·시술 범위에 따라 실제와 다를 수 있습니다
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
          style={styles.payBtnWrap}
          onPress={() => router.push({
            pathname: '/payment',
            params: { itemName: treatment.name, amount: treatment.price_min },
          })}
          activeOpacity={0.85}
        >
          <LinearGradient
            colors={['#FF6B9D', '#D473E8']}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            style={styles.payBtn}
          >
            <Text style={styles.payBtnText}>예약·결제</Text>
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
  // 시술 상세 정보 그리드
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
  infoCard: { backgroundColor: Colors.white, padding: 20 },
  category: { fontSize: 12, fontWeight: '700', color: Colors.primary },
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
  relatedCardImg: { width: '100%', height: 90, borderRadius: 10, backgroundColor: '#EEE8FF', alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  relatedCardBrand: { fontSize: 10, color: Colors.primary, fontWeight: '700' },
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
  payBtnWrap: { flex: 2 },
  payBtn: { paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  payBtnText: { fontSize: 14, fontWeight: '700', color: Colors.white },
});
