import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  ActivityIndicator, Image, FlatList, Modal, TextInput, Alert, Platform, Share,
} from 'react-native';
import { useEffect, useState } from 'react';
import { useLocalSearchParams, router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../../lib/supabase';
import { Colors } from '../../constants/colors';
import { useAuth } from '../../hooks/useAuth';
import { useCompare } from '../../hooks/useCompare';
import { Treatment, Device, Review } from '../../types';
import MediaGallery from '../../components/MediaGallery';

export default function TreatmentDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user, profile, fetchProfile } = useAuth();
  const { items, add } = useCompare();
  const [treatment, setTreatment] = useState<Treatment | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [relatedDevices, setRelatedDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [newRating, setNewRating] = useState(5);
  const [newBody, setNewBody] = useState('');
  const [reviewImageUri, setReviewImageUri] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [favoriteId, setFavoriteId] = useState<string | null>(null);
  const [reviewPage, setReviewPage] = useState(1);
  const [reviewTotal, setReviewTotal] = useState(0);
  const REVIEW_PAGE_SIZE = 30;

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
        .then(({ data }) => setFavoriteId(data?.id ?? null));
    } else {
      setFavoriteId(null);
    }
  }, [user?.id, id]);

  const fetchReviews = async (page = 1) => {
    const from = (page - 1) * REVIEW_PAGE_SIZE;
    const { data: reviewRows, count } = await supabase
      .from('reviews')
      .select('*', { count: 'exact' })
      .eq('item_id', id)
      .eq('item_type', 'treatment')
      .order('created_at', { ascending: false })
      .range(from, from + REVIEW_PAGE_SIZE - 1);
    if (!reviewRows || reviewRows.length === 0) {
      if (page === 1) setReviews([]);
      setReviewTotal(count ?? 0);
      return;
    }
    // 2단계: 닉네임 별도 조회 (RLS 우회)
    const userIds = [...new Set(reviewRows.map((r: any) => r.user_id))];
    const { data: profileRows } = await supabase
      .from('profiles')
      .select('user_id, nickname')
      .in('user_id', userIds);
    const profileMap = Object.fromEntries(
      (profileRows ?? []).map((p: any) => [p.user_id, p])
    );
    const merged = reviewRows.map((r: any) => ({
      ...r,
      profile: profileMap[r.user_id] ?? null,
    }));
    setReviews((prev) => page === 1 ? merged : [...prev, ...merged]);
    setReviewTotal(count ?? 0);
    setReviewPage(page);
  };

  const fetchData = async () => {
    const { data: t } = await supabase.from('treatments').select('*').eq('id', id).single();
    setTreatment(t);
    await fetchReviews(1);
    if (t) {
      const { data: devs } = await supabase
        .from('devices')
        .select('*')
        .eq('category', t.category)
        .limit(4);
      setRelatedDevices(devs ?? []);
    }
    setLoading(false);
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

  const handlePickReviewImage = async () => {
    if (Platform.OS !== 'web') {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('권한 필요', '사진 접근 권한이 필요합니다.');
        return;
      }
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.7,
    });
    if (!result.canceled && result.assets[0]) {
      setReviewImageUri(result.assets[0].uri);
    }
  };

  const uploadReviewImage = async (uri: string): Promise<string | null> => {
    try {
      const ext = uri.split('.').pop()?.toLowerCase() ?? 'jpg';
      const fileName = `review-${user!.id}-${Date.now()}.${ext}`;
      const response = await fetch(uri);
      const blob = await response.blob();
      const { error } = await supabase.storage
        .from('review-images')
        .upload(fileName, blob, { contentType: `image/${ext}`, upsert: false });
      if (error) return null;
      const { data } = supabase.storage.from('review-images').getPublicUrl(fileName);
      return data.publicUrl;
    } catch {
      return null;
    }
  };

  const handleSubmitReview = async () => {
    if (!user || !treatment || !newBody.trim()) return;
    setSubmitting(true);
    let imageUrl: string | null = null;
    if (reviewImageUri) {
      imageUrl = await uploadReviewImage(reviewImageUri);
    }
    await supabase.from('reviews').insert({
      user_id: user.id,
      item_id: treatment.id,
      item_type: 'treatment',
      rating: newRating,
      body: newBody.trim(),
      image_url: imageUrl,
    });
    // review_count 즉시 반영
    const newCount = treatment.review_count + 1;
    await supabase.from('treatments').update({ review_count: newCount }).eq('id', treatment.id);
    setTreatment({ ...treatment, review_count: newCount });
    // 리뷰 50pt (아이템당 1회)
    const reviewReason = `리뷰:${treatment.id}`;
    const { data: existingLog } = await supabase
      .from('point_logs').select('id').eq('user_id', user.id).eq('reason', reviewReason).limit(1);
    if (!existingLog || existingLog.length === 0) {
      const { data: p } = await supabase.from('profiles').select('points').eq('user_id', user.id).single();
      await supabase.from('point_logs').insert({ user_id: user.id, amount: 50, reason: reviewReason });
      await supabase.from('profiles').update({ points: (p?.points ?? 0) + 50 }).eq('user_id', user.id);
      await fetchProfile(user.id);
      Alert.alert('✅ 리뷰 등록 완료', '50pt가 적립됐어요!');
    }
    await fetchReviews(1);
    setNewBody('');
    setNewRating(5);
    setReviewImageUri(null);
    setSubmitting(false);
    setShowReviewModal(false);
  };

  const handleShare = async () => {
    const url = `https://pickdi.netlify.app/treatment/${treatment?.id}`;
    const msg = `${treatment?.name} | 픽디에서 확인해보세요 🌸\n${url}`;
    try {
      if (Platform.OS === 'web') {
        await navigator.clipboard.writeText(msg);
        Alert.alert('복사 완료!', '링크가 클립보드에 복사됐어요.');
      } else {
        await Share.share({ message: msg });
      }
    } catch {
      Alert.alert('공유 링크', url);
    }
  };

  const handleToggleFavorite = async () => {
    if (!user) { router.push('/(auth)/login'); return; }
    if (!treatment) return;
    if (favoriteId) {
      await supabase.from('favorites').delete().eq('id', favoriteId);
      setFavoriteId(null);
    } else {
      const { data } = await supabase
        .from('favorites')
        .insert({ user_id: user.id, item_id: treatment.id, item_type: 'treatment' })
        .select('id')
        .single();
      setFavoriteId(data?.id ?? null);
    }
  };

  if (loading) return <View style={styles.center}><ActivityIndicator color={Colors.primary} /></View>;
  if (!treatment) return <View style={styles.center}><Text>시술을 찾을 수 없어요</Text></View>;

  const inCompare = items.some((i) => i.item_id === treatment.id);
  const userAlreadyReviewed = reviews.some((r) => r.user_id === user?.id);

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
            <Text style={styles.shareBtnText}>↑</Text>
          </TouchableOpacity>
          {/* 찜하기 버튼 */}
          <TouchableOpacity style={styles.heartBtn} onPress={handleToggleFavorite}>
            <Text style={styles.heartBtnText}>{favoriteId ? '♥' : '♡'}</Text>
          </TouchableOpacity>
        </View>

        {/* 기본 정보 */}
        <View style={styles.infoCard}>
          <Text style={styles.category}>{treatment.category}</Text>
          <Text style={styles.name}>{treatment.name}</Text>
          <View style={styles.ratingRow}>
            <Text style={styles.rating}>⭐ {treatment.rating.toFixed(1)}</Text>
            <Text style={styles.reviewCount}>리뷰 {treatment.review_count}개</Text>
          </View>

          <View style={styles.priceRow}>
            <View>
              <Text style={styles.priceLabel}>예상 비용 <Text style={styles.priceLabelNote}>*지역·병원별 상이</Text></Text>
              <Text style={styles.price}>
                {treatment.price_min.toLocaleString()}~{treatment.price_max.toLocaleString()}원
              </Text>
            </View>
            <View>
              <Text style={styles.priceLabel}>시술 시간</Text>
              <Text style={styles.price}>{treatment.duration_min}~{treatment.duration_max}분</Text>
            </View>
          </View>

          <View style={styles.tags}>
            {treatment.tags.map((tag) => (
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

        {/* 리뷰 */}
        <View style={styles.section}>
          <View style={styles.reviewTitleRow}>
            <Text style={styles.sectionTitle}>리뷰</Text>
            <Text style={styles.reviewCountBadge}>
              {reviewTotal > 0 ? `총 ${reviewTotal.toLocaleString()}개` : ''}
            </Text>
          </View>
          {reviews.length === 0 ? (
            <Text style={styles.noReview}>아직 리뷰가 없어요</Text>
          ) : (
            <>
              {reviews.map((r) => (
                <View key={r.id} style={styles.reviewCard}>
                  <View style={styles.reviewHeader}>
                    <Text style={styles.reviewNickname}>
                      {(r as any).profile?.nickname ?? '익명'}
                    </Text>
                    <View style={styles.reviewMeta}>
                      <Text style={styles.reviewRating}>{'⭐'.repeat(r.rating)}</Text>
                      <Text style={styles.reviewDate}>
                        {new Date(r.created_at).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.reviewBody}>{r.body}</Text>
                  {r.image_url && (
                    <Image source={{ uri: r.image_url }} style={styles.reviewImage} resizeMode="cover" />
                  )}
                </View>
              ))}
              {reviews.length < reviewTotal && (
                <TouchableOpacity
                  style={styles.loadMoreBtn}
                  onPress={() => fetchReviews(reviewPage + 1)}
                >
                  <Text style={styles.loadMoreBtnText}>
                    더보기 ({reviews.length}/{reviewTotal})
                  </Text>
                </TouchableOpacity>
              )}
            </>
          )}
          {user ? (
            userAlreadyReviewed ? (
              <Text style={styles.alreadyReviewed}>✓ 내 리뷰가 포함되어 있어요</Text>
            ) : (
              <TouchableOpacity style={styles.writeReviewBtn} onPress={() => setShowReviewModal(true)}>
                <Text style={styles.writeReviewBtnText}>✍️ 리뷰 쓰기</Text>
              </TouchableOpacity>
            )
          ) : (
            <TouchableOpacity style={styles.writeReviewBtn} onPress={() => router.push('/(auth)/login')}>
              <Text style={styles.writeReviewBtnText}>로그인하고 리뷰 쓰기</Text>
            </TouchableOpacity>
          )}
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
          style={styles.payBtn}
          onPress={() => router.push({
            pathname: '/payment',
            params: { itemName: treatment.name, amount: treatment.price_min },
          })}
        >
          <Text style={styles.payBtnText}>예약·결제</Text>
        </TouchableOpacity>
      </View>

      {/* 리뷰 작성 모달 */}
      <Modal visible={showReviewModal} transparent animationType="slide" onRequestClose={() => setShowReviewModal(false)}>
        <View style={styles.reviewModalOverlay}>
          <View style={styles.reviewSheet}>
            <Text style={styles.reviewSheetTitle}>리뷰 작성</Text>
            <Text style={styles.reviewSheetItem}>{treatment.name}</Text>
            <View style={styles.starRow}>
              {[1, 2, 3, 4, 5].map((s) => (
                <TouchableOpacity key={s} onPress={() => setNewRating(s)}>
                  <Text style={[styles.star, s <= newRating && styles.starActive]}>★</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TextInput
              style={styles.reviewInput}
              placeholder="시술 후기를 솔직하게 작성해주세요 (최대 500자)"
              placeholderTextColor={Colors.sub}
              multiline
              value={newBody}
              onChangeText={setNewBody}
              maxLength={500}
            />
            <Text style={styles.charCount}>{newBody.length}/500</Text>

            {/* 이미지 첨부 */}
            <TouchableOpacity style={styles.imagePickerBtn} onPress={handlePickReviewImage}>
              {reviewImageUri ? (
                <View style={styles.imagePickerPreviewWrap}>
                  <Image source={{ uri: reviewImageUri }} style={styles.imagePickerPreview} resizeMode="cover" />
                  <TouchableOpacity
                    style={styles.imagePickerRemove}
                    onPress={() => setReviewImageUri(null)}
                  >
                    <Text style={styles.imagePickerRemoveText}>✕</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.imagePickerEmpty}>
                  <Text style={styles.imagePickerIcon}>📷</Text>
                  <Text style={styles.imagePickerLabel}>사진 첨부 (선택)</Text>
                </View>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.reviewSubmitBtn, (!newBody.trim() || submitting) && styles.reviewSubmitBtnDisabled]}
              onPress={handleSubmitReview}
              disabled={!newBody.trim() || submitting}
            >
              {submitting
                ? <ActivityIndicator color={Colors.white} />
                : <Text style={styles.reviewSubmitBtnText}>등록하기</Text>}
            </TouchableOpacity>
            <TouchableOpacity style={styles.reviewCancelBtn} onPress={() => { setShowReviewModal(false); setReviewImageUri(null); }}>
              <Text style={styles.reviewCancelBtnText}>취소</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  noReview: { fontSize: 14, color: Colors.sub },
  reviewTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  reviewCountBadge: { fontSize: 13, color: Colors.primary, fontWeight: '700' },
  reviewCard: { paddingVertical: 12, borderTopWidth: 1, borderTopColor: Colors.border },
  reviewHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 },
  reviewNickname: { fontSize: 13, fontWeight: '700', color: Colors.text },
  reviewMeta: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  reviewRating: { fontSize: 12 },
  reviewDate: { fontSize: 11, color: Colors.sub },
  reviewBody: { fontSize: 14, color: Colors.sub, lineHeight: 20 },
  loadMoreBtn: {
    marginTop: 12, paddingVertical: 12, borderRadius: 10,
    borderWidth: 1, borderColor: Colors.border, alignItems: 'center',
  },
  loadMoreBtnText: { fontSize: 13, fontWeight: '600', color: Colors.sub },
  alreadyReviewed: { fontSize: 13, color: Colors.success, fontWeight: '600', marginTop: 12 },
  writeReviewBtn: {
    marginTop: 12, borderWidth: 1.5, borderColor: Colors.primary,
    borderRadius: 10, paddingVertical: 12, alignItems: 'center',
  },
  writeReviewBtnText: { fontSize: 14, fontWeight: '700', color: Colors.primary },
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
  payBtn: { flex: 2, paddingVertical: 14, borderRadius: 12, backgroundColor: Colors.primary, alignItems: 'center' },
  payBtnText: { fontSize: 14, fontWeight: '700', color: Colors.white },
  reviewModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  reviewSheet: {
    backgroundColor: Colors.white, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, paddingBottom: 48,
  },
  reviewSheetTitle: { fontSize: 18, fontWeight: '800', color: Colors.text, marginBottom: 4 },
  reviewSheetItem: { fontSize: 13, color: Colors.sub, marginBottom: 16 },
  starRow: { flexDirection: 'row', gap: 8, justifyContent: 'center', marginBottom: 16 },
  star: { fontSize: 36, color: Colors.border },
  starActive: { color: '#FFD700' },
  reviewInput: {
    borderWidth: 1.5, borderColor: Colors.border, borderRadius: 12,
    padding: 14, fontSize: 14, color: Colors.text, minHeight: 120,
    textAlignVertical: 'top',
  },
  charCount: { fontSize: 11, color: Colors.sub, textAlign: 'right', marginTop: 4, marginBottom: 12 },
  reviewImage: { width: '100%', height: 180, borderRadius: 10, marginTop: 10 },
  imagePickerBtn: { marginBottom: 16 },
  imagePickerEmpty: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderWidth: 1.5, borderColor: Colors.border, borderStyle: 'dashed',
    borderRadius: 12, padding: 14, justifyContent: 'center',
  },
  imagePickerIcon: { fontSize: 22 },
  imagePickerLabel: { fontSize: 14, color: Colors.sub, fontWeight: '600' },
  imagePickerPreviewWrap: { position: 'relative' },
  imagePickerPreview: { width: '100%', height: 160, borderRadius: 12 },
  imagePickerRemove: {
    position: 'absolute', top: 8, right: 8,
    backgroundColor: 'rgba(0,0,0,0.55)', width: 28, height: 28,
    borderRadius: 14, alignItems: 'center', justifyContent: 'center',
  },
  imagePickerRemoveText: { color: Colors.white, fontSize: 13, fontWeight: '700' },
  reviewSubmitBtn: {
    backgroundColor: Colors.primary, borderRadius: 12, paddingVertical: 14,
    alignItems: 'center', marginBottom: 10,
  },
  reviewSubmitBtnDisabled: { backgroundColor: Colors.border },
  reviewSubmitBtnText: { color: Colors.white, fontSize: 15, fontWeight: '700' },
  reviewCancelBtn: { alignItems: 'center', paddingVertical: 8 },
  reviewCancelBtnText: { fontSize: 14, color: Colors.sub },
});
