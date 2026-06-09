import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  ActivityIndicator, Image, Modal, TextInput, Alert, Platform,
} from 'react-native';
import { useEffect, useState } from 'react';
import { useLocalSearchParams, router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { Colors, HEADER_TOP } from '../constants/colors';
import { Review } from '../types';
import { LinearGradient } from 'expo-linear-gradient';

const REVIEW_PAGE_SIZE = 20;
const VIRTUAL_NAMES = ['피부미인', '뷰티고수', '피부천재', '스킨케어러', '미용러버', '피부요정', '뷰티스타', '관리러버', '피부빛나', '뷰티천재', '피부사랑', '미용전문'];
function virtualNick(uid: string): string {
  let n = 0;
  for (let i = 0; i < uid.length; i++) n = (n * 31 + uid.charCodeAt(i)) >>> 0;
  return VIRTUAL_NAMES[n % VIRTUAL_NAMES.length];
}

export default function ReviewsScreen() {
  const { itemId, itemType, itemName } = useLocalSearchParams<{
    itemId: string;
    itemType: 'treatment' | 'device';
    itemName: string;
  }>();
  const { user, profile, fetchProfile } = useAuth();

  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewTotal, setReviewTotal] = useState(0);
  const [reviewPage, setReviewPage] = useState(1);
  const [loading, setLoading] = useState(true);

  // Write review modal state
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [newRating, setNewRating] = useState(5);
  const [newBody, setNewBody] = useState('');
  const [reviewImageUri, setReviewImageUri] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (itemId && itemType) {
      fetchReviews(1);
    }
  }, [itemId, itemType]);

  const fetchReviews = async (page = 1) => {
    if (page === 1) setLoading(true);
    const from = (page - 1) * REVIEW_PAGE_SIZE;
    const { data: reviewRows, count } = await supabase
      .from('reviews')
      .select('*', { count: 'exact' })
      .eq('item_id', itemId)
      .eq('item_type', itemType)
      .order('created_at', { ascending: false })
      .range(from, from + REVIEW_PAGE_SIZE - 1);

    const userIds = [...new Set((reviewRows ?? []).map((r: any) => r.user_id))];
    let profileMap: Record<string, any> = {};
    if (userIds.length > 0) {
      const { data: profileRows } = await supabase
        .from('profiles')
        .select('user_id, nickname')
        .in('user_id', userIds);
      profileMap = Object.fromEntries((profileRows ?? []).map((p: any) => [p.user_id, p]));
    }
    const merged = (reviewRows ?? []).map((r: any) => ({
      ...r,
      profile: profileMap[r.user_id] ?? { nickname: virtualNick(r.user_id) },
    }));
    setReviews(prev => page === 1 ? merged : [...prev, ...merged]);
    setReviewTotal(count ?? 0);
    setReviewPage(page);
    setLoading(false);
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
    if (!user || !itemId || !newBody.trim()) return;
    if (newBody.trim().length < 10) {
      Alert.alert('내용 부족', '리뷰를 10자 이상 작성해주세요.');
      return;
    }
    setSubmitting(true);
    let imageUrl: string | null = null;
    if (reviewImageUri) {
      imageUrl = await uploadReviewImage(reviewImageUri);
    }
    const { error: reviewError } = await supabase.from('reviews').insert({
      user_id: user.id,
      item_id: itemId,
      item_type: itemType,
      rating: newRating,
      body: newBody.trim(),
      image_url: imageUrl,
    });
    if (reviewError) {
      Alert.alert('오류', '리뷰 등록에 실패했어요. 다시 시도해주세요.');
      setSubmitting(false);
      return;
    }
    // review_count 즉시 반영
    const table = itemType === 'treatment' ? 'treatments' : 'devices';
    const { data: currentItem } = await supabase.from(table).select('review_count').eq('id', itemId).maybeSingle();
    const newCount = (currentItem?.review_count ?? 0) + 1;
    await supabase.from(table).update({ review_count: newCount }).eq('id', itemId);
    // 리뷰 50pt (아이템당 1회)
    const reviewReason = `리뷰:${itemId}`;
    const { data: existingLog } = await supabase
      .from('point_logs').select('id').eq('user_id', user.id).eq('reason', reviewReason).limit(1);
    if (!existingLog || existingLog.length === 0) {
      const { data: p } = await supabase.from('profiles').select('points').eq('user_id', user.id).maybeSingle();
      await supabase.from('point_logs').insert({ user_id: user.id, amount: 50, reason: reviewReason });
      await supabase.from('profiles').update({ points: (p?.points ?? 0) + 50 }).eq('user_id', user.id);
      await fetchProfile(user.id);
      Alert.alert('✅ 리뷰 등록 완료', '50pt가 적립됐어요!');
    } else {
      Alert.alert('✅ 리뷰 등록 완료', '리뷰가 등록됐어요!');
    }
    await fetchReviews(1);
    setNewBody('');
    setNewRating(5);
    setReviewImageUri(null);
    setSubmitting(false);
    setShowReviewModal(false);
  };

  // Rating summary
  const avgRating = reviews.length > 0
    ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
    : '0.0';

  const ratingDist = [5, 4, 3, 2, 1].map(star => ({
    star,
    count: reviews.filter(r => r.rating === star).length,
  }));

  const userAlreadyReviewed = reviews.some((r) => r.user_id === user?.id);

  return (
    <View style={{ flex: 1, backgroundColor: Colors.bg }}>
      {/* Gradient Header */}
      <LinearGradient
        colors={['#FF6B9D', '#C084FC']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={[styles.header, { paddingTop: HEADER_TOP }]}
      >
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>리뷰</Text>
        <TouchableOpacity
          style={styles.writeBtn}
          onPress={() => {
            if (!user) { router.push('/(auth)/login' as any); return; }
            setShowReviewModal(true);
          }}
        >
          <Text style={styles.writeBtnText}>✍️</Text>
        </TouchableOpacity>
      </LinearGradient>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Item name */}
        {itemName ? (
          <View style={styles.itemNameRow}>
            <Text style={styles.itemName} numberOfLines={1}>{itemName}</Text>
          </View>
        ) : null}

        {/* Rating summary card */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryLeft}>
            <Text style={styles.summaryAvg}>⭐ {avgRating}</Text>
            <Text style={styles.summaryCount}>총 {reviewTotal.toLocaleString()}개 리뷰</Text>
          </View>
          <View style={styles.summaryBars}>
            {ratingDist.map(({ star, count }) => (
              <View key={star} style={styles.barRow}>
                <Text style={styles.barLabel}>{star}점</Text>
                <View style={styles.barTrack}>
                  <View
                    style={[
                      styles.barFill,
                      { width: reviewTotal > 0 ? `${Math.round((count / reviewTotal) * 100)}%` : '0%' as any },
                    ]}
                  />
                </View>
                <Text style={styles.barCount}>{count}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Review list */}
        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator color={Colors.primary} />
          </View>
        ) : reviews.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyEmoji}>💬</Text>
            <Text style={styles.emptyText}>아직 리뷰가 없어요{'\n'}첫 번째 리뷰를 남겨보세요!</Text>
            <TouchableOpacity
              style={styles.writeReviewBtn}
              onPress={() => {
                if (!user) { router.push('/(auth)/login' as any); return; }
                setShowReviewModal(true);
              }}
            >
              <Text style={styles.writeReviewBtnText}>✍️ 리뷰 쓰기</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.reviewList}>
            {reviews.map((r) => (
              <View key={r.id} style={styles.reviewCard}>
                <View style={styles.reviewHeader}>
                  <Text style={styles.reviewNickname}>
                    {(r as any).profile?.nickname || virtualNick((r as any).user_id)}
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

            {/* Load more */}
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

            {/* Write review CTA */}
            {user ? (
              userAlreadyReviewed ? (
                <Text style={styles.alreadyReviewed}>✓ 내 리뷰가 포함되어 있어요</Text>
              ) : (
                <TouchableOpacity style={styles.writeReviewBtn} onPress={() => setShowReviewModal(true)}>
                  <Text style={styles.writeReviewBtnText}>✍️ 리뷰 쓰기</Text>
                </TouchableOpacity>
              )
            ) : (
              <TouchableOpacity style={styles.writeReviewBtn} onPress={() => router.push('/(auth)/login' as any)}>
                <Text style={styles.writeReviewBtnText}>로그인하고 리뷰 쓰기</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Write Review Modal */}
      <Modal
        visible={showReviewModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowReviewModal(false)}
      >
        <View style={styles.reviewModalOverlay}>
          <View style={styles.reviewSheet}>
            <Text style={styles.reviewSheetTitle}>리뷰 작성</Text>
            {itemName ? <Text style={styles.reviewSheetItem}>{itemName}</Text> : null}
            <View style={styles.starRow}>
              {[1, 2, 3, 4, 5].map((s) => (
                <TouchableOpacity key={s} onPress={() => setNewRating(s)}>
                  <Text style={[styles.star, s <= newRating && styles.starActive]}>★</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TextInput
              style={styles.reviewInput}
              placeholder="후기를 솔직하게 작성해주세요 (최대 500자)"
              placeholderTextColor={Colors.sub}
              multiline
              value={newBody}
              onChangeText={setNewBody}
              maxLength={500}
            />
            <Text style={styles.charCount}>{newBody.length}/500</Text>

            {/* Image picker */}
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
            <TouchableOpacity
              style={styles.reviewCancelBtn}
              onPress={() => { setShowReviewModal(false); setReviewImageUri(null); }}
            >
              <Text style={styles.reviewCancelBtnText}>취소</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 14,
    gap: 0,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center', justifyContent: 'center',
  },
  backBtnText: { fontSize: 18, color: Colors.white, fontWeight: '700' },
  headerTitle: {
    flex: 1, textAlign: 'center',
    fontSize: 17, fontWeight: '800', color: Colors.white,
  },
  writeBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center', justifyContent: 'center',
  },
  writeBtnText: { fontSize: 18 },
  itemNameRow: {
    paddingHorizontal: 20, paddingVertical: 12,
    backgroundColor: Colors.white,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  itemName: { fontSize: 14, color: Colors.sub, fontWeight: '600' },
  summaryCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.white, margin: 12, borderRadius: 16,
    padding: 16, gap: 16,
  },
  summaryLeft: { alignItems: 'center', minWidth: 70 },
  summaryAvg: { fontSize: 28, fontWeight: '800', color: Colors.text },
  summaryCount: { fontSize: 12, color: Colors.sub, marginTop: 4, textAlign: 'center' },
  summaryBars: { flex: 1, gap: 4 },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  barLabel: { fontSize: 11, color: Colors.sub, width: 22, textAlign: 'right' },
  barTrack: {
    flex: 1, height: 6, backgroundColor: Colors.border, borderRadius: 3, overflow: 'hidden',
  },
  barFill: { height: '100%', backgroundColor: Colors.primary, borderRadius: 3 },
  barCount: { fontSize: 11, color: Colors.sub, width: 18, textAlign: 'left' },
  loadingBox: { padding: 40, alignItems: 'center' },
  emptyBox: { padding: 40, alignItems: 'center', gap: 12 },
  emptyEmoji: { fontSize: 48 },
  emptyText: { fontSize: 15, color: Colors.sub, textAlign: 'center', lineHeight: 22 },
  reviewList: {
    backgroundColor: Colors.white, marginHorizontal: 12, borderRadius: 16, padding: 16,
  },
  reviewCard: { paddingVertical: 14, borderTopWidth: 1, borderTopColor: Colors.border },
  reviewHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'flex-start', marginBottom: 6,
  },
  reviewNickname: { fontSize: 13, fontWeight: '700', color: Colors.text },
  reviewMeta: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  reviewRating: { fontSize: 12 },
  reviewDate: { fontSize: 11, color: Colors.sub },
  reviewBody: { fontSize: 14, color: Colors.sub, lineHeight: 20 },
  reviewImage: { width: '100%', height: 180, borderRadius: 10, marginTop: 10 },
  loadMoreBtn: {
    marginTop: 12, paddingVertical: 12, borderRadius: 10,
    borderWidth: 1, borderColor: Colors.border, alignItems: 'center',
  },
  loadMoreBtnText: { fontSize: 13, fontWeight: '600', color: Colors.sub },
  alreadyReviewed: {
    fontSize: 13, color: Colors.success, fontWeight: '600',
    textAlign: 'center', marginTop: 12, paddingVertical: 8,
  },
  writeReviewBtn: {
    marginTop: 12, borderWidth: 1.5, borderColor: Colors.primary,
    borderRadius: 10, paddingVertical: 12, alignItems: 'center',
  },
  writeReviewBtnText: { fontSize: 14, fontWeight: '700', color: Colors.primary },
  // Review modal
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
