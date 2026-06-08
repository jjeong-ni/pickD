import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  Alert, ActivityIndicator, Share, Platform,
} from 'react-native';
import { useEffect, useState } from 'react';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { Colors, HEADER_TOP } from '../constants/colors';
import { APP_URL } from '../constants/app';

// ─── 미션 목록 ─────────────────────────────────────────────────────────────

interface Mission {
  id: string;
  icon: string;
  title: string;
  desc: string;
  points: number;
  badge: string; // '1회' | '매일' | '반복'
}

const MISSIONS: Mission[] = [
  {
    id: 'signup',
    icon: 'gift-outline',
    title: '신규 가입 보너스',
    desc: '픽디 가입만 해도 바로 1,000pt!',
    points: 1000,
    badge: '1회',
  },
  {
    id: 'daily_attendance',
    icon: 'calendar-outline',
    title: '매일 출석체크',
    desc: '매일 앱에 접속하고 출석 체크하세요',
    points: 10,
    badge: '매일',
  },
  {
    id: 'weekly_attendance',
    icon: 'flame-outline',
    title: '7일 연속 출석 보너스',
    desc: '일주일 연속 출석 시 100pt 추가 지급!',
    points: 100,
    badge: '매주',
  },
  {
    id: 'first_post',
    icon: 'create-outline',
    title: '첫 게시물 등록',
    desc: '커뮤니티에 처음 글을 써보세요',
    points: 500,
    badge: '1회',
  },
  {
    id: 'referral',
    icon: 'people-outline',
    title: '친구 초대',
    desc: '친구가 가입하면 둘 모두에게 500pt!',
    points: 500,
    badge: '반복',
  },
  {
    id: 'comment',
    icon: 'chatbubble-outline',
    title: '댓글 쓰기',
    desc: '게시물에 댓글을 달아보세요 (일 1회)',
    points: 10,
    badge: '매일',
  },
  {
    id: 'vote',
    icon: 'checkmark-circle-outline',
    title: '퀴즈·찬반투표 참여',
    desc: '커뮤니티 투표에 참여하면 pt 지급',
    points: 10,
    badge: '매일',
  },
  {
    id: 'share',
    icon: 'share-social-outline',
    title: '공유하기',
    desc: '시술·기기 정보를 친구에게 공유 (일 1회)',
    points: 10,
    badge: '매일',
  },
];

// ─── 유틸 ──────────────────────────────────────────────────────────────────

function todayStr() {
  return new Date().toISOString().split('T')[0]; // YYYY-MM-DD
}

function getWeekRange() {
  const now = new Date();
  const day = now.getDay(); // 0=일,1=월...
  const mon = new Date(now);
  mon.setDate(now.getDate() - (day === 0 ? 6 : day - 1));
  const sun = new Date(mon);
  sun.setDate(mon.getDate() + 6);
  return {
    start: mon.toISOString().split('T')[0],
    end: sun.toISOString().split('T')[0],
  };
}

// ─── 메인 컴포넌트 ──────────────────────────────────────────────────────────

export default function MissionsScreen() {
  const { user, profile, fetchProfile } = useAuth();
  const [attendedToday, setAttendedToday] = useState(false);
  const [weekDays, setWeekDays] = useState(0);       // 이번 주 출석 일수
  const [weekBonusDone, setWeekBonusDone] = useState(false);
  const [signupDone, setSignupDone] = useState(false);
  const [firstPostDone, setFirstPostDone] = useState(false);
  const [checkingIn, setCheckingIn] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) loadStatus();
    else setLoading(false);
  }, [user]);

  const loadStatus = async () => {
    const today = todayStr();
    const { start, end } = getWeekRange();

    const [todayRes, weekRes, signupRes, postRes, weekBonusRes] = await Promise.all([
      // 오늘 출석 여부
      supabase.from('point_logs').select('id').eq('user_id', user!.id)
        .eq('reason', '매일 출석').gte('created_at', `${today}T00:00:00`).limit(1),
      // 이번 주 출석 일수 (중복 제거용)
      supabase.from('point_logs').select('created_at').eq('user_id', user!.id)
        .eq('reason', '매일 출석').gte('created_at', `${start}T00:00:00`).lte('created_at', `${end}T23:59:59`),
      // 신규가입 포인트 지급 여부
      supabase.from('point_logs').select('id').eq('user_id', user!.id)
        .eq('reason', '신규 가입').limit(1),
      // 첫 게시물 포인트 여부
      supabase.from('point_logs').select('id').eq('user_id', user!.id)
        .eq('reason', '첫 게시물').limit(1),
      // 이번 주 7일 보너스 여부
      supabase.from('point_logs').select('id').eq('user_id', user!.id)
        .eq('reason', '7일 연속 출석').gte('created_at', `${start}T00:00:00`).limit(1),
    ]);

    setAttendedToday((todayRes.data?.length ?? 0) > 0);

    // 이번 주 distinct 날짜 수
    const days = weekRes.data ?? [];
    const distinctDays = new Set(days.map((d: any) => d.created_at.split('T')[0]));
    setWeekDays(distinctDays.size);
    setWeekBonusDone((weekBonusRes.data?.length ?? 0) > 0);
    setSignupDone((signupRes.data?.length ?? 0) > 0);
    setFirstPostDone((postRes.data?.length ?? 0) > 0);
    setLoading(false);
  };

  const awardPoints = async (amount: number, reason: string) => {
    await supabase.from('point_logs').insert({ user_id: user!.id, amount, reason });
    await supabase.from('profiles').update({ points: (profile?.points ?? 0) + amount }).eq('user_id', user!.id);
    await fetchProfile(user!.id);
  };

  const handleAttendance = async () => {
    if (!user) { router.push('/(auth)/login' as any); return; }
    if (attendedToday) { Alert.alert('', '오늘 이미 출석했어요! 내일 다시 와주세요 😊'); return; }
    setCheckingIn(true);
    await awardPoints(10, '매일 출석');
    setAttendedToday(true);
    const newDays = weekDays + 1;
    setWeekDays(newDays);
    // 7일 연속 출석 보너스
    if (newDays >= 7 && !weekBonusDone) {
      await awardPoints(100, '7일 연속 출석');
      setWeekBonusDone(true);
      Alert.alert('🎉 7일 연속 출석!', '100pt 보너스가 지급되었어요!');
    } else {
      Alert.alert('출석 완료!', `10pt가 지급됐어요!\n이번 주 ${newDays}/7일 출석`);
    }
    setCheckingIn(false);
  };

  const handleReferral = async () => {
    const code = user?.id?.slice(0, 8) ?? 'PICKDI';
    const url = `${APP_URL}?ref=${code}`;
    const msg = `픽디에서 AI 피부 분석 받아보세요 🌸\n가입하면 둘 다 500pt!\n${url}`;
    try {
      if (Platform.OS === 'web') {
        await navigator.clipboard.writeText(msg);
        Alert.alert('복사 완료!', '초대 링크가 클립보드에 복사됐어요.\n친구에게 보내주세요!');
      } else {
        await Share.share({ message: msg });
      }
    } catch {
      Alert.alert('복사 완료!', `초대 코드: ${code}`);
    }
  };

  const handleMission = (m: Mission) => {
    if (m.id === 'daily_attendance') { handleAttendance(); return; }
    if (m.id === 'referral') { handleReferral(); return; }
    if (m.id === 'first_post' || m.id === 'comment' || m.id === 'vote') {
      router.push('/(tabs)/community' as any); return;
    }
    if (m.id === 'share') {
      router.push('/(tabs)/search' as any); return;
    }
    // 나머지 (signup, first_post done) → 안내
    Alert.alert(m.title, `${m.desc}\n\n이미 완료된 미션이에요!`);
  };

  const getMissionStatus = (m: Mission): 'done' | 'today' | 'active' => {
    if (m.id === 'signup') return signupDone ? 'done' : 'active';
    if (m.id === 'daily_attendance') return attendedToday ? 'today' : 'active';
    if (m.id === 'weekly_attendance') return weekBonusDone ? 'done' : 'active';
    if (m.id === 'first_post') return firstPostDone ? 'done' : 'active';
    return 'active';
  };

  const points = profile?.points ?? 0;
  const cashValue = Math.floor(points / 1000) * 100;

  if (!user) {
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
          <Text style={styles.title}>미션 & 포인트</Text>
          <View style={{ width: 32 }} />
        </LinearGradient>
        <View style={styles.center}>
          <Ionicons name="cash-outline" size={52} color={Colors.primary} style={{ marginBottom: 12 }} />
          <Text style={styles.loginTitle}>로그인하고 포인트 받기</Text>
          <Text style={styles.loginDesc}>미션을 완료하고 포인트를 모아보세요</Text>
          <TouchableOpacity style={styles.loginBtn} onPress={() => router.push('/(auth)/login' as any)}>
            <Text style={styles.loginBtnText}>로그인 / 회원가입</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* 헤더 */}
      <LinearGradient
        colors={['#FF6B9D', '#D473E8', '#9B6FE8']}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.back}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>미션 & 포인트</Text>
        <View style={{ width: 32 }} />
      </LinearGradient>

      {loading ? (
        <View style={styles.center}><ActivityIndicator color={Colors.primary} /></View>
      ) : (
        <ScrollView contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>

          {/* 포인트 현황 */}
          <LinearGradient
            colors={['#FF6B9D', '#D473E8', '#9B6FE8']}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={styles.pointHero}
          >
            <Text style={styles.pointLabel}>내 포인트</Text>
            <Text style={styles.pointValue}>{points.toLocaleString()} pt</Text>
            <View style={styles.cashRow}>
              <Text style={styles.cashText}>💵 현금 환산가치</Text>
              <Text style={styles.cashValue}>약 {cashValue.toLocaleString()}원</Text>
            </View>
            <Text style={styles.cashNote}>1,000pt = 100원 · 최소 10,000pt부터 환급 가능 (베타 종료 후 오픈)</Text>
          </LinearGradient>

          {/* 출석 체크 메인 버튼 */}
          <View style={styles.attendanceCard}>
            <View style={styles.attendanceLeft}>
              <Text style={styles.attendanceTitle}>
                {attendedToday ? '✅ 오늘 출석 완료' : '📅 오늘의 출석체크'}
              </Text>
              <Text style={styles.attendanceSub}>이번 주 {weekDays}/7일 출석</Text>
              {/* 진행 바 */}
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: `${(weekDays / 7) * 100}%` as any }]} />
              </View>
              <Text style={styles.attendanceBonus}>7일 완료 시 +100pt 보너스!</Text>
            </View>
            <TouchableOpacity
              style={[styles.attendanceBtn, attendedToday && styles.attendanceBtnDone]}
              onPress={handleAttendance}
              disabled={checkingIn}
            >
              {checkingIn
                ? <ActivityIndicator color={Colors.white} size="small" />
                : <Text style={styles.attendanceBtnText}>{attendedToday ? '완료' : '+10pt'}</Text>}
            </TouchableOpacity>
          </View>

          {/* 미션 목록 */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>전체 미션</Text>
          </View>

          {MISSIONS.map((m) => {
            const status = getMissionStatus(m);
            const isDone = status === 'done' || status === 'today';
            return (
              <TouchableOpacity
                key={m.id}
                style={[styles.missionCard, isDone && styles.missionCardDone]}
                onPress={() => handleMission(m)}
                activeOpacity={isDone ? 1 : 0.8}
              >
                <View style={styles.missionIcon}>
                  <Ionicons name={m.icon as any} size={26} color={Colors.primary} />
                </View>
                <View style={{ flex: 1, gap: 2 }}>
                  <View style={styles.missionTitleRow}>
                    <Text style={[styles.missionTitle, isDone && styles.missionTitleDone]}>{m.title}</Text>
                    <View style={[
                      styles.badgeWrap,
                      m.badge === '1회' ? styles.badgeOnce :
                      m.badge === '매일' ? styles.badgeDaily :
                      m.badge === '매주' ? styles.badgeWeekly :
                      styles.badgeRepeat,
                    ]}>
                      <Text style={styles.badgeText}>{m.badge}</Text>
                    </View>
                  </View>
                  <Text style={styles.missionDesc}>{m.desc}</Text>
                </View>
                <View style={styles.missionRight}>
                  {isDone ? (
                    <View style={styles.doneTag}>
                      <Text style={styles.doneTagText}>완료</Text>
                    </View>
                  ) : (
                    <>
                      <Text style={styles.missionPts}>+{m.points.toLocaleString()}</Text>
                      <Text style={styles.missionPtLabel}>pt</Text>
                    </>
                  )}
                </View>
              </TouchableOpacity>
            );
          })}

          {/* 포인트 환급 안내 */}
          <View style={styles.cashoutCard}>
            <Text style={styles.cashoutTitle}>💰 포인트 현금화</Text>
            <Text style={styles.cashoutDesc}>
              모은 포인트는 현금으로 환급할 수 있어요.{'\n'}
              1,000pt = 100원 · 최소 출금: 10,000pt (= 1,000원)
            </Text>
            <View style={styles.cashoutBadge}>
              <Text style={styles.cashoutBadgeText}>🚀 베타 종료 후 오픈</Text>
            </View>
            <View style={styles.cashoutCurrent}>
              <Text style={styles.cashoutCurrentLabel}>현재 내 포인트로</Text>
              <Text style={styles.cashoutCurrentValue}>{cashValue.toLocaleString()}원 출금 가능</Text>
            </View>
          </View>

          {/* 포인트 적립 이력 */}
          <TouchableOpacity
            style={styles.historyBtn}
            onPress={() => router.push('/point-logs' as any)}
          >
            <Text style={styles.historyBtnText}>📋 포인트 적립 이력 보기</Text>
            <Text style={styles.historyBtnArrow}>›</Text>
          </TouchableOpacity>

        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: HEADER_TOP, paddingHorizontal: 16, paddingBottom: 16,
  },
  back: { fontSize: 24, color: Colors.white, width: 32 },
  title: { fontSize: 17, fontWeight: '700', color: Colors.white },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24 },

  loginTitle: { fontSize: 20, fontWeight: '700', color: Colors.text },
  loginDesc: { fontSize: 14, color: Colors.sub, textAlign: 'center' },
  loginBtn: {
    marginTop: 8, backgroundColor: Colors.primary, paddingVertical: 14,
    paddingHorizontal: 32, borderRadius: 14,
  },
  loginBtnText: { color: Colors.white, fontSize: 15, fontWeight: '700' },

  pointHero: {
    padding: 28,
    alignItems: 'center', gap: 6,
  },
  pointLabel: { fontSize: 13, color: 'rgba(255,255,255,0.8)', fontWeight: '600' },
  pointValue: { fontSize: 40, fontWeight: '900', color: Colors.white, letterSpacing: -1 },
  cashRow: {
    flexDirection: 'row', gap: 8, alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 20,
    paddingVertical: 6, paddingHorizontal: 14, marginTop: 4,
  },
  cashText: { fontSize: 12, color: 'rgba(255,255,255,0.9)', fontWeight: '600' },
  cashValue: { fontSize: 14, color: Colors.white, fontWeight: '800' },
  cashNote: { fontSize: 11, color: 'rgba(255,255,255,0.7)', textAlign: 'center', lineHeight: 16, marginTop: 4 },

  attendanceCard: {
    flexDirection: 'row', alignItems: 'center', gap: 16,
    backgroundColor: Colors.white, margin: 16, marginBottom: 8,
    borderRadius: 16, padding: 18,
    shadowColor: '#FF6B9D', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1, shadowRadius: 12, elevation: 3,
    borderWidth: 1, borderColor: Colors.primaryLight,
  },
  attendanceLeft: { flex: 1, gap: 6 },
  attendanceTitle: { fontSize: 15, fontWeight: '700', color: Colors.text },
  attendanceSub: { fontSize: 12, color: Colors.sub },
  progressBar: {
    height: 6, backgroundColor: Colors.border, borderRadius: 3, overflow: 'hidden',
  },
  progressFill: { height: 6, backgroundColor: Colors.primary, borderRadius: 3 },
  attendanceBonus: { fontSize: 11, color: Colors.primary, fontWeight: '600' },
  attendanceBtn: {
    backgroundColor: Colors.primary, borderRadius: 12,
    paddingVertical: 14, paddingHorizontal: 16, alignItems: 'center', minWidth: 64,
  },
  attendanceBtnDone: { backgroundColor: Colors.success },
  attendanceBtnText: { color: Colors.white, fontSize: 14, fontWeight: '800' },

  sectionHeader: {
    paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8,
  },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: Colors.text },

  missionCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: Colors.white, marginHorizontal: 16, marginBottom: 8,
    borderRadius: 14, padding: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04, shadowRadius: 6, elevation: 1,
  },
  missionCardDone: { opacity: 0.6 },
  missionIcon: {
    width: 52, height: 52, borderRadius: 14, backgroundColor: Colors.bg,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  missionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  missionTitle: { fontSize: 14, fontWeight: '700', color: Colors.text },
  missionTitleDone: { color: Colors.sub },
  missionDesc: { fontSize: 12, color: Colors.sub, lineHeight: 17 },
  missionRight: { alignItems: 'flex-end', gap: 2, flexShrink: 0 },
  missionPts: { fontSize: 17, fontWeight: '800', color: Colors.primary },
  missionPtLabel: { fontSize: 11, color: Colors.primary, fontWeight: '600' },
  doneTag: {
    backgroundColor: '#E8F8EF', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4,
  },
  doneTagText: { fontSize: 12, fontWeight: '700', color: Colors.success },

  badgeWrap: {
    borderRadius: 10, paddingHorizontal: 7, paddingVertical: 2,
  },
  badgeOnce: { backgroundColor: '#FFF0F5' },
  badgeDaily: { backgroundColor: '#F0F4FF' },
  badgeWeekly: { backgroundColor: '#FFF8E1' },
  badgeRepeat: { backgroundColor: '#F0FFF4' },
  badgeText: { fontSize: 10, fontWeight: '700', color: Colors.sub },

  cashoutCard: {
    backgroundColor: Colors.white, margin: 16, borderRadius: 16, padding: 20, gap: 10,
    borderWidth: 1, borderColor: Colors.border,
  },
  cashoutTitle: { fontSize: 16, fontWeight: '700', color: Colors.text },
  cashoutDesc: { fontSize: 13, color: Colors.sub, lineHeight: 20 },
  cashoutBadge: {
    backgroundColor: '#FFF8E1', alignSelf: 'flex-start',
    borderRadius: 20, paddingHorizontal: 12, paddingVertical: 4,
  },
  cashoutBadgeText: { fontSize: 12, fontWeight: '700', color: '#F57F17' },
  cashoutCurrent: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    borderTopWidth: 1, borderTopColor: Colors.border, paddingTop: 10,
  },
  cashoutCurrentLabel: { fontSize: 13, color: Colors.sub },
  cashoutCurrentValue: { fontSize: 15, fontWeight: '800', color: Colors.primary },

  historyBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: Colors.white, marginHorizontal: 16, marginBottom: 8,
    borderRadius: 14, padding: 16,
    borderWidth: 1, borderColor: Colors.border,
  },
  historyBtnText: { fontSize: 14, fontWeight: '600', color: Colors.text },
  historyBtnArrow: { fontSize: 18, color: Colors.sub },
});
