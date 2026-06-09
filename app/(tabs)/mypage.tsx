import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, Modal, Platform, Alert, Image,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { useState, useEffect } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { Colors, HEADER_TOP } from '../../constants/colors';
import { useResponsive } from '../../hooks/useResponsive';
import { GlassCard } from '../../components/GlassCard';
import { REPORT_COST } from '../../constants/app';

export default function MypageScreen() {
  const { user, profile, setProfile, fetchProfile, signOut } = useAuth();
  const { hPad } = useResponsive();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [reportLoading, setReportLoading] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [hasPurchasedReport, setHasPurchasedReport] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase.from('point_logs')
      .select('id').eq('user_id', user.id).eq('reason', '맞춤 피부 분석 보고서').limit(1)
      .then(({ data }) => setHasPurchasedReport(!!(data && data.length > 0)));
  }, [user?.id]);

  const handlePickAvatar = async () => {
    if (!user) return;
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('권한 필요', '갤러리 접근 권한이 필요해요.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'] as any,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (result.canceled) return;
    setAvatarUploading(true);
    try {
      const uri = result.assets[0].uri;
      const fileName = `avatar/${user.id}.jpg`;
      const response = await fetch(uri);
      const blob = await response.blob();
      const { error } = await supabase.storage
        .from('face-photos')
        .upload(fileName, blob, { contentType: 'image/jpeg', upsert: true });
      if (error) throw error;
      const { data: { publicUrl } } = supabase.storage.from('face-photos').getPublicUrl(fileName);
      const cacheBustedUrl = `${publicUrl}?t=${Date.now()}`;
      const { error: dbErr } = await supabase.from('profiles').update({ avatar_url: publicUrl }).eq('user_id', user.id);
      if (dbErr) throw dbErr;
      setProfile({ ...profile!, avatar_url: cacheBustedUrl });
    } catch {
      Alert.alert('오류', '프로필 사진 업로드에 실패했어요.');
    } finally {
      setAvatarUploading(false);
    }
  };

  const handleGetReport = async () => {
    if (!user || !profile) {
      router.push('/(auth)/login' as any);
      return;
    }
    setReportLoading(true);
    const { data: existing } = await supabase.from('point_logs')
      .select('id').eq('user_id', user.id).eq('reason', '맞춤 피부 분석 보고서').limit(1);
    if (existing && existing.length > 0) {
      setReportLoading(false);
      router.push('/skin-report' as any);
      return;
    }
    const currentPoints = profile.points ?? 0;
    if (currentPoints < REPORT_COST) {
      setReportLoading(false);
      Alert.alert(
        '포인트 부족',
        `보고서를 받으려면 ${REPORT_COST}pt가 필요해요.\n현재 보유: ${currentPoints}pt`,
        [{ text: '확인' }]
      );
      return;
    }
    const newPoints = currentPoints - REPORT_COST;
    const { error: deductError } = await supabase.from('profiles').update({ points: newPoints }).eq('user_id', user.id);
    if (deductError) {
      setReportLoading(false);
      Alert.alert('오류', '포인트 차감 중 문제가 발생했어요. 다시 시도해주세요.');
      return;
    }
    const { error: logError } = await supabase.from('point_logs').insert({ user_id: user.id, amount: -REPORT_COST, reason: '맞춤 피부 분석 보고서' });
    if (logError) {
      await supabase.from('profiles').update({ points: currentPoints }).eq('user_id', user.id);
      setReportLoading(false);
      Alert.alert('오류', '처리 중 문제가 발생했어요. 다시 시도해주세요.');
      return;
    }
    setProfile({ ...profile, points: newPoints });
    setReportLoading(false);
    router.push('/skin-report' as any);
  };

  const displayName = profile?.nickname || user?.email?.split('@')[0] || '-';

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* 프로필 — 그라데이션 헤더 */}
      <LinearGradient
        colors={['#FF6B9D', '#D473E8', '#9B6FE8']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.profileSection}
      >
        <View style={styles.profileOrb} />
        <TouchableOpacity onPress={handlePickAvatar} activeOpacity={0.85} style={styles.avatarWrap}>
          <GlassCard style={styles.avatarGlass} intensity="low">
            {profile?.avatar_url ? (
              <Image
                source={{ uri: profile.avatar_url }}
                style={styles.avatarImage}
                resizeMode="cover"
              />
            ) : avatarUploading ? (
              <ActivityIndicator color="rgba(255,255,255,0.9)" size="large" />
            ) : (
              <Ionicons name="person" size={38} color="rgba(255,255,255,0.92)" />
            )}
          </GlassCard>
          <View style={styles.avatarEditBadge}>
            <Ionicons name="camera" size={12} color="#fff" />
          </View>
        </TouchableOpacity>
        <Text style={styles.nickname}>{displayName}</Text>
        <View style={styles.chips}>
          {profile?.skin_type && <Chip label={profile.skin_type} />}
          {profile?.face_shape && <Chip label={`${profile.face_shape} 얼굴형`} />}
          {profile?.age_group && <Chip label={profile.age_group} />}
        </View>
        <GlassCard style={styles.pointBadge} intensity="low">
          <Text style={styles.pointText}>🪙 {profile?.points ?? 0} pt</Text>
        </GlassCard>
      </LinearGradient>

      {/* 피부 프로필 카드 */}
      <View style={[styles.skinProfileCard, { marginHorizontal: hPad }]}>
        <View style={styles.skinProfileHeader}>
          <View style={styles.skinProfileTitleRow}>
            <Ionicons name="leaf-outline" size={18} color={Colors.primary} />
            <Text style={styles.skinProfileTitle}>내 피부 프로필</Text>
          </View>
          <TouchableOpacity
            style={styles.skinProfileEditBtn}
            onPress={() => router.push('/profile-setup' as any)}
          >
            <Ionicons name="create-outline" size={14} color={Colors.primary} />
            <Text style={styles.skinProfileEditText}>수정</Text>
          </TouchableOpacity>
        </View>

        {profile?.skin_type || profile?.face_shape || profile?.age_group || profile?.concerns?.length ? (
          <>
            <View style={styles.skinProfileGrid}>
              {profile?.skin_type && (
                <View style={styles.skinProfileItem}>
                  <Text style={styles.skinProfileItemLabel}>피부 타입</Text>
                  <Text style={styles.skinProfileItemValue}>{profile.skin_type}</Text>
                </View>
              )}
              {profile?.face_shape && (
                <View style={styles.skinProfileItem}>
                  <Text style={styles.skinProfileItemLabel}>얼굴형</Text>
                  <Text style={styles.skinProfileItemValue}>{profile.face_shape}</Text>
                </View>
              )}
              {profile?.age_group && (
                <View style={styles.skinProfileItem}>
                  <Text style={styles.skinProfileItemLabel}>연령대</Text>
                  <Text style={styles.skinProfileItemValue}>{profile.age_group}</Text>
                </View>
              )}
              {profile?.gender && (
                <View style={styles.skinProfileItem}>
                  <Text style={styles.skinProfileItemLabel}>성별</Text>
                  <Text style={styles.skinProfileItemValue}>{profile.gender}</Text>
                </View>
              )}
            </View>
            {profile?.concerns && profile.concerns.length > 0 && (
              <View style={styles.skinProfileConcerns}>
                <Text style={styles.skinProfileItemLabel}>주요 고민</Text>
                <View style={styles.concernRow}>
                  {profile.concerns.map((c: string) => (
                    <View key={c} style={styles.concernChip}>
                      <Text style={styles.concernText}>{c}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}
          </>
        ) : (
          <TouchableOpacity onPress={() => router.push('/profile-setup' as any)} style={styles.skinProfileEmpty}>
            <Ionicons name="add-circle-outline" size={28} color={Colors.primary} />
            <Text style={styles.skinProfileEmptyText}>피부 프로필을 완성하면{'\n'}맞춤 추천을 받을 수 있어요</Text>
          </TouchableOpacity>
        )}

        {(profile?.skin_age || profile?.moisture_score) ? (
          <View style={styles.scoreRow}>
            {profile?.skin_age && (
              <View style={styles.scoreBox}>
                <Text style={styles.scoreNum}>{profile.skin_age}</Text>
                <Text style={styles.scoreLabel}>피부나이</Text>
              </View>
            )}
            {profile?.moisture_score && (
              <View style={styles.scoreBox}>
                <Text style={styles.scoreNum}>{profile.moisture_score}</Text>
                <Text style={styles.scoreLabel}>수분도</Text>
              </View>
            )}
            {profile?.oil_score && (
              <View style={styles.scoreBox}>
                <Text style={styles.scoreNum}>{profile.oil_score}</Text>
                <Text style={styles.scoreLabel}>유분도</Text>
              </View>
            )}
          </View>
        ) : null}
      </View>

      {/* 미션 & 포인트 */}
      {user && (
        <TouchableOpacity style={[styles.missionBanner, { marginHorizontal: hPad }]} onPress={() => router.push('/missions' as any)} activeOpacity={0.85}>
          <View style={styles.missionBannerLeft}>
            <Text style={styles.missionBannerTitle}>🎯 미션 & 포인트</Text>
            <Text style={styles.missionBannerDesc}>출석체크·댓글·공유로 포인트 쌓기</Text>
          </View>
          <View style={styles.missionBannerRight}>
            <Text style={styles.missionBannerPts}>{profile?.points ?? 0} pt</Text>
            <Text style={styles.missionBannerArrow}>›</Text>
          </View>
        </TouchableOpacity>
      )}

      {/* 얼굴형 정밀분석 유도 배너 (face_shape 미설정 시) */}
      {user && !profile?.face_shape && (
        <TouchableOpacity
          style={[styles.faceAnalysisBanner, { marginHorizontal: hPad }]}
          onPress={() => router.push('/face-analysis' as any)}
          activeOpacity={0.85}
        >
          <View style={styles.faceAnalysisBannerLeft}>
            <Ionicons name="camera-outline" size={22} color={Colors.primary} style={{ marginBottom: 4 }} />
            <Text style={styles.faceAnalysisBannerTitle}>얼굴형 정밀분석하기</Text>
            <Text style={styles.faceAnalysisBannerDesc}>얼굴 사진으로 내 얼굴형을 분석해보세요 →</Text>
          </View>
          <View style={styles.faceAnalysisBannerBadge}>
            <Text style={styles.faceAnalysisBannerBadgeText}>미완료</Text>
          </View>
        </TouchableOpacity>
      )}

      {/* AI 피부 분석 */}
      <View style={[styles.aiSection, { marginHorizontal: hPad }]}>
        <View style={styles.aiSectionHeader}>
          <Text style={styles.aiSectionTitle}>AI 피부 분석</Text>
          <TouchableOpacity onPress={() => router.push('/analysis-report' as any)}>
            <Text style={styles.aiReportLink}>리포트 보기 📋</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.aiSectionDesc}>진단 질문에 답하고 맞춤 솔루션을 받아보세요</Text>
        <View style={styles.aiCards}>
          <TouchableOpacity style={[styles.aiCard, !profile?.face_shape && styles.aiCardHighlight]} onPress={() => router.push('/face-analysis' as any)} activeOpacity={0.8}>
            <Ionicons name="scan-outline" size={30} color={Colors.primary} />
            <Text style={styles.aiCardLabel}>얼굴형 분석</Text>
            <Text style={styles.aiCardDesc}>{profile?.face_shape ? `${profile.face_shape} ✓` : '6가지 유형 진단'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.aiCard} onPress={() => router.push('/skin-analysis' as any)} activeOpacity={0.8}>
            <Ionicons name="analytics-outline" size={30} color={Colors.primary} />
            <Text style={styles.aiCardLabel}>피부타입 분석</Text>
            <Text style={styles.aiCardDesc}>4가지 타입 진단</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 내 보관함 */}
      {user && (
        <View style={[styles.vaultSection, { marginHorizontal: hPad }]}>
          <View style={styles.vaultHeader}>
            <Ionicons name="folder-open-outline" size={18} color={Colors.primary} />
            <Text style={styles.vaultTitle}>내 보관함</Text>
          </View>

          {/* 피부 분석 리포트 */}
          <TouchableOpacity
            style={styles.vaultItem}
            onPress={() => router.push('/analysis-report' as any)}
            activeOpacity={0.8}
          >
            <View style={[styles.vaultIconBox, { backgroundColor: '#F3EFFF' }]}>
              <Ionicons name="analytics-outline" size={22} color="#6B4EFF" />
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={styles.vaultItemTitle}>피부 분석 리포트</Text>
              <Text style={styles.vaultItemDesc}>얼굴형 + 피부타입 AI 분석</Text>
            </View>
            {(profile?.face_shape || profile?.skin_type) ? (
              <View style={styles.vaultBadgeOpen}>
                <Text style={styles.vaultBadgeOpenText}>열람</Text>
              </View>
            ) : (
              <View style={styles.vaultBadgeLock}>
                <Text style={styles.vaultBadgeLockText}>진단 필요</Text>
              </View>
            )}
            <Ionicons name="chevron-forward" size={16} color={Colors.sub} />
          </TouchableOpacity>

          {/* 맞춤 피부 보고서 */}
          <TouchableOpacity
            style={styles.vaultItem}
            onPress={() => hasPurchasedReport
              ? router.push('/skin-report' as any)
              : router.push('/payment?itemName=맞춤 분석 보고서&returnTo=skin-report' as any)}
            activeOpacity={0.8}
          >
            <View style={[styles.vaultIconBox, { backgroundColor: '#FFF0F5' }]}>
              <Ionicons name="document-text-outline" size={22} color={Colors.primary} />
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={styles.vaultItemTitle}>맞춤 피부 보고서</Text>
              <Text style={styles.vaultItemDesc}>시술·루틴·스타일링 종합 리포트</Text>
            </View>
            {hasPurchasedReport ? (
              <View style={styles.vaultBadgeOpen}>
                <Text style={styles.vaultBadgeOpenText}>열람</Text>
              </View>
            ) : (
              <View style={styles.vaultBadgeLock}>
                <Text style={styles.vaultBadgeLockText}>990pt</Text>
              </View>
            )}
            <Ionicons name="chevron-forward" size={16} color={Colors.sub} />
          </TouchableOpacity>
        </View>
      )}

      {/* 맞춤 보고서 CTA */}
      <TouchableOpacity
        style={[styles.reportBanner, { marginHorizontal: hPad }]}
        onPress={handleGetReport}
        activeOpacity={0.85}
        disabled={reportLoading}
      >
        <View style={styles.reportBannerLeft}>
          <Text style={styles.reportBannerBadge}>베타 한정</Text>
          <Text style={styles.reportBannerTitle}>📋 맞춤 피부 분석 보고서</Text>
          <Text style={styles.reportBannerDesc}>베타테스트 기간 동안 현금 대신 포인트로!</Text>
        </View>
        <View style={styles.reportBannerRight}>
          <Text style={styles.reportBannerPrice}>990pt</Text>
          <Text style={styles.reportBannerArrow}>›</Text>
        </View>
      </TouchableOpacity>

      {/* 내 활동 */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>내 활동</Text>
      </View>
      <View style={styles.section}>
        <MenuItem icon="create-outline" label="내가 쓴 글" onPress={() => router.push('/my-posts' as any)} />
        <MenuItem icon="heart-outline" label="찜한 목록" onPress={() => router.push('/favorites' as any)} />
        <MenuItem icon="bag-outline" label="구매 내역" onPress={() => router.push('/purchases' as any)} />
        <MenuItem icon="cash-outline" label="포인트 내역" onPress={() => router.push('/point-logs' as any)} />
      </View>

      <View style={styles.divider} />

      {/* 계정 설정 */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>계정</Text>
      </View>
      <View style={styles.section}>
        <MenuItem icon="person-outline" label="계정 정보" onPress={() => router.push('/account')} />
        <MenuItem icon="notifications-outline" label="알림 설정" onPress={() => router.push('/notifications' as any)} />
      </View>

      <View style={styles.divider} />

      {/* 서비스 정보 */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>서비스 정보</Text>
      </View>
      <View style={styles.section}>
        <MenuItem icon="document-text-outline" label="이용약관" onPress={() => router.push('/terms')} />
        <MenuItem icon="shield-checkmark-outline" label="개인정보처리방침" onPress={() => router.push('/privacy')} />
        <MenuItem icon="information-circle-outline" label="앱 버전" sub="v1.0.0 (베타)" onPress={() => {}} />
        <MenuItem icon="log-out-outline" label="로그아웃" onPress={() => setShowLogoutConfirm(true)} danger />
      </View>

      <View style={{ height: 40 }} />

      {/* 로그아웃 확인 모달 */}
      <Modal visible={showLogoutConfirm} transparent animationType="fade" onRequestClose={() => setShowLogoutConfirm(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.confirmSheet}>
            <Text style={styles.confirmTitle}>로그아웃</Text>
            <Text style={styles.confirmDesc}>정말 로그아웃 하시겠어요?</Text>
            <View style={styles.confirmBtns}>
              <TouchableOpacity style={styles.confirmCancel} onPress={() => setShowLogoutConfirm(false)}>
                <Text style={styles.confirmCancelText}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.confirmOk} onPress={() => { setShowLogoutConfirm(false); signOut(); }}>
                <Text style={styles.confirmOkText}>로그아웃</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

function Chip({ label }: { label: string }) {
  return (
    <View style={styles.chip}>
      <Text style={styles.chipText}>{label}</Text>
    </View>
  );
}

function MenuItem({
  icon, label, onPress, danger = false, sub,
}: { icon: string; label: string; onPress: () => void; danger?: boolean; sub?: string }) {
  return (
    <TouchableOpacity style={styles.menuItem} onPress={onPress} activeOpacity={0.7}>
      <View style={[styles.menuIcon, danger && styles.menuIconDanger]}>
        <Ionicons
          name={icon as any}
          size={20}
          color={danger ? Colors.danger : Colors.primary}
        />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.menuLabel, danger && { color: Colors.danger }]}>{label}</Text>
        {sub && <Text style={styles.menuSub}>{sub}</Text>}
      </View>
      {!sub && <Text style={styles.menuArrow}>›</Text>}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  profileSection: {
    alignItems: 'center', padding: 28,
    paddingTop: HEADER_TOP,
    overflow: 'hidden',
  },
  profileOrb: {
    position: 'absolute', width: 200, height: 200, borderRadius: 100,
    backgroundColor: 'rgba(255,255,255,0.08)', top: -60, right: -40,
  },
  avatarWrap: { position: 'relative', marginBottom: 14 },
  avatarGlass: {
    width: 80, height: 80, borderRadius: 40,
    alignItems: 'center', justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImage: { width: 80, height: 80, borderRadius: 40 },
  avatarEditBadge: {
    position: 'absolute', bottom: 0, right: 0,
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: '#fff',
  },
  nickname: { fontSize: 22, fontWeight: '800', color: '#fff', marginBottom: 12 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginBottom: 14 },
  chip: {
    paddingVertical: 6, paddingHorizontal: 14, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.22)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.35)',
  },
  chipText: { fontSize: 13, fontWeight: '600', color: '#fff' },
  pointBadge: {
    paddingVertical: 8, paddingHorizontal: 18, borderRadius: 20,
  },
  pointText: { fontSize: 14, fontWeight: '800', color: '#fff' },
  profileSetupBanner: {
    margin: 16, padding: 16, backgroundColor: Colors.primaryLight,
    borderRadius: 14, gap: 4,
  },
  profileSetupTitle: { fontSize: 14, fontWeight: '700', color: Colors.primary },
  profileSetupDesc: { fontSize: 12, color: Colors.primary },

  /* 피부 프로필 카드 */
  skinProfileCard: {
    backgroundColor: Colors.white, marginTop: 12,
    borderRadius: 18, padding: 18, gap: 14,
    shadowColor: Colors.cardShadow,
    shadowOffset: { width: 0, height: 4 }, shadowOpacity: 1, shadowRadius: 12, elevation: 3,
    borderWidth: 1, borderColor: Colors.border,
  },
  skinProfileHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  skinProfileTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  skinProfileTitle: { fontSize: 15, fontWeight: '800', color: Colors.text },
  skinProfileEditBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingVertical: 5, paddingHorizontal: 10,
    borderRadius: 20, borderWidth: 1.5, borderColor: Colors.primaryLight,
    backgroundColor: '#FFF5F9',
  },
  skinProfileEditText: { fontSize: 12, fontWeight: '700', color: Colors.primary },
  skinProfileGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 10,
  },
  skinProfileItem: {
    flex: 1, minWidth: '45%', backgroundColor: Colors.bg,
    borderRadius: 12, padding: 12, gap: 4,
  },
  skinProfileItemLabel: { fontSize: 11, color: Colors.sub, fontWeight: '600' },
  skinProfileItemValue: { fontSize: 15, fontWeight: '800', color: Colors.text },
  skinProfileConcerns: { gap: 8 },
  skinProfileEmpty: { alignItems: 'center', gap: 10, paddingVertical: 14 },
  skinProfileEmptyText: { fontSize: 13, color: Colors.sub, textAlign: 'center', lineHeight: 20 },

  skinSummary: {
    backgroundColor: Colors.white, marginTop: 8, padding: 16, paddingHorizontal: 20,
  },
  sectionLabel: { fontSize: 12, fontWeight: '700', color: Colors.sub, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 },
  concernRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  concernChip: {
    paddingVertical: 4, paddingHorizontal: 12, borderRadius: 20,
    backgroundColor: '#FFF0F5', borderWidth: 1, borderColor: Colors.primaryLight,
  },
  concernText: { fontSize: 12, color: Colors.primary, fontWeight: '600' },
  scoreRow: { flexDirection: 'row', gap: 16 },
  scoreBox: {
    flex: 1, alignItems: 'center', backgroundColor: Colors.bg,
    borderRadius: 12, paddingVertical: 12,
  },
  scoreNum: { fontSize: 22, fontWeight: '800', color: Colors.primary },
  scoreLabel: { fontSize: 11, color: Colors.sub, marginTop: 2, fontWeight: '600' },
  sectionHeader: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 8, backgroundColor: Colors.bg },
  sectionTitle: { fontSize: 12, fontWeight: '700', color: Colors.sub, textTransform: 'uppercase', letterSpacing: 0.5 },
  section: { backgroundColor: Colors.white },
  divider: { height: 8, backgroundColor: '#F2F2F7' },
  menuItem: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    paddingVertical: 14, paddingHorizontal: 20,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  menuIcon: {
    width: 40, height: 40, borderRadius: 10, backgroundColor: Colors.primaryLight,
    alignItems: 'center', justifyContent: 'center',
  },
  menuIconDanger: { backgroundColor: '#FFF0F0' },
  menuLabel: { fontSize: 15, fontWeight: '600', color: Colors.text },
  menuSub: { fontSize: 12, color: Colors.sub, marginTop: 2 },
  menuArrow: { fontSize: 18, color: Colors.sub },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' },
  confirmSheet: {
    backgroundColor: Colors.white, borderRadius: 20, padding: 24, margin: 32, width: '80%',
    shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.15, shadowRadius: 20, elevation: 10,
  },
  confirmTitle: { fontSize: 17, fontWeight: '800', color: Colors.text, marginBottom: 8 },
  confirmDesc: { fontSize: 14, color: Colors.sub, marginBottom: 24, lineHeight: 20 },
  confirmBtns: { flexDirection: 'row', gap: 10 },
  confirmCancel: {
    flex: 1, paddingVertical: 14, borderRadius: 12,
    borderWidth: 1.5, borderColor: Colors.border, alignItems: 'center',
  },
  confirmCancelText: { fontSize: 15, fontWeight: '600', color: Colors.sub },
  confirmOk: { flex: 1, paddingVertical: 14, borderRadius: 12, backgroundColor: Colors.danger, alignItems: 'center' },
  confirmOkText: { fontSize: 15, fontWeight: '700', color: Colors.white },

  /* 보고서 배너 */
  reportBanner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginTop: 12, borderRadius: 16, padding: 16, overflow: 'hidden',
    backgroundColor: '#1A1A2E',
    borderWidth: 1, borderColor: '#9B6FE8',
  },
  reportBannerLeft: { gap: 4 },
  reportBannerBadge: {
    alignSelf: 'flex-start', fontSize: 10, fontWeight: '900', color: '#9B6FE8',
    backgroundColor: 'rgba(155,111,232,0.15)', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6,
    letterSpacing: 1, marginBottom: 2,
  },
  reportBannerTitle: { fontSize: 15, fontWeight: '800', color: '#fff' },
  reportBannerDesc: { fontSize: 12, color: 'rgba(255,255,255,0.6)' },
  reportBannerRight: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  reportBannerPrice: { fontSize: 18, fontWeight: '900', color: '#FF6B9D' },
  reportBannerArrow: { fontSize: 18, color: 'rgba(255,255,255,0.5)' },

  /* 미션 배너 */
  missionBanner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: Colors.white, marginTop: 12,
    borderRadius: 14, padding: 16,
    borderWidth: 1.5, borderColor: Colors.primaryLight,
  },
  missionBannerLeft: { gap: 4 },
  missionBannerTitle: { fontSize: 15, fontWeight: '700', color: Colors.text },
  missionBannerDesc: { fontSize: 12, color: Colors.sub },
  missionBannerRight: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  missionBannerPts: { fontSize: 16, fontWeight: '800', color: Colors.primary },
  missionBannerArrow: { fontSize: 18, color: Colors.sub },

  /* 얼굴형 정밀분석 배너 */
  faceAnalysisBanner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#FFF5F9', marginTop: 12,
    borderRadius: 14, padding: 16,
    borderWidth: 1.5, borderColor: Colors.primaryLight,
  },
  faceAnalysisBannerLeft: { gap: 2 },
  faceAnalysisBannerTitle: { fontSize: 15, fontWeight: '700', color: Colors.primary },
  faceAnalysisBannerDesc: { fontSize: 12, color: Colors.primary },
  faceAnalysisBannerBadge: {
    backgroundColor: Colors.primary, borderRadius: 20,
    paddingVertical: 4, paddingHorizontal: 10,
  },
  faceAnalysisBannerBadgeText: { fontSize: 11, fontWeight: '700', color: Colors.white },
  aiCardHighlight: { borderColor: Colors.primary, borderWidth: 1.5 },

  /* AI 피부 분석 */
  aiSection: {
    backgroundColor: Colors.white, marginTop: 12, marginBottom: 0, borderRadius: 18,
    padding: 18, gap: 14,
    shadowColor: '#FF6B9D', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1, shadowRadius: 12, elevation: 4,
    borderWidth: 1, borderColor: Colors.primaryLight,
  },
  aiSectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  aiSectionTitle: { fontSize: 15, fontWeight: '800', color: Colors.text },
  aiReportLink: { fontSize: 13, fontWeight: '600', color: Colors.primary },
  aiSectionDesc: { fontSize: 12, color: Colors.sub, marginTop: -4 },
  aiCards: { flexDirection: 'row', gap: 10 },
  aiCard: {
    flex: 1, backgroundColor: Colors.bg, borderRadius: 14, padding: 16,
    alignItems: 'center', gap: 6,
    borderWidth: 1, borderColor: Colors.border,
  },
  aiCardEmoji: { fontSize: 28 },
  aiCardLabel: { fontSize: 14, fontWeight: '700', color: Colors.text },
  aiCardDesc: { fontSize: 11, color: Colors.sub },

  /* 보관함 */
  vaultSection: {
    backgroundColor: Colors.white, marginTop: 12, borderRadius: 18,
    padding: 18, gap: 10,
    borderWidth: 1, borderColor: Colors.border,
    shadowColor: Colors.cardShadow,
    shadowOffset: { width: 0, height: 4 }, shadowOpacity: 1, shadowRadius: 12, elevation: 3,
  },
  vaultHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  vaultTitle: { fontSize: 15, fontWeight: '800', color: Colors.text },
  vaultItem: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 12, paddingHorizontal: 4,
    borderTopWidth: 1, borderTopColor: Colors.border,
  },
  vaultIconBox: {
    width: 44, height: 44, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  vaultItemTitle: { fontSize: 14, fontWeight: '700', color: Colors.text },
  vaultItemDesc: { fontSize: 12, color: Colors.sub },
  vaultBadgeOpen: {
    backgroundColor: '#E8F8F0', borderRadius: 10,
    paddingVertical: 4, paddingHorizontal: 10,
  },
  vaultBadgeOpenText: { fontSize: 12, fontWeight: '700', color: Colors.success },
  vaultBadgeLock: {
    backgroundColor: Colors.bg, borderRadius: 10,
    paddingVertical: 4, paddingHorizontal: 10,
    borderWidth: 1, borderColor: Colors.border,
  },
  vaultBadgeLockText: { fontSize: 12, fontWeight: '700', color: Colors.sub },
});
