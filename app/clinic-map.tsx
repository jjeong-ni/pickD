import {
  View, Text, StyleSheet, TouchableOpacity, ActivityIndicator,
  Platform, Linking, Alert,
} from 'react-native';
import { useEffect, useRef, useState } from 'react';
import { useLocalSearchParams, router } from 'expo-router';
import { WebView } from 'react-native-webview';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { Colors, HEADER_TOP } from '../constants/colors';

const KAKAO_JS_KEY = process.env.EXPO_PUBLIC_KAKAO_JS_KEY ?? '78a1bd65ed949a70fdd8b12e8538909f';
const DEFAULT_COORDS = { lat: 37.5981, lng: 127.0524 }; // 서울 회기·경희대 기본값

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

interface Coords { lat: number; lng: number }

// ─── 네이티브용 WebView HTML ──────────────────────────────────────────────────
function buildMapHtml(coords: Coords, keyword: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="initial-scale=1.0,user-scalable=no,maximum-scale=1,width=device-width">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, sans-serif; }
    #map { width: 100vw; height: 100vh; }
    .badge {
      position: absolute; top: 12px; left: 50%; transform: translateX(-50%);
      background: rgba(255,255,255,0.95); border-radius: 20px;
      padding: 8px 16px; font-size: 13px; color: #333;
      box-shadow: 0 2px 8px rgba(0,0,0,0.15); white-space: nowrap;
      pointer-events: none; z-index: 100;
    }
    .badge b { color: #FF6B9D; }
    .place-info {
      padding: 14px 16px; background: white; border-radius: 12px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.12); font-size: 13px; line-height: 1.6;
    }
    .place-info .name { font-weight: 700; font-size: 15px; color: #111; }
    .place-info .addr { color: #666; margin-top: 2px; }
    .place-info .phone { color: #FF6B9D; margin-top: 2px; }
    .place-info a { color: #FF6B9D; font-weight: 600; text-decoration: none; }
    .my-dot {
      width: 14px; height: 14px; border-radius: 50%;
      background: #4A90E2; border: 3px solid white;
      box-shadow: 0 0 0 3px rgba(74,144,226,0.35);
    }
  </style>
</head>
<body>
<div id="map"></div>
<div class="badge" id="badge">📍 <b>${escapeHtml(keyword)}</b> 주변 피부과 탐색 중...</div>

<script>
var map, myOverlay, infowindow;

var script = document.createElement('script');
script.src = '//dapi.kakao.com/v2/maps/sdk.js?appkey=${KAKAO_JS_KEY}&libraries=services&autoload=false';
script.onload = function() { kakao.maps.load(initMap); };
document.head.appendChild(script);

function initMap() {
  var container = document.getElementById('map');
  var center = new kakao.maps.LatLng(${coords.lat}, ${coords.lng});
  map = new kakao.maps.Map(container, { center: center, level: 5 });
  infowindow = new kakao.maps.InfoWindow({ zIndex: 1 });
  searchNearby(${coords.lat}, ${coords.lng});
}

function searchNearby(lat, lng) {
  if (!map) return;
  var latlng = new kakao.maps.LatLng(lat, lng);
  var ps = new kakao.maps.services.Places();
  var badge = document.getElementById('badge');
  if (badge) badge.innerHTML = '📍 <b>${keyword}</b> 주변 피부과 탐색 중...';

  ps.keywordSearch('${encodeURIComponent(keyword)} 피부과', function(data, status) {
    if (status === kakao.maps.services.Status.OK) {
      if (badge) badge.innerHTML = '📍 주변 피부과 <b>' + data.length + '곳</b>';
      var bounds = new kakao.maps.LatLngBounds();
      bounds.extend(latlng);
      data.forEach(function(place) {
        var pos = new kakao.maps.LatLng(place.y, place.x);
        var marker = new kakao.maps.Marker({ map: map, position: pos, title: place.place_name });
        bounds.extend(pos);
        kakao.maps.event.addListener(marker, 'click', function() {
          infowindow.setContent(
            '<div class="place-info">'
            + '<div class="name">' + place.place_name + '</div>'
            + '<div class="addr">' + (place.road_address_name || place.address_name) + '</div>'
            + (place.phone ? '<div class="phone">📞 ' + place.phone + '</div>' : '')
            + '<div style="margin-top:8px"><a href="' + place.place_url + '" target="_blank">카카오맵에서 보기 →</a></div>'
            + '</div>'
          );
          infowindow.open(map, marker);
        });
      });
      map.setBounds(bounds);
    } else {
      if (badge) badge.innerHTML = '⚠️ 주변 피부과를 찾지 못했어요';
    }
  }, { location: latlng, radius: 5000, sort: kakao.maps.services.SortBy.DISTANCE });
}

// React Native에서 injectJavaScript로 호출
window.moveToMyLocation = function(lat, lng) {
  if (!map) return;
  var pos = new kakao.maps.LatLng(lat, lng);
  map.setCenter(pos);
  map.setLevel(4);
  if (myOverlay) myOverlay.setMap(null);
  var dot = document.createElement('div');
  dot.className = 'my-dot';
  myOverlay = new kakao.maps.CustomOverlay({ map: map, position: pos, content: dot, zIndex: 5 });
  searchNearby(lat, lng);
};
</script>
</body>
</html>
`;
}

// ─── 웹 전용 컴포넌트 ─────────────────────────────────────────────────────────
function WebKakaoMap({ keyword }: { keyword: string }) {
  const mapDivRef = useRef<any>(null);
  const kakaoMapRef = useRef<any>(null);
  const myOverlayRef = useRef<any>(null);
  const scriptLoaded = useRef(false);
  const [locating, setLocating] = useState(false);
  const badgeRef = useRef<any>(null);

  const searchNearby = (lat: number, lng: number) => {
    const kakao = (window as any).kakao;
    const map = kakaoMapRef.current;
    if (!map) return;

    const latlng = new kakao.maps.LatLng(lat, lng);
    const ps = new kakao.maps.services.Places();
    const infowindow = new kakao.maps.InfoWindow({ zIndex: 1 });
    if (badgeRef.current) badgeRef.current.textContent = `📍 ${keyword} 주변 피부과 탐색 중...`;

    ps.keywordSearch(`${keyword} 피부과`, (data: any[], status: string) => {
      if (status === kakao.maps.services.Status.OK) {
        if (badgeRef.current) badgeRef.current.innerHTML = `📍 주변 피부과 <b style="color:#FF6B9D">${data.length}곳</b>`;
        const bounds = new kakao.maps.LatLngBounds();
        bounds.extend(latlng);
        data.forEach((place: any) => {
          const pos = new kakao.maps.LatLng(place.y, place.x);
          const marker = new kakao.maps.Marker({ map, position: pos, title: place.place_name });
          bounds.extend(pos);
          kakao.maps.event.addListener(marker, 'click', () => {
            infowindow.setContent(
              `<div style="padding:12px 14px;background:#fff;border-radius:12px;box-shadow:0 2px 8px rgba(0,0,0,0.12);font-size:13px;line-height:1.6;max-width:220px">
                <div style="font-weight:700;font-size:15px;color:#111">${place.place_name}</div>
                <div style="color:#666;margin-top:2px">${place.road_address_name || place.address_name}</div>
                ${place.phone ? `<div style="color:#FF6B9D;margin-top:2px">📞 ${place.phone}</div>` : ''}
                <div style="margin-top:8px"><a href="${place.place_url}" target="_blank" style="color:#FF6B9D;font-weight:600;text-decoration:none">카카오맵에서 보기 →</a></div>
              </div>`
            );
            infowindow.open(map, marker);
          });
        });
        map.setBounds(bounds);
      } else {
        if (badgeRef.current) badgeRef.current.textContent = '⚠️ 주변 피부과를 찾지 못했어요';
      }
    }, { location: latlng, radius: 5000, sort: kakao.maps.services.SortBy.DISTANCE });
  };

  const initMap = (lat: number, lng: number) => {
    const kakao = (window as any).kakao;
    const container = mapDivRef.current;
    if (!container) return;
    const center = new kakao.maps.LatLng(lat, lng);
    const map = new kakao.maps.Map(container, { center, level: 5 });
    kakaoMapRef.current = map;
    searchNearby(lat, lng);
  };

  useEffect(() => {
    if (scriptLoaded.current || typeof window === 'undefined') return;
    scriptLoaded.current = true;

    const load = () => (window as any).kakao.maps.load(() => initMap(DEFAULT_COORDS.lat, DEFAULT_COORDS.lng));

    if ((window as any).kakao?.maps) { load(); return; }

    const script = document.createElement('script');
    script.src = `//dapi.kakao.com/v2/maps/sdk.js?appkey=${KAKAO_JS_KEY}&libraries=services&autoload=false`;
    script.onload = () => { try { load(); } catch { if (badgeRef.current) badgeRef.current.textContent = '⚠️ 지도를 불러오지 못했어요'; } };
    script.onerror = () => { if (badgeRef.current) badgeRef.current.textContent = '⚠️ 카카오맵 SDK 로드 실패'; };
    document.head.appendChild(script);
  }, []);

  const handleMyLocation = () => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        const kakao = (window as any).kakao;
        const map = kakaoMapRef.current;
        if (!map) { setLocating(false); return; }
        const latlng = new kakao.maps.LatLng(lat, lng);
        map.setCenter(latlng);
        map.setLevel(4);
        if (myOverlayRef.current) myOverlayRef.current.setMap(null);
        const dot = document.createElement('div');
        dot.style.cssText = 'width:14px;height:14px;border-radius:50%;background:#4A90E2;border:3px solid white;box-shadow:0 0 0 3px rgba(74,144,226,0.35)';
        myOverlayRef.current = new kakao.maps.CustomOverlay({ map, position: latlng, content: dot, zIndex: 5 });
        searchNearby(lat, lng);
        setLocating(false);
      },
      () => { setLocating(false); },
      { timeout: 8000 }
    );
  };

  return (
    <View style={{ flex: 1, position: 'relative' }}>
      {/* @ts-ignore */}
      <div
        ref={badgeRef}
        style={{
          position: 'absolute', top: 12, left: '50%', transform: 'translateX(-50%)',
          background: 'rgba(255,255,255,0.95)', borderRadius: 20,
          padding: '8px 16px', fontSize: 13, color: '#333',
          boxShadow: '0 2px 8px rgba(0,0,0,0.15)', whiteSpace: 'nowrap',
          zIndex: 100, pointerEvents: 'none',
        }}
      >
        📍 피부과 탐색 중...
      </div>

      {/* 내 위치 버튼 (웹 지도 위 플로팅) */}
      <View style={styles.myLocBtn} pointerEvents="box-none">
        <TouchableOpacity style={styles.myLocBtnInner} onPress={handleMyLocation} disabled={locating}>
          {locating
            ? <ActivityIndicator size="small" color={Colors.primary} />
            : <Ionicons name="locate" size={20} color={Colors.primary} />}
          <Text style={styles.myLocBtnText}>내 위치</Text>
        </TouchableOpacity>
      </View>

      {/* @ts-ignore */}
      <div
        ref={mapDivRef}
        style={{ width: '100%', height: 'calc(100vh - 130px)', minHeight: 400 }}
      />
    </View>
  );
}

// ─── 메인 화면 ────────────────────────────────────────────────────────────────
export default function ClinicMapScreen() {
  const { treatmentName } = useLocalSearchParams<{ treatmentName?: string }>();
  const keyword = treatmentName || '피부과';

  const [coords, setCoords] = useState<Coords>(DEFAULT_COORDS); // 즉시 기본값
  const [locating, setLocating] = useState(false);
  const webViewRef = useRef<any>(null);

  const handleMyLocation = async () => {
    setLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          '위치 권한 필요',
          '내 위치로 이동하려면 위치 접근 권한이 필요해요.',
          [
            { text: '설정 열기', onPress: () => Linking.openSettings() },
            { text: '취소', style: 'cancel' },
          ]
        );
        setLocating(false);
        return;
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const newCoords = { lat: loc.coords.latitude, lng: loc.coords.longitude };
      setCoords(newCoords);
      // WebView에 이미 로드된 지도에 JS로 위치 전달
      webViewRef.current?.injectJavaScript(
        `window.moveToMyLocation(${newCoords.lat}, ${newCoords.lng}); true;`
      );
    } catch {
      Alert.alert('오류', '위치를 가져오지 못했어요.');
    } finally {
      setLocating(false);
    }
  };

  const Header = () => (
    <View style={styles.header}>
      <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
        <Ionicons name="arrow-back" size={22} color={Colors.text} />
      </TouchableOpacity>
      <Text style={styles.headerTitle}>근처 피부과 찾기</Text>
      {Platform.OS !== 'web' ? (
        <TouchableOpacity style={styles.myLocHeaderBtn} onPress={handleMyLocation} disabled={locating}>
          {locating
            ? <ActivityIndicator size="small" color={Colors.primary} />
            : <Ionicons name="locate" size={20} color={Colors.primary} />}
          <Text style={styles.myLocHeaderText}>내 위치</Text>
        </TouchableOpacity>
      ) : <View style={{ width: 64 }} />}
    </View>
  );

  if (Platform.OS === 'web') {
    return (
      <View style={styles.container}>
        <Header />
        {treatmentName && (
          <View style={styles.keywordBadge}>
            <Text style={styles.keywordBadgeText}>✨ "{treatmentName}" 시술 가능한 피부과 탐색</Text>
          </View>
        )}
        <WebKakaoMap keyword={keyword} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Header />
      {treatmentName && (
        <View style={styles.keywordBadge}>
          <Text style={styles.keywordBadgeText}>✨ "{treatmentName}" 시술 가능한 피부과 탐색</Text>
        </View>
      )}
      <WebView
        ref={webViewRef}
        style={{ flex: 1 }}
        source={{ html: buildMapHtml(DEFAULT_COORDS, keyword) }}
        javaScriptEnabled
        domStorageEnabled
        originWhitelist={['*']}
        mixedContentMode="always"
        onError={() => Alert.alert('오류', '지도를 불러오지 못했어요. 네트워크를 확인해주세요.')}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.white },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: HEADER_TOP, paddingBottom: 12, paddingHorizontal: 16,
    backgroundColor: Colors.white, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  backBtn: { width: 40, alignItems: 'flex-start' },
  headerTitle: { fontSize: 17, fontWeight: '700', color: Colors.text },
  myLocHeaderBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingVertical: 6, paddingHorizontal: 10,
    borderRadius: 16, borderWidth: 1.5, borderColor: Colors.primary,
    minWidth: 64, justifyContent: 'center',
  },
  myLocHeaderText: { fontSize: 12, fontWeight: '700', color: Colors.primary },
  keywordBadge: {
    backgroundColor: '#FFF0F5', paddingHorizontal: 16, paddingVertical: 10, alignItems: 'center',
  },
  keywordBadgeText: { fontSize: 13, color: Colors.primary, fontWeight: '600' },
  myLocBtn: {
    position: 'absolute', bottom: 24, right: 16, zIndex: 200,
  },
  myLocBtnInner: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: Colors.white, paddingVertical: 10, paddingHorizontal: 16,
    borderRadius: 24, borderWidth: 1.5, borderColor: Colors.primary,
    shadowColor: Colors.pinkShadow, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1, shadowRadius: 12, elevation: 6,
  },
  myLocBtnText: { fontSize: 13, fontWeight: '700', color: Colors.primary },
});
