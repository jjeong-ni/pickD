import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, Modal, Platform,
} from 'react-native';
import { router } from 'expo-router';
import { useState } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../hooks/useAuth';
import { Colors } from '../../constants/colors';
import { GlassCard } from '../../components/GlassCard';

export default function MypageScreen() {
  const { user, profile, signOut } = useAuth();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

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
        <GlassCard style={styles.avatarGlass} intensity="low">
          <Ionicons name="person" size={38} color="rgba(255,255,255,0.92)" />
        </GlassCard>
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

      {/* 피부 프로필 설정 유도 */}
      {!profile?.skin_type && (
        <TouchableOpacity style={styles.profileSetupBanner} onPress={() => router.push('/profile-setup' as any)}>
          <Text style={styles.profileSetupTitle}>✨ 피부 프로필을 완성해보세요</Text>
          <Text style={styles.profileSetupDesc}>맞춤 시술·기기 추천을 받을 수 있어요 →</Text>
        </TouchableOpacity>
      )}

      {/* 내 피부 정보 */}
      {(profile?.skin_type || profile?.concerns?.length) ? (
        <View style={styles.skinSummary}>
          <Text style={styles.sectionLabel}>내 피부 정보</Text>
          {profile?.concerns && profile.concerns.length > 0 && (
            <View style={styles.concernRow}>
              {profile.concerns.map((c: string) => (
                <View key={c} style={styles.concernChip}>
                  <Text style={styles.concernText}>{c}</Text>
                </View>
              ))}
            </View>
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
      ) : null}

      {/* 미션 & 포인트 */}
      {user && (
        <TouchableOpacity style={styles.missionBanner} onPress={() => router.push('/missions' as any)} activeOpacity={0.85}>
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
          style={styles.faceAnalysisBanner}
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
      <View style={styles.aiSection}>
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
    paddingTop: Platform.OS === 'web' ? 60 : 56,
    overflow: 'hidden',
  },
  profileOrb: {
    position: 'absolute', width: 200, height: 200, borderRadius: 100,
    backgroundColor: 'rgba(255,255,255,0.08)', top: -60, right: -40,
  },
  avatarGlass: {
    width: 80, height: 80, borderRadius: 40,
    alignItems: 'center', justifyContent: 'center', marginBottom: 14,
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
  skinSummary: {
    backgroundColor: Colors.white, marginTop: 8, padding: 16, paddingHorizontal: 20,
  },
  sectionLabel: { fontSize: 12, fontWeight: '700', color: Colors.sub, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 },
  concernRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
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

  /* 미션 배너 */
  missionBanner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: Colors.white, marginHorizontal: 16, marginTop: 12,
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
    backgroundColor: '#FFF5F9', marginHorizontal: 16, marginTop: 12,
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
    backgroundColor: Colors.white, margin: 16, borderRadius: 18,
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
});
