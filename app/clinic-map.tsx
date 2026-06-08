import {
  View, Text, StyleSheet, TouchableOpacity, ActivityIndicator,
  Platform, Linking, Alert,
} from 'react-native';
import { useEffect, useRef, useState } from 'react';
import { useLocalSearchParams, router } from 'expo-router';
import { WebView } from 'react-native-webview';
import * as Location from 'expo-location';
import { Colors } from '../constants/colors';

const KAKAO_JS_KEY = '5b939de88307ee9510f8bdea863492b2';

interface Coords {
  lat: number;
  lng: number;
}

function buildMapHtml(coords: Coords, keyword: string): string {
  const query = encodeURIComponent(keyword);
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
    .info-wrap {
      position: absolute; top: 12px; left: 50%; transform: translateX(-50%);
      background: rgba(255,255,255,0.95); border-radius: 20px;
      padding: 8px 16px; font-size: 13px; color: #333;
      box-shadow: 0 2px 8px rgba(0,0,0,0.15); white-space: nowrap;
      pointer-events: none; z-index: 100;
    }
    .info-wrap b { color: #FF6B9D; }
    .place-info {
      padding: 14px 16px; background: white; border-radius: 12px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.12); font-size: 13px; line-height: 1.6;
    }
    .place-info .name { font-weight: 700; font-size: 15px; color: #111; }
    .place-info .addr { color: #666; margin-top: 2px; }
    .place-info .phone { color: #FF6B9D; margin-top: 2px; }
    .place-info a { color: #FF6B9D; font-weight: 600; text-decoration: none; }
    .my-marker {
      width: 14px; height: 14px; border-radius: 50%;
      background: #4A90E2; border: 3px solid white;
      box-shadow: 0 0 0 3px rgba(74,144,226,0.35);
    }
  </style>
</head>
<body>
<div id="map"></div>
<div class="info-wrap">📍 <b>${keyword}</b> 주변 피부과 탐색 중...</div>

<script>
var script = document.createElement('script');
script.src = '//dapi.kakao.com/v2/maps/sdk.js?appkey=${KAKAO_JS_KEY}&libraries=services&autoload=false';
script.onload = function() {
  kakao.maps.load(function() { initMap(); });
};
document.head.appendChild(script);

function initMap() {
  var container = document.getElementById('map');
  var myLatLng = new kakao.maps.LatLng(${coords.lat}, ${coords.lng});
  var map = new kakao.maps.Map(container, { center: myLatLng, level: 4 });

  // 내 위치: 파란 원 커스텀 오버레이
  new kakao.maps.CustomOverlay({
    map: map,
    position: myLatLng,
    content: '<div class="my-marker"></div>',
    zIndex: 5
  });

  // 장소 검색
  var ps = new kakao.maps.services.Places();
  var infowindow = new kakao.maps.InfoWindow({ zIndex: 1 });

  ps.keywordSearch('${query} 피부과', function(data, status) {
    var infoEl = document.querySelector('.info-wrap');
    if (status === kakao.maps.services.Status.OK) {
      infoEl.innerHTML = '📍 주변 피부과 <b>' + data.length + '곳</b>';
      var bounds = new kakao.maps.LatLngBounds();
      bounds.extend(myLatLng);
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
      infoEl.innerHTML = '⚠️ 주변 피부과를 찾지 못했어요';
    }
  }, {
    location: myLatLng,
    radius: 5000,
    sort: kakao.maps.services.SortBy.DISTANCE
  });
}
</script>
</body>
</html>
`;
}

// ─── 웹 전용: SDK 직접 삽입 컴포넌트 ──────────────────────────────────────────
function WebKakaoMap({ keyword }: { keyword: string }) {
  const mapDivRef = useRef<any>(null);
  const [webCoords, setWebCoords] = useState<Coords | null>(null);
  const [webLoading, setWebLoading] = useState(true);
  const scriptLoaded = useRef(false);

  useEffect(() => {
    if (typeof navigator === 'undefined') {
      setWebCoords({ lat: 37.5172, lng: 127.0473 });
      setWebLoading(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setWebCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setWebLoading(false);
      },
      () => {
        setWebCoords({ lat: 37.5172, lng: 127.0473 });
        setWebLoading(false);
      },
      { timeout: 8000 }
    );
  }, []);

  useEffect(() => {
    if (!webCoords || webLoading || scriptLoaded.current) return;
    scriptLoaded.current = true;

    const { lat, lng } = webCoords;
    const query = encodeURIComponent(keyword);

    const initMap = () => {
      const kakao = (window as any).kakao;
      const container = mapDivRef.current;
      if (!container) return;
      const myLatLng = new kakao.maps.LatLng(lat, lng);
      const map = new kakao.maps.Map(container, { center: myLatLng, level: 4 });

      const myOverlay = document.createElement('div');
      myOverlay.style.cssText = 'width:14px;height:14px;border-radius:50%;background:#4A90E2;border:3px solid white;box-shadow:0 0 0 3px rgba(74,144,226,0.35)';
      new kakao.maps.CustomOverlay({ map, position: myLatLng, content: myOverlay, zIndex: 5 });

      const ps = new kakao.maps.services.Places();
      const infowindow = new kakao.maps.InfoWindow({ zIndex: 1 });
      const badge = document.getElementById('web-map-badge');

      ps.keywordSearch(`${decodeURIComponent(query)} 피부과`, (data: any[], status: string) => {
        if (status === kakao.maps.services.Status.OK) {
          if (badge) badge.textContent = `📍 주변 피부과 ${data.length}곳`;
          const bounds = new kakao.maps.LatLngBounds();
          bounds.extend(myLatLng);
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
          if (badge) badge.textContent = '⚠️ 주변 피부과를 찾지 못했어요';
        }
      }, { location: myLatLng, radius: 5000, sort: kakao.maps.services.SortBy.DISTANCE });
    };

    if ((window as any).kakao?.maps) {
      (window as any).kakao.maps.load(initMap);
      return;
    }

    const script = document.createElement('script');
    script.src = `//dapi.kakao.com/v2/maps/sdk.js?appkey=${KAKAO_JS_KEY}&libraries=services&autoload=false`;
    script.onload = () => (window as any).kakao.maps.load(initMap);
    document.head.appendChild(script);
  }, [webCoords, webLoading]);

  if (webLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>내 위치를 확인 중이에요...</Text>
      </View>
    );
  }

  // @ts-ignore — React Native Web에서 div 직접 사용
  return (
    <View style={{ flex: 1, position: 'relative' }}>
      {/* @ts-ignore */}
      <div
        id="web-map-badge"
        style={{
          position: 'absolute', top: 12, left: '50%', transform: 'translateX(-50%)',
          background: 'rgba(255,255,255,0.95)', borderRadius: 20,
          padding: '8px 16px', fontSize: 13, color: '#333',
          boxShadow: '0 2px 8px rgba(0,0,0,0.15)', whiteSpace: 'nowrap',
          zIndex: 100, pointerEvents: 'none',
        }}
      >
        📍 <b style={{ color: '#FF6B9D' }}>{keyword}</b> 주변 피부과 탐색 중...
      </div>
      {/* @ts-ignore */}
      <div
        ref={mapDivRef}
        style={{ width: '100%', height: '100%' }}
      />
    </View>
  );
}

// ─── 메인 화면 ──────────────────────────────────────────────────────────────
export default function ClinicMapScreen() {
  const { treatmentName } = useLocalSearchParams<{ treatmentName?: string }>();
  const keyword = treatmentName || '피부과';

  const [coords, setCoords] = useState<Coords | null>(null);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [loading, setLoading] = useState(true);
  const webViewRef = useRef<any>(null);

  useEffect(() => {
    if (Platform.OS !== 'web') requestLocation();
    else setLoading(false);
  }, []);

  const requestLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setPermissionDenied(true);
        setLoading(false);
        return;
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setCoords({ lat: loc.coords.latitude, lng: loc.coords.longitude });
    } catch {
      setCoords({ lat: 37.5172, lng: 127.0473 });
    } finally {
      setLoading(false);
    }
  };

  const Header = () => (
    <View style={styles.header}>
      <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
        <Text style={styles.backBtnText}>←</Text>
      </TouchableOpacity>
      <Text style={styles.headerTitle}>근처 피부과 찾기</Text>
      {Platform.OS !== 'web' ? (
        <TouchableOpacity
          style={styles.refreshBtn}
          onPress={() => { setLoading(true); setCoords(null); requestLocation(); }}
        >
          <Text style={{ fontSize: 18 }}>🔄</Text>
        </TouchableOpacity>
      ) : <View style={{ width: 40 }} />}
    </View>
  );

  // ── 웹: SDK 직접 삽입 ──
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

  // ── 네이티브: 위치 권한 거부 ──
  if (permissionDenied) {
    return (
      <View style={styles.container}>
        <Header />
        <View style={styles.permissionDenied}>
          <Text style={{ fontSize: 48 }}>📍</Text>
          <Text style={styles.permTitle}>위치 권한이 필요해요</Text>
          <Text style={styles.permDesc}>근처 피부과를 찾으려면{'\n'}위치 접근 권한을 허용해주세요.</Text>
          <TouchableOpacity style={styles.permBtn} onPress={() => Linking.openSettings()}>
            <Text style={styles.permBtnText}>설정에서 권한 허용</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.permBtnSecondary}
            onPress={() => { setPermissionDenied(false); setLoading(false); setCoords({ lat: 37.5172, lng: 127.0473 }); }}
          >
            <Text style={styles.permBtnSecondaryText}>서울 강남 기준으로 보기</Text>
          </TouchableOpacity>
        </View>
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
      {loading || !coords ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>내 위치를 확인 중이에요...</Text>
        </View>
      ) : (
        <WebView
          ref={webViewRef}
          style={{ flex: 1 }}
          source={{ html: buildMapHtml(coords, keyword) }}
          javaScriptEnabled
          domStorageEnabled
          originWhitelist={['*']}
          mixedContentMode="always"
          onError={() => Alert.alert('오류', '지도를 불러오지 못했어요. 네트워크를 확인해주세요.')}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.white },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: 56, paddingBottom: 12, paddingHorizontal: 16,
    backgroundColor: Colors.white, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  backBtn: { width: 40, alignItems: 'flex-start' },
  backBtnText: { fontSize: 24, color: Colors.text },
  headerTitle: { fontSize: 17, fontWeight: '700', color: Colors.text },
  refreshBtn: { width: 40, alignItems: 'flex-end' },
  keywordBadge: {
    backgroundColor: '#FFF0F5', paddingHorizontal: 16, paddingVertical: 10, alignItems: 'center',
  },
  keywordBadgeText: { fontSize: 13, color: Colors.primary, fontWeight: '600' },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { fontSize: 15, color: Colors.sub },
  permissionDenied: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 12 },
  permTitle: { fontSize: 20, fontWeight: '800', color: Colors.text, textAlign: 'center' },
  permDesc: { fontSize: 14, color: Colors.sub, textAlign: 'center', lineHeight: 22 },
  permBtn: { marginTop: 8, backgroundColor: Colors.primary, paddingVertical: 14, paddingHorizontal: 28, borderRadius: 12 },
  permBtnText: { color: Colors.white, fontWeight: '700', fontSize: 15 },
  permBtnSecondary: { paddingVertical: 10, paddingHorizontal: 20 },
  permBtnSecondaryText: { color: Colors.sub, fontSize: 14 },
});
