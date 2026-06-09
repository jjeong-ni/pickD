import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  FlatList, ActivityIndicator, Image, Platform, Alert, Modal,
} from 'react-native';
import { useEffect, useRef, useState } from 'react';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../../lib/supabase';
import { Colors, HEADER_TOP } from '../../constants/colors';
import { useAuth } from '../../hooks/useAuth';
import { useResponsive } from '../../hooks/useResponsive';
import { GlassCard } from '../../components/GlassCard';
import { Treatment, Device } from '../../types';
import { REPORT_COST } from '../../constants/app';

const KAKAO_JS_KEY = process.env.EXPO_PUBLIC_KAKAO_JS_KEY ?? '';

type PairBundle = {
  concern: string;
  icon: string;
  color: string;
  treatment: Treatment | null;
  device: Device | null;
};

const CONCERN_PAIRS: { concern: string; icon: string; color: string; treatmentCat: string; deviceCat: string }[] = [
  { concern: '리프팅·탄력', treatmentCat: '리프팅', deviceCat: '리프팅', icon: 'trending-up-outline', color: '#FF6B9D' },
  { concern: '미백·잡티', treatmentCat: '레이저', deviceCat: 'LED', icon: 'sunny-outline', color: '#FFB347' },
  { concern: '수분·보습', treatmentCat: '스킨케어', deviceCat: '초음파', icon: 'water-outline', color: '#5B9BD5' },
  { concern: '주름·모공', treatmentCat: '보톡스', deviceCat: 'RF', icon: 'medical-outline', color: '#9B6FE8' },
];

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

// Mini Kakao map for home screen (web only)
function HomeClinicMap() {
  const mapRef = useRef<any>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready || !mapRef.current) return;
    const script = document.createElement('script');
    script.src = `//dapi.kakao.com/v2/maps/sdk.js?appkey=${KAKAO_JS_KEY}&libraries=services&autoload=false`;
    script.async = true;
    script.onload = () => {
      (window as any).kakao.maps.load(() => {
        const kakao = (window as any).kakao;
        const init = (lat: number, lng: number) => {
          const center = new kakao.maps.LatLng(lat, lng);
          const map = new kakao.maps.Map(mapRef.current, { center, level: 5 });
          // Blue dot for current location
          new kakao.maps.CustomOverlay({
            map,
            position: center,
            content: '<div style="width:14px;height:14px;background:#4A90E2;border:2.5px solid #fff;border-radius:50%;box-shadow:0 2px 6px rgba(0,0,0,0.3)"></div>',
          });
          const ps = new kakao.maps.services.Places();
          ps.keywordSearch('피부과', (data: any[], status: string) => {
            if (status !== kakao.maps.services.Status.OK) return;
            data.slice(0, 8).forEach((place) => {
              const marker = new kakao.maps.Marker({
                map,
                position: new kakao.maps.LatLng(place.y, place.x),
                title: place.place_name,
              });
              const iw = new kakao.maps.InfoWindow({ content: `<div style="padding:4px 8px;font-size:12px;font-weight:700">${place.place_name}</div>` });
              kakao.maps.event.addListener(marker, 'click', () => iw.open(map, marker));
            });
          }, { location: center, radius: 2000 });
        };
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            (pos) => init(pos.coords.latitude, pos.coords.longitude),
            () => init(37.5665, 126.9780),
          );
        } else {
          init(37.5665, 126.9780);
        }
      });
    };
    document.head.appendChild(script);
    return () => { try { document.head.removeChild(script); } catch {} };
  }, [ready]);

  if (Platform.OS !== 'web') return null;

  return (
    // @ts-ignore
    <div ref={mapRef} style={{ width: '100%', height: 220, borderRadius: 18, overflow: 'hidden' }} />
  );
}

export default function HomeScreen() {
  const { user, profile, fetchProfile } = useAuth();
  const { cardWidth, hPad } = useResponsive();
  const [treatments, setTreatments] = useState<Treatment[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [recommended, setRecommended] = useState<Treatment[]>([]);
  const [pairs, setPairs] = useState<PairBundle[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const [reportLoading, setReportLoading] = useState(false);
  const [signupPopup, setSignupPopup] = useState<{ nickname: string } | null>(null);

  useEffect(() => { fetchData(); checkSignupPopup(); }, []);
  useEffect(() => { if (profile?.skin_type) fetchRecommended(); }, [profile]);

  const checkSignupPopup = async () => {
    const raw = await AsyncStorage.getItem('signup_popup');
    if (raw) {
      await AsyncStorage.removeItem('signup_popup');
      try { setSignupPopup(JSON.parse(raw)); } catch {}
    }
  };

  const fetchData = async () => {
    try {
    const [t, d] = await Promise.all([
      supabase.from('treatments').select('*').limit(6).order('rating', { ascending: false }),
      supabase.from('devices').select('*').limit(6).order('rating', { ascending: false }),
    ]);
    if (t.error || d.error) { setFetchError(true); setLoading(false); return; }
    const tData: Treatment[] = t.data ?? [];
    const dData: Device[] = d.data ?? [];
    setTreatments(tData);
    setDevices(dData);

    const built: PairBundle[] = [];
    for (const p of CONCERN_PAIRS) {
      const treatment = tData.find((x) => x.category === p.treatmentCat) ?? null;
      const device = dData.find((x) => x.category === p.deviceCat) ?? null;
      if (treatment || device) {
        built.push({ concern: p.concern, icon: p.icon, color: p.color, treatment, device });
      }
    }
    setPairs(built);
    setLoading(false);
    } catch (e) {
      console.error('fetchData error:', e);
      setFetchError(true);
      setLoading(false);
    }
  };

  const fetchRecommended = async () => {
    if (!profile?.concerns?.length) return;
    const concern = profile.concerns[0];
    const { data } = await supabase
      .from('treatments').select('*').contains('tags', [concern])
      .order('rating', { ascending: false }).limit(5);
    if (data && data.length > 0) setRecommended(data);
  };

  const handleGetReport = async () => {
    if (!user || !profile) {
      router.push('/(auth)/login' as any);
      return;
    }
    setReportLoading(true);
    // 이미 구매한 경우 포인트 차감 없이 바로 열기
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
    const { data, error } = await supabase.rpc('deduct_points', {
      p_user_id: user.id,
      p_amount: REPORT_COST,
      p_reason: '맞춤 피부 분석 보고서',
    });
    if (error || !data?.success) {
      setReportLoading(false);
      if (data?.error === 'insufficient_points') {
        Alert.alert('포인트 부족', `보고서를 받으려면 ${REPORT_COST}pt가 필요해요.\n현재 보유: ${data.current_points}pt`, [{ text: '확인' }]);
      } else {
        Alert.alert('오류', '포인트 차감 중 오류가 발생했어요. 다시 시도해주세요.');
      }
      return;
    }
    await fetchProfile(user.id);
    setReportLoading(false);
    router.push('/skin-report' as any);
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={Colors.primary} size="large" />
      </View>
    );
  }

  if (fetchError) {
    return (
      <View style={styles.center}>
        <Text style={{ fontSize: 36 }}>⚠️</Text>
        <Text style={{ fontSize: 15, color: Colors.sub, marginTop: 12, textAlign: 'center' }}>
          데이터를 불러오지 못했어요{'\n'}네트워크를 확인 후 다시 시도해주세요
        </Text>
        <TouchableOpacity
          onPress={() => { setFetchError(false); setLoading(true); fetchData(); }}
          style={{ marginTop: 20, paddingVertical: 12, paddingHorizontal: 28, backgroundColor: Colors.primary, borderRadius: 12 }}
        >
          <Text style={{ color: '#fff', fontWeight: '700' }}>다시 시도</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <>
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* 그라데이션 헤더 */}
      <LinearGradient
        colors={['#FF6B9D', '#D473E8', '#9B6FE8']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <View style={styles.headerOrb1} />
        <View style={styles.headerOrb2} />

        {/* 상단 인사 + 포인트 */}
        <View style={styles.headerTop}>
          <View style={styles.headerLeft}>
            {/* 프로필 사진 */}
            {profile?.avatar_url ? (
              <Image source={{ uri: profile.avatar_url }} style={styles.headerAvatar} resizeMode="cover" />
            ) : (
              <View style={styles.headerAvatarPlaceholder}>
                <Ionicons name="person" size={18} color="rgba(255,255,255,0.85)" />
              </View>
            )}
            <View>
              <Text style={styles.greeting}>안녕하세요 👋</Text>
              <Text style={styles.nickname}>
                {profile?.nickname || user?.email?.split('@')[0] || (user ? '사용자' : '방문자')} 님
              </Text>
            </View>
          </View>
          <View style={styles.headerRight}>
            {user && (
              <TouchableOpacity onPress={() => router.push('/missions' as any)} activeOpacity={0.8}>
                <GlassCard style={styles.missionBadge} intensity="low">
                  <Text style={styles.missionEmoji}>🎯</Text>
                  <Text style={styles.missionLabel}>미션</Text>
                </GlassCard>
              </TouchableOpacity>
            )}
            {user && (
              <GlassCard style={styles.pointBadge} intensity="low">
                <Text style={styles.pointText}>🪙 {profile?.points ?? 0}</Text>
              </GlassCard>
            )}
          </View>
        </View>

        {/* 배너 1: 피부 타입 추천 */}
        {profile?.skin_type ? (
          <TouchableOpacity onPress={() => router.push('/search' as any)} activeOpacity={0.85}>
            <GlassCard style={styles.banner} intensity="low">
              <Text style={styles.bannerLabel}>✨ 내 피부 타입 · {profile.skin_type}</Text>
              <Text style={styles.bannerValue}>
                {profile.concerns?.length
                  ? `${profile.concerns.join(', ')} 맞춤 추천 →`
                  : '맞춤 시술·기기 보러가기 →'}
              </Text>
            </GlassCard>
          </TouchableOpacity>
        ) : user && !profile?.skin_type ? (
          <TouchableOpacity onPress={() => router.push('/profile-setup' as any)} activeOpacity={0.85}>
            <GlassCard style={styles.banner} intensity="low">
              <Text style={styles.bannerLabel}>✨ 피부 프로필 완성하기</Text>
              <Text style={styles.bannerValue}>맞춤 시술·기기 추천을 받아보세요 →</Text>
            </GlassCard>
          </TouchableOpacity>
        ) : !user ? (
          <TouchableOpacity onPress={() => router.push('/(auth)/signup' as any)} activeOpacity={0.85}>
            <GlassCard style={styles.banner} intensity="low">
              <Text style={styles.bannerLabel}>🌸 AI 맞춤 추천</Text>
              <Text style={styles.bannerValue}>무료 가입으로 내 피부 분석 받기 →</Text>
            </GlassCard>
          </TouchableOpacity>
        ) : null}

        {/* 배너 2: 맞춤 피부 분석 보고서 */}
        <TouchableOpacity onPress={handleGetReport} activeOpacity={0.85} disabled={reportLoading} style={{ marginTop: 10 }}>
          <GlassCard style={styles.reportBanner} intensity="low">
            <View style={styles.reportBannerInner}>
              <View style={styles.reportBannerLeft}>
                <View style={styles.reportBannerBadge}>
                  <Text style={styles.reportBannerBadgeText}>베타 990pt</Text>
                </View>
                <Text style={styles.reportBannerTitle}>📋 맞춤 피부 분석 보고서</Text>
                <Text style={styles.reportBannerDesc}>AI가 분석한 나만의 피부 솔루션</Text>
              </View>
              {reportLoading
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.reportBannerArrow}>›</Text>}
            </View>
          </GlassCard>
        </TouchableOpacity>
      </LinearGradient>

      {/* 내 피부타입 별 추천 */}
      {recommended.length > 0 && profile?.concerns?.[0] && (
        <Section title={`${profile.concerns[0]} 맞춤 추천`} onMore={() => router.push('/search' as any)} hPad={hPad}>
          <FlatList
            horizontal data={recommended} keyExtractor={(i) => i.id}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingLeft: hPad, paddingRight: hPad, gap: 12 }}
            renderItem={({ item }) => (
              <TreatmentCard item={item} width={cardWidth} onPress={() => router.push(`/treatment/${item.id}` as any)} />
            )}
          />
        </Section>
      )}

      {/* 시술 + 홈케어 기기 묶음 추천 */}
      {pairs.length > 0 && (
        <Section title="시술 + 홈케어 기기 함께 추천" onMore={() => router.push('/search' as any)} hPad={hPad}>
          <FlatList
            horizontal data={pairs} keyExtractor={(i) => i.concern}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingLeft: hPad, paddingRight: hPad, gap: 12 }}
            renderItem={({ item }) => (
              <PairCard bundle={item} width={Math.min(cardWidth * 1.4, 260)} />
            )}
          />
        </Section>
      )}

      {/* 맞춤 피부 분석 보고서 섹션 */}
      <View style={[styles.reportSection, { marginHorizontal: hPad }]}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>맞춤 피부 분석 보고서</Text>
        </View>
        <TouchableOpacity onPress={handleGetReport} activeOpacity={0.85} disabled={reportLoading}>
          <View style={styles.reportCard}>
            <View style={styles.reportCardLeft}>
              <Text style={styles.reportCardEmoji}>📋</Text>
              <View style={styles.reportCardText}>
                <Text style={styles.reportCardTitle}>AI 피부 분석 보고서</Text>
                <Text style={styles.reportCardDesc}>피부 타입·고민·얼굴형을 종합{'\n'}분석한 나만의 맞춤 리포트</Text>
                <View style={styles.reportCardBadge}>
                  <Text style={styles.reportCardBadgeText}>베타 한정 990pt</Text>
                </View>
              </View>
            </View>
            {reportLoading
              ? <ActivityIndicator color={Colors.primary} />
              : <Ionicons name="chevron-forward" size={22} color={Colors.primary} />}
          </View>
        </TouchableOpacity>
      </View>

      {/* 인기 기기 */}
      <Section title="인기 기기" onMore={() => router.push('/search' as any)} hPad={hPad}>
        {devices.length > 0 ? (
          <FlatList
            horizontal data={devices} keyExtractor={(i) => i.id}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingLeft: hPad, paddingRight: hPad, gap: 12 }}
            renderItem={({ item }) => (
              <DeviceCard item={item} width={cardWidth} onPress={() => router.push(`/device/${item.id}` as any)} />
            )}
          />
        ) : <Text style={styles.emptySection}>데이터를 불러오는 중이에요</Text>}
      </Section>

      {/* 인기 시술 */}
      <Section title="인기 시술" onMore={() => router.push('/search' as any)} hPad={hPad}>
        {treatments.length > 0 ? (
          <FlatList
            horizontal data={treatments} keyExtractor={(i) => i.id}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingLeft: hPad, paddingRight: hPad, gap: 12 }}
            renderItem={({ item }) => (
              <TreatmentCard item={item} width={cardWidth} onPress={() => router.push(`/treatment/${item.id}` as any)} />
            )}
          />
        ) : <Text style={styles.emptySection}>데이터를 불러오는 중이에요</Text>}
      </Section>

      {/* 내 주변 클리닉 */}
      <View style={{ marginTop: 28 }}>
        <View style={[styles.sectionHeader, { paddingHorizontal: hPad }]}>
          <Text style={styles.sectionTitle}>내 주변 클리닉</Text>
          <TouchableOpacity onPress={() => router.push('/clinic-map' as any)}>
            <Text style={styles.sectionMore}>더보기</Text>
          </TouchableOpacity>
        </View>
        <View style={{ paddingHorizontal: hPad }}>
          {Platform.OS === 'web' ? (
            <>
              <HomeClinicMap />
              <TouchableOpacity
                style={styles.clinicMoreBtn}
                onPress={() => router.push('/clinic-map' as any)}
                activeOpacity={0.85}
              >
                <Text style={styles.clinicMoreBtnText}>📍 지도 전체 화면으로 보기 →</Text>
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity
              style={styles.clinicNativeBanner}
              onPress={() => router.push('/clinic-map' as any)}
              activeOpacity={0.85}
            >
              <Text style={styles.clinicNativeEmoji}>📍</Text>
              <View style={styles.clinicNativeText}>
                <Text style={styles.clinicNativeTitle}>내 주변 피부과·클리닉 찾기</Text>
                <Text style={styles.clinicNativeDesc}>현재 위치 기반으로 주변 클리닉 보기</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={Colors.primary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <View style={{ height: 32 }} />
    </ScrollView>

    {/* 회원가입 완료 1000pt 팝업 */}
    <Modal
      visible={!!signupPopup}
      transparent
      animationType="fade"
      statusBarTranslucent
    >
      <LinearGradient
        colors={['#FF6B9D', '#D473E8', '#9B6FE8']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.popupOverlay}
      >
        <View style={styles.popupCard}>
          <Text style={styles.popupEmoji}>🎉</Text>
          <View style={styles.popupMissionBadge}>
            <Text style={styles.popupMissionText}>✅ 회원가입 미션달성!</Text>
          </View>
          <Text style={styles.popupTitle}>환영해요, {signupPopup?.nickname}님!</Text>
          <View style={styles.popupPointBadge}>
            <Text style={styles.popupPointText}>🪙 1,000 pt 지급!</Text>
          </View>
          <Text style={styles.popupSub}>포인트로 AI 피부 분석 보고서를 받아보세요</Text>
          <TouchableOpacity style={styles.popupBtn} onPress={() => setSignupPopup(null)}>
            <Text style={styles.popupBtnText}>픽디 시작하기 →</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    </Modal>
    </>
  );
}

function Section({ title, onMore, children, hPad = 20 }: { title: string; onMore: () => void; children: React.ReactNode; hPad?: number }) {
  return (
    <View style={{ marginTop: 28 }}>
      <View style={[styles.sectionHeader, { paddingHorizontal: hPad }]}>
        <Text style={styles.sectionTitle}>{title}</Text>
        <TouchableOpacity onPress={onMore}>
          <Text style={styles.sectionMore}>더보기</Text>
        </TouchableOpacity>
      </View>
      {children}
    </View>
  );
}

function TreatmentCard({ item, width, onPress }: { item: Treatment; width?: number; onPress: () => void }) {
  return (
    <TouchableOpacity style={[styles.card, width ? { width } : {}]} onPress={onPress} activeOpacity={0.85}>
      <View style={styles.cardImage}>
        {item.image_url
          ? <Image source={{ uri: item.image_url }} style={StyleSheet.absoluteFill} resizeMode="cover" />
          : <Ionicons name={(TREATMENT_ICON[item.category] ?? 'medical-outline') as any} size={38} color={Colors.primary} />}
        <View style={styles.cardBadge}>
          <Text style={styles.cardBadgeText}>{item.category}</Text>
        </View>
      </View>
      <View style={styles.cardBody}>
        <Text style={styles.cardTitle} numberOfLines={1}>{item.name}</Text>
        <Text style={styles.cardPrice}>
          {(item.price_min ?? 0).toLocaleString()}~{(item.price_max ?? 0).toLocaleString()}원
        </Text>
        <Text style={styles.cardRating}>⭐ {(item.rating ?? 0).toFixed(1)} ({item.review_count ?? 0})</Text>
      </View>
    </TouchableOpacity>
  );
}

function PairCard({ bundle, width }: { bundle: PairBundle; width?: number }) {
  return (
    <View style={[styles.pairCard, width ? { width } : {}]}>
      <View style={[styles.pairHeader, { backgroundColor: bundle.color + '18' }]}>
        <Ionicons name={bundle.icon as any} size={18} color={bundle.color} />
        <Text style={[styles.pairConcern, { color: bundle.color }]}>{bundle.concern}</Text>
      </View>
      {bundle.treatment && (
        <TouchableOpacity
          style={styles.pairRow}
          onPress={() => router.push(`/treatment/${bundle.treatment!.id}` as any)}
          activeOpacity={0.8}
        >
          <View style={[styles.pairRowIcon, { backgroundColor: '#FFE8F0' }]}>
            <Ionicons name={(TREATMENT_ICON[bundle.treatment.category] ?? 'medical-outline') as any} size={18} color={Colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.pairRowLabel}>병원 시술</Text>
            <Text style={styles.pairRowName} numberOfLines={1}>{bundle.treatment.name}</Text>
            <Text style={styles.pairRowPrice}>{bundle.treatment.price_min.toLocaleString()}원~</Text>
          </View>
        </TouchableOpacity>
      )}
      {bundle.treatment && bundle.device && (
        <View style={styles.pairDivider}>
          <View style={styles.pairDividerLine} />
          <Text style={styles.pairDividerText}>또는 집에서</Text>
          <View style={styles.pairDividerLine} />
        </View>
      )}
      {bundle.device && (
        <TouchableOpacity
          style={styles.pairRow}
          onPress={() => router.push(`/device/${bundle.device!.id}` as any)}
          activeOpacity={0.8}
        >
          <View style={[styles.pairRowIcon, { backgroundColor: '#EEE8FF' }]}>
            <Ionicons name={(DEVICE_ICON[bundle.device.category] ?? 'hardware-chip-outline') as any} size={18} color="#9B6FE8" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.pairRowLabel}>홈케어 기기</Text>
            <Text style={styles.pairRowName} numberOfLines={1}>{bundle.device.name}</Text>
            <Text style={styles.pairRowPrice}>{bundle.device.price.toLocaleString()}원</Text>
          </View>
        </TouchableOpacity>
      )}
    </View>
  );
}

function DeviceCard({ item, width, onPress }: { item: Device; width?: number; onPress: () => void }) {
  return (
    <TouchableOpacity style={[styles.card, width ? { width } : {}]} onPress={onPress} activeOpacity={0.85}>
      <View style={[styles.cardImage, { backgroundColor: '#EEE8FF' }]}>
        {item.image_url
          ? <Image source={{ uri: item.image_url }} style={StyleSheet.absoluteFill} resizeMode="cover" />
          : <Ionicons name={(DEVICE_ICON[item.category] ?? 'hardware-chip-outline') as any} size={38} color="#9B6FE8" />}
        <View style={[styles.cardBadge, { backgroundColor: 'rgba(155,111,232,0.85)' }]}>
          <Text style={styles.cardBadgeText}>{item.brand}</Text>
        </View>
      </View>
      <View style={styles.cardBody}>
        <Text style={styles.cardTitle} numberOfLines={1}>{item.name}</Text>
        <Text style={styles.cardPrice}>{(item.price ?? 0).toLocaleString()}원</Text>
        <Text style={styles.cardRating}>⭐ {(item.rating ?? 0).toFixed(1)} ({item.review_count ?? 0})</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.bg },

  // 헤더 (그라데이션) — 더 길게
  header: {
    paddingTop: HEADER_TOP,
    paddingHorizontal: 20, paddingBottom: 28,
    overflow: 'hidden',
  },
  headerOrb1: {
    position: 'absolute', width: 200, height: 200, borderRadius: 100,
    backgroundColor: 'rgba(255,255,255,0.08)', top: -60, right: -40,
  },
  headerOrb2: {
    position: 'absolute', width: 130, height: 130, borderRadius: 65,
    backgroundColor: 'rgba(155,111,232,0.15)', bottom: -20, left: -20,
  },
  headerTop: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 20,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerAvatar: { width: 40, height: 40, borderRadius: 20, borderWidth: 2, borderColor: 'rgba(255,255,255,0.6)' },
  headerAvatarPlaceholder: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.4)',
    alignItems: 'center', justifyContent: 'center',
  },
  greeting: { fontSize: 12, color: 'rgba(255,255,255,0.75)', fontWeight: '500' },
  nickname: { fontSize: 18, fontWeight: '800', color: '#fff', marginTop: 1 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  missionBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 14 },
  missionEmoji: { fontSize: 16 },
  missionLabel: { fontSize: 12, fontWeight: '700', color: 'rgba(255,255,255,0.9)' },
  pointBadge: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 14 },
  pointText: { fontSize: 13, fontWeight: '700', color: 'rgba(255,255,255,0.9)' },

  // 배너
  banner: { padding: 16, gap: 6 },
  bannerLabel: { fontSize: 12, fontWeight: '600', color: 'rgba(255,255,255,0.75)' },
  bannerValue: { fontSize: 16, fontWeight: '700', color: '#fff' },

  // 보고서 배너 (헤더 내)
  reportBanner: { padding: 14 },
  reportBannerInner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  reportBannerLeft: { gap: 4, flex: 1 },
  reportBannerBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 8,
    paddingVertical: 2, paddingHorizontal: 8, marginBottom: 2,
  },
  reportBannerBadgeText: { fontSize: 10, fontWeight: '800', color: '#fff' },
  reportBannerTitle: { fontSize: 14, fontWeight: '800', color: '#fff' },
  reportBannerDesc: { fontSize: 12, color: 'rgba(255,255,255,0.75)' },
  reportBannerArrow: { fontSize: 22, color: 'rgba(255,255,255,0.7)', marginLeft: 8 },

  // 보고서 섹션 카드
  reportSection: { marginTop: 28 },
  reportCard: {
    backgroundColor: Colors.white, borderRadius: 18, padding: 18,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderWidth: 1.5, borderColor: Colors.primaryLight,
    shadowColor: '#FF6B9D', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12, shadowRadius: 12, elevation: 3,
  },
  reportCardLeft: { flexDirection: 'row', alignItems: 'center', gap: 14, flex: 1 },
  reportCardEmoji: { fontSize: 40 },
  reportCardText: { gap: 4, flex: 1 },
  reportCardTitle: { fontSize: 15, fontWeight: '800', color: Colors.text },
  reportCardDesc: { fontSize: 12, color: Colors.sub, lineHeight: 18 },
  reportCardBadge: {
    alignSelf: 'flex-start', backgroundColor: Colors.primaryLight,
    borderRadius: 8, paddingVertical: 3, paddingHorizontal: 8, marginTop: 2,
  },
  reportCardBadgeText: { fontSize: 11, fontWeight: '800', color: Colors.primary },

  // 섹션
  sectionHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 14,
  },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: Colors.text },
  sectionMore: { fontSize: 13, color: Colors.primary, fontWeight: '700' },
  emptySection: { paddingHorizontal: 20, fontSize: 14, color: Colors.sub },

  // 클리닉 섹션
  clinicMoreBtn: {
    marginTop: 12, paddingVertical: 12, borderRadius: 12,
    backgroundColor: Colors.primaryLight, alignItems: 'center',
  },
  clinicMoreBtnText: { fontSize: 14, fontWeight: '700', color: Colors.primary },
  clinicNativeBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: Colors.white, borderRadius: 18, padding: 18,
    borderWidth: 1.5, borderColor: Colors.primaryLight,
    shadowColor: Colors.cardShadow,
    shadowOffset: { width: 0, height: 4 }, shadowOpacity: 1, shadowRadius: 12, elevation: 3,
  },
  clinicNativeEmoji: { fontSize: 36 },
  clinicNativeText: { flex: 1, gap: 3 },
  clinicNativeTitle: { fontSize: 15, fontWeight: '800', color: Colors.text },
  clinicNativeDesc: { fontSize: 12, color: Colors.sub },

  // 카드
  card: {
    width: 160, backgroundColor: Colors.white, borderRadius: 18, overflow: 'hidden',
    shadowColor: Colors.cardShadow,
    shadowOffset: { width: 0, height: 6 }, shadowOpacity: 1, shadowRadius: 16, elevation: 4,
  },
  cardImage: { height: 120, backgroundColor: '#FFE8F0', alignItems: 'center', justifyContent: 'center' },
  cardBadge: {
    position: 'absolute', bottom: 8, left: 8,
    backgroundColor: 'rgba(255,107,157,0.85)', borderRadius: 10,
    paddingVertical: 3, paddingHorizontal: 8,
  },
  cardBadgeText: { fontSize: 10, fontWeight: '700', color: '#fff' },
  cardBody: { padding: 12, gap: 3 },
  cardTitle: { fontSize: 14, fontWeight: '700', color: Colors.text },
  cardPrice: { fontSize: 12, color: Colors.primary, fontWeight: '600' },
  cardRating: { fontSize: 11, color: Colors.sub },

  // 묶음 카드
  pairCard: {
    width: 220, backgroundColor: Colors.white, borderRadius: 18, overflow: 'hidden',
    shadowColor: Colors.cardShadow,
    shadowOffset: { width: 0, height: 6 }, shadowOpacity: 1, shadowRadius: 16, elevation: 4,
  },
  pairHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 10,
  },
  pairConcern: { fontSize: 13, fontWeight: '800' },
  pairRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 14, paddingVertical: 10,
  },
  pairRowIcon: {
    width: 36, height: 36, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  pairRowLabel: { fontSize: 10, color: Colors.sub, fontWeight: '600' },
  pairRowName: { fontSize: 13, fontWeight: '700', color: Colors.text, marginTop: 1 },
  pairRowPrice: { fontSize: 11, color: Colors.primary, fontWeight: '600', marginTop: 1 },
  pairDivider: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 14, marginVertical: 2,
  },
  pairDividerLine: { flex: 1, height: 1, backgroundColor: Colors.border },
  pairDividerText: { fontSize: 10, color: Colors.sub, fontWeight: '600' },

  // 회원가입 완료 팝업
  popupOverlay: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  popupCard: {
    backgroundColor: '#fff', borderRadius: 28, padding: 36,
    alignItems: 'center', width: '100%', maxWidth: 360,
    shadowColor: '#000', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18, shadowRadius: 24, elevation: 10,
  },
  popupEmoji: { fontSize: 64, marginBottom: 16 },
  popupTitle: { fontSize: 26, fontWeight: '900', color: Colors.text, marginBottom: 6, textAlign: 'center' },
  popupMissionBadge: {
    backgroundColor: '#E8F8EF', borderRadius: 20, paddingVertical: 8, paddingHorizontal: 20, marginBottom: 12,
  },
  popupMissionText: { fontSize: 15, fontWeight: '800', color: '#27AE60' },
  popupPointBadge: {
    backgroundColor: '#FFF5E0', borderRadius: 50, paddingVertical: 14, paddingHorizontal: 32, marginBottom: 12,
  },
  popupPointText: { fontSize: 24, fontWeight: '900', color: '#E8A000' },
  popupSub: { fontSize: 13, color: Colors.sub, marginBottom: 28, textAlign: 'center' },
  popupBtn: {
    backgroundColor: Colors.primary, borderRadius: 14,
    paddingVertical: 16, paddingHorizontal: 40, width: '100%', alignItems: 'center',
  },
  popupBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
});
