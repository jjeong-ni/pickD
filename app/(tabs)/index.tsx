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
import { WebView } from 'react-native-webview';
import * as Location from 'expo-location';

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

const KAKAO_JS_KEY_NATIVE = process.env.EXPO_PUBLIC_KAKAO_JS_KEY ?? '78a1bd65ed949a70fdd8b12e8538909f';
const DEFAULT_COORDS = { lat: 37.5665, lng: 126.9780 };

function buildMiniMapHtml(lat: number, lng: number): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="initial-scale=1.0,user-scalable=no,maximum-scale=1,width=device-width">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { overflow: hidden; }
    #map { width: 100vw; height: 100vh; }
  </style>
</head>
<body>
<div id="map"></div>
<script>
var script = document.createElement('script');
script.src = '//dapi.kakao.com/v2/maps/sdk.js?appkey=${KAKAO_JS_KEY_NATIVE}&libraries=services&autoload=false';
script.onload = function() {
  kakao.maps.load(function() {
    var center = new kakao.maps.LatLng(${lat}, ${lng});
    var map = new kakao.maps.Map(document.getElementById('map'), { center: center, level: 5, draggable: false, scrollwheel: false, disableDoubleClick: true });
    new kakao.maps.CustomOverlay({
      map: map, position: center,
      content: '<div style="width:12px;height:12px;background:#4A90E2;border:2.5px solid #fff;border-radius:50%;box-shadow:0 0 0 3px rgba(74,144,226,0.3)"></div>',
    });
    var ps = new kakao.maps.services.Places();
    ps.keywordSearch('피부과', function(data, status) {
      if (status !== kakao.maps.services.Status.OK) return;
      data.slice(0, 6).forEach(function(place) {
        new kakao.maps.Marker({ map: map, position: new kakao.maps.LatLng(place.y, place.x), title: place.place_name });
      });
    }, { location: center, radius: 2000 });
  });
};
document.head.appendChild(script);
</script>
</body>
</html>`;
}

function HomeClinicMapNative() {
  const [html, setHtml] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
          setHtml(buildMiniMapHtml(pos.coords.latitude, pos.coords.longitude));
        } else {
          setHtml(buildMiniMapHtml(DEFAULT_COORDS.lat, DEFAULT_COORDS.lng));
        }
      } catch {
        setHtml(buildMiniMapHtml(DEFAULT_COORDS.lat, DEFAULT_COORDS.lng));
      }
    })();
  }, []);

  if (Platform.OS === 'web') return null;

  return (
    <TouchableOpacity
      style={styles.nativeMapContainer}
      onPress={() => router.push('/clinic-map' as any)}
      activeOpacity={0.95}
    >
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        {html ? (
          <WebView
            source={{ html }}
            style={{ flex: 1 }}
            scrollEnabled={false}
            bounces={false}
            showsHorizontalScrollIndicator={false}
            showsVerticalScrollIndicator={false}
            overScrollMode="never"
          />
        ) : (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F5F5F5' }}>
            <ActivityIndicator color={Colors.primary} />
          </View>
        )}
      </View>
      <View style={styles.nativeMapOverlay}>
        <Text style={styles.nativeMapOverlayText}>📍 지도 전체 화면으로 보기 →</Text>
      </View>
    </TouchableOpacity>
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
  const [skinPicks, setSkinPicks] = useState<{ treatment: Treatment | null; device: Device | null } | null>(null);
  const [showSkinModal, setShowSkinModal] = useState(false);
  const [skinPicksLoading, setSkinPicksLoading] = useState(false);

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
    const { data, error } = await supabase
      .from('treatments').select('*').contains('tags', [concern])
      .order('rating', { ascending: false }).limit(5);
    if (!error && data && data.length > 0) setRecommended(data);
  };

  const fetchSkinPicks = async () => {
    if (!profile?.skin_type) return;
    setSkinPicksLoading(true);
    const [tRes, dRes] = await Promise.all([
      supabase.from('treatments').select('*').order('rating', { ascending: false }).limit(25),
      supabase.from('devices').select('*').order('rating', { ascending: false }).limit(25),
    ]);
    const allT: Treatment[] = tRes.data ?? [];
    const allD: Device[] = dRes.data ?? [];
    const skinType = profile.skin_type;
    const concerns: string[] = profile?.concerns ?? [];
    const scoreItem = (item: { tags?: string[]; rating: number }) => {
      let s = item.rating;
      if (item.tags?.some((t) => t.includes(skinType) || skinType.includes(t))) s += 2;
      concerns.forEach((c) => {
        if (item.tags?.some((t) => t.includes(c) || c.includes(t))) s += 1;
      });
      return s;
    };
    const bestT = [...allT].sort((a, b) => scoreItem(b) - scoreItem(a))[0] ?? null;
    const bestD = [...allD].sort((a, b) => scoreItem(b) - scoreItem(a))[0] ?? null;
    setSkinPicks({ treatment: bestT, device: bestD });
    setSkinPicksLoading(false);
  };

  const handleSkinBannerPress = async () => {
    setShowSkinModal(true);
    if (!skinPicks) await fetchSkinPicks();
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
          <TouchableOpacity onPress={handleSkinBannerPress} activeOpacity={0.85}>
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
          <TouchableOpacity onPress={() => router.push('/skin-analysis' as any)} activeOpacity={0.85}>
            <GlassCard style={styles.banner} intensity="low">
              <Text style={styles.bannerLabel}>✨ 피부 분석 솔루션</Text>
              <Text style={styles.bannerValue}>내 피부타입 분석하고 맞춤 추천 받기 →</Text>
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
            <HomeClinicMapNative />
          )}
        </View>
      </View>

      {/* 처음 이용 가이드 */}
      <View style={[styles.guideSection, { marginHorizontal: hPad }]}>
        <Text style={styles.guideTitle}>🗺️ 픽디 이렇게 써보세요</Text>
        <View style={styles.guideGrid}>
          {[
            { emoji: '🧬', title: '피부타입 분석', desc: '8문항으로 바우만 피부 진단', route: '/skin-analysis' },
            { emoji: '💎', title: '얼굴형 분석', desc: '얼굴형별 맞춤 시술 추천', route: '/face-analysis' },
            { emoji: '🔍', title: '시술·기기 검색', desc: '카테고리별 비교 & 리뷰', route: '/search' as any },
            { emoji: '📋', title: 'AI 피부 보고서', desc: '종합 분석 리포트 990pt', route: '/skin-report' as any },
          ].map((item) => (
            <TouchableOpacity
              key={item.title}
              style={styles.guideCard}
              onPress={() => router.push(item.route as any)}
              activeOpacity={0.8}
            >
              <Text style={styles.guideCardEmoji}>{item.emoji}</Text>
              <Text style={styles.guideCardTitle}>{item.title}</Text>
              <Text style={styles.guideCardDesc}>{item.desc}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* 재미로 해보기 - 신이 나를 만들 때 */}
      <TouchableOpacity
        style={[styles.godGameBanner, { marginHorizontal: hPad }]}
        onPress={() => router.push('/god-game' as any)}
        activeOpacity={0.88}
      >
        <LinearGradient
          colors={['#1D0A40', '#2D1B5A', '#0E1B40']}
          style={styles.godGameGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.godGameLeft}>
            <View style={styles.godGameBadge}>
              <Text style={styles.godGameBadgeTxt}>✨ 재미 테스트 NEW</Text>
            </View>
            <Text style={styles.godGameTitle}>신이 나를 만들 때 🧪</Text>
            <Text style={styles.godGameDesc}>실험실에서 재료 5개 골라 내 성격 분석하기</Text>
          </View>
          <Text style={styles.godGameEmoji}>🧑‍🔬</Text>
        </LinearGradient>
      </TouchableOpacity>

      <View style={{ height: 32 }} />
    </ScrollView>

    {/* 피부타입 맞춤 추천 모달 */}
    <Modal visible={showSkinModal} transparent animationType="slide" onRequestClose={() => setShowSkinModal(false)}>
      <View style={styles.skinPicksOverlay}>
        <View style={styles.skinPicksSheet}>
          <View style={styles.skinPicksHandle} />
          <Text style={styles.skinPicksTitle}>✨ 내 피부타입 맞춤 추천</Text>
          <Text style={styles.skinPicksSubtitle}>{profile?.skin_type} 타입에 가장 잘 맞는 시술·기기예요</Text>
          {skinPicksLoading ? (
            <View style={{ paddingVertical: 40, alignItems: 'center' }}>
              <ActivityIndicator color={Colors.primary} size="large" />
              <Text style={{ marginTop: 12, color: Colors.sub, fontSize: 14 }}>최적 상품 분석 중...</Text>
            </View>
          ) : skinPicks ? (
            <View style={{ gap: 12 }}>
              {skinPicks.treatment && (
                <TouchableOpacity
                  style={styles.skinPickCard}
                  onPress={() => { setShowSkinModal(false); router.push(`/treatment/${skinPicks.treatment!.id}` as any); }}
                  activeOpacity={0.8}
                >
                  <View style={[styles.skinPickIcon, { backgroundColor: '#FFE8F0' }]}>
                    <Ionicons name="medical-outline" size={24} color={Colors.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.skinPickLabel}>추천 시술</Text>
                    <Text style={styles.skinPickName}>{skinPicks.treatment.name}</Text>
                    <Text style={styles.skinPickMeta}>⭐ {(skinPicks.treatment.rating ?? 0).toFixed(1)} · {(skinPicks.treatment.price_min ?? 0).toLocaleString()}원~</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={Colors.sub} />
                </TouchableOpacity>
              )}
              {skinPicks.device && (
                <TouchableOpacity
                  style={styles.skinPickCard}
                  onPress={() => { setShowSkinModal(false); router.push(`/device/${skinPicks.device!.id}` as any); }}
                  activeOpacity={0.8}
                >
                  <View style={[styles.skinPickIcon, { backgroundColor: '#EEE8FF' }]}>
                    <Ionicons name="hardware-chip-outline" size={24} color="#9B6FE8" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.skinPickLabel}>추천 홈케어 기기</Text>
                    <Text style={styles.skinPickName}>{skinPicks.device.name}</Text>
                    <Text style={styles.skinPickMeta}>⭐ {(skinPicks.device.rating ?? 0).toFixed(1)} · {(skinPicks.device.price ?? 0).toLocaleString()}원</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={Colors.sub} />
                </TouchableOpacity>
              )}
              {!skinPicks.treatment && !skinPicks.device && (
                <View style={{ paddingVertical: 20, alignItems: 'center' }}>
                  <Text style={{ fontSize: 13, color: Colors.sub, textAlign: 'center' }}>
                    아직 매칭된 상품이 없어요{'\n'}전체 상품에서 직접 찾아보세요
                  </Text>
                </View>
              )}
            </View>
          ) : (
            <View style={{ paddingVertical: 20, alignItems: 'center' }}>
              <Text style={{ fontSize: 13, color: Colors.sub, textAlign: 'center' }}>
                추천 상품을 불러오지 못했어요{'\n'}전체 상품에서 직접 찾아보세요
              </Text>
            </View>
          )}
          <TouchableOpacity
            style={styles.skinPicksMoreBtn}
            onPress={() => { setShowSkinModal(false); router.push('/search' as any); }}
          >
            <Text style={styles.skinPicksMoreBtnText}>전체 상품 더보기</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setShowSkinModal(false)} style={{ alignItems: 'center', paddingVertical: 12 }}>
            <Text style={{ color: Colors.sub, fontSize: 14 }}>닫기</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>

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
  nativeMapContainer: {
    borderRadius: 18, overflow: 'hidden', height: 210,
    borderWidth: 1.5, borderColor: Colors.primaryLight,
    shadowColor: Colors.cardShadow,
    shadowOffset: { width: 0, height: 4 }, shadowOpacity: 1, shadowRadius: 12, elevation: 3,
  },
  nativeMapWebView: { flex: 1 },
  nativeMapOverlay: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: 'rgba(255,255,255,0.92)',
    paddingVertical: 10, alignItems: 'center',
  },
  nativeMapOverlayText: { fontSize: 13, fontWeight: '700', color: Colors.primary },

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

  // 피부타입 맞춤 추천 모달
  skinPicksOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  skinPicksSheet: {
    backgroundColor: Colors.white, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, paddingBottom: 40,
  },
  skinPicksHandle: {
    width: 40, height: 4, borderRadius: 2, backgroundColor: Colors.border,
    alignSelf: 'center', marginBottom: 18,
  },
  skinPicksTitle: { fontSize: 20, fontWeight: '800', color: Colors.text, marginBottom: 4 },
  skinPicksSubtitle: { fontSize: 14, color: Colors.sub, marginBottom: 20 },
  skinPickCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: Colors.bg, borderRadius: 14, padding: 14,
  },
  skinPickIcon: {
    width: 48, height: 48, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  skinPickLabel: { fontSize: 11, fontWeight: '700', color: Colors.sub, marginBottom: 3 },
  skinPickName: { fontSize: 15, fontWeight: '700', color: Colors.text, marginBottom: 2 },
  skinPickMeta: { fontSize: 12, color: Colors.sub },
  skinPicksMoreBtn: {
    backgroundColor: Colors.primaryLight, borderRadius: 12,
    paddingVertical: 14, alignItems: 'center', marginTop: 16,
  },
  skinPicksMoreBtnText: { fontSize: 15, fontWeight: '700', color: Colors.primary },

  // 이용 가이드
  guideSection: { marginTop: 28 },
  guideTitle: { fontSize: 16, fontWeight: '800', color: Colors.text, marginBottom: 14 },
  guideGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  guideCard: {
    width: '47%', backgroundColor: Colors.white, borderRadius: 16, padding: 16,
    gap: 6, borderWidth: 1, borderColor: Colors.border,
    shadowColor: Colors.cardShadow,
    shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 8, elevation: 2,
  },
  guideCardEmoji: { fontSize: 28 },
  guideCardTitle: { fontSize: 13, fontWeight: '800', color: Colors.text },
  guideCardDesc: { fontSize: 11, color: Colors.sub, lineHeight: 16 },

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

  // 신이 나를 만들 때 배너
  godGameBanner: { marginTop: 20, marginBottom: 8, borderRadius: 20, overflow: 'hidden' },
  godGameGradient: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 20, paddingHorizontal: 22, borderRadius: 20,
  },
  godGameLeft: { gap: 6, flex: 1 },
  godGameBadge: {
    backgroundColor: 'rgba(155,127,224,0.45)', borderRadius: 20,
    paddingHorizontal: 10, paddingVertical: 4, alignSelf: 'flex-start',
  },
  godGameBadgeTxt: { color: '#D4BFFF', fontSize: 10, fontWeight: '800' },
  godGameTitle: { color: '#FFFFFF', fontSize: 18, fontWeight: '900' },
  godGameDesc: { color: 'rgba(255,255,255,0.6)', fontSize: 12 },
  godGameEmoji: { fontSize: 52, marginLeft: 8 },
});
