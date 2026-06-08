import {
  View, Text, StyleSheet, TouchableOpacity, ActivityIndicator,
  Platform, Linking, Alert,
} from 'react-native';
import { useEffect, useRef, useState } from 'react';
import { useLocalSearchParams, router } from 'expo-router';
import { WebView } from 'react-native-webview';
import * as Location from 'expo-location';
import { Colors } from '../constants/colors';

// ⚠️ 카카오 개발자 콘솔(https://developers.kakao.com)에서 발급받은
//    JavaScript 앱 키를 아래에 입력하세요.
//    등록 도메인에 http://localhost 및 Netlify 도메인도 추가해야 합니다.
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
      padding: 14px 16px;
      background: white;
      border-radius: 12px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.12);
      font-size: 13px;
      line-height: 1.6;
    }
    .place-info .name { font-weight: 700; font-size: 15px; color: #111; }
    .place-info .addr { color: #666; margin-top: 2px; }
    .place-info .phone { color: #FF6B9D; margin-top: 2px; }
    .place-info a { color: #FF6B9D; font-weight: 600; text-decoration: none; }
  </style>
</head>
<body>
<div id="map"></div>
<div class="info-wrap">📍 <b>${keyword}</b> 주변 검색 중...</div>

<script>
// 카카오맵 SDK 로드
var script = document.createElement('script');
script.src = '//dapi.kakao.com/v2/maps/sdk.js?appkey=${KAKAO_JS_KEY}&libraries=services&autoload=false';
script.onload = function() {
  kakao.maps.load(function() {
    initMap();
  });
};
document.head.appendChild(script);

function initMap() {
  var container = document.getElementById('map');
  var options = {
    center: new kakao.maps.LatLng(${coords.lat}, ${coords.lng}),
    level: 4
  };
  var map = new kakao.maps.Map(container, options);

  // 내 위치 마커
  var myMarkerImg = new kakao.maps.MarkerImage(
    'https://t1.daumcdn.net/localimg/localimages/07/mapapidoc/markerStar.png',
    new kakao.maps.Size(24, 35)
  );
  new kakao.maps.Marker({
    map: map,
    position: new kakao.maps.LatLng(${coords.lat}, ${coords.lng}),
    image: myMarkerImg,
    title: '내 위치'
  });

  // 장소 검색
  var ps = new kakao.maps.services.Places();
  var infowindow = new kakao.maps.InfoWindow({ zIndex: 1 });

  document.querySelector('.info-wrap').innerHTML =
    '📍 <b>${keyword}</b> 주변 피부과 검색 중...';

  ps.keywordSearch('${query} 피부과', function(data, status) {
    if (status === kakao.maps.services.Status.OK) {
      document.querySelector('.info-wrap').innerHTML =
        '📍 주변 피부과 <b>' + data.length + '곳</b> 발견';

      var bounds = new kakao.maps.LatLngBounds();
      bounds.extend(new kakao.maps.LatLng(${coords.lat}, ${coords.lng}));

      data.forEach(function(place) {
        var position = new kakao.maps.LatLng(place.y, place.x);
        var marker = new kakao.maps.Marker({ map: map, position: position, title: place.place_name });
        bounds.extend(position);

        kakao.maps.event.addListener(marker, 'click', function() {
          var content = '<div class="place-info">'
            + '<div class="name">' + place.place_name + '</div>'
            + '<div class="addr">' + (place.road_address_name || place.address_name) + '</div>'
            + (place.phone ? '<div class="phone">📞 ' + place.phone + '</div>' : '')
            + '<div style="margin-top:8px">'
            + '<a href="' + place.place_url + '" target="_blank">카카오맵에서 보기 →</a>'
            + '</div></div>';
          infowindow.setContent(content);
          infowindow.open(map, marker);
        });
      });

      map.setBounds(bounds);
    } else {
      document.querySelector('.info-wrap').innerHTML = '⚠️ 주변 피부과를 찾지 못했어요';
    }
  }, {
    location: new kakao.maps.LatLng(${coords.lat}, ${coords.lng}),
    radius: 5000,
    sort: kakao.maps.services.SortBy.DISTANCE
  });
}
</script>
</body>
</html>
`;
}

export default function ClinicMapScreen() {
  const { treatmentName } = useLocalSearchParams<{ treatmentName?: string }>();
  const keyword = treatmentName || '피부과';

  const [coords, setCoords] = useState<Coords | null>(null);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [loading, setLoading] = useState(true);
  const webViewRef = useRef<any>(null);

  useEffect(() => {
    requestLocation();
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
      // 위치 획득 실패 시 서울 강남 기본값
      setCoords({ lat: 37.5172, lng: 127.0473 });
    } finally {
      setLoading(false);
    }
  };

  // 웹 플랫폼: 카카오맵 검색 페이지로 이동
  if (Platform.OS === 'web') {
    const kakaoSearchUrl = `https://map.kakao.com/link/search/${encodeURIComponent(keyword + ' 피부과')}`;
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backBtnText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>근처 피부과 찾기</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.webFallback}>
          <Text style={styles.webFallbackEmoji}>🗺️</Text>
          <Text style={styles.webFallbackTitle}>카카오맵에서 검색하기</Text>
          <Text style={styles.webFallbackDesc}>
            앱에서 더욱 편리한 지도 탐색이 가능해요.{'\n'}
            웹에서는 카카오맵으로 바로 연결해드려요.
          </Text>
          <TouchableOpacity
            style={styles.openMapBtn}
            onPress={() => Linking.openURL(kakaoSearchUrl)}
          >
            <Text style={styles.openMapBtnText}>🗺️ 카카오맵에서 "{keyword} 피부과" 검색</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // 권한 거부
  if (permissionDenied) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backBtnText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>근처 피부과 찾기</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.permissionDenied}>
          <Text style={{ fontSize: 48 }}>📍</Text>
          <Text style={styles.permTitle}>위치 권한이 필요해요</Text>
          <Text style={styles.permDesc}>
            근처 피부과를 찾으려면{'\n'}위치 접근 권한을 허용해주세요.
          </Text>
          <TouchableOpacity style={styles.permBtn} onPress={() => Linking.openSettings()}>
            <Text style={styles.permBtnText}>설정에서 권한 허용</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.permBtnSecondary}
            onPress={() => {
              setPermissionDenied(false);
              setLoading(true);
              setCoords({ lat: 37.5172, lng: 127.0473 });
              setLoading(false);
            }}
          >
            <Text style={styles.permBtnSecondaryText}>서울 강남 기준으로 보기</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // 카카오 키 미설정 안내
  if (KAKAO_JS_KEY === 'YOUR_KAKAO_JS_APP_KEY') {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backBtnText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>근처 피부과 찾기</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.permissionDenied}>
          <Text style={{ fontSize: 48 }}>🗝️</Text>
          <Text style={styles.permTitle}>카카오맵 API 키 필요</Text>
          <Text style={styles.permDesc}>
            {'app/clinic-map.tsx 파일 상단의\nKAKAO_JS_KEY 값을 설정해주세요.\n\n'}
            {'https://developers.kakao.com\n에서 JavaScript 앱 키를 발급받으세요.'}
          </Text>
          <TouchableOpacity
            style={styles.openMapBtn}
            onPress={() => {
              const url = `https://map.kakao.com/link/search/${encodeURIComponent(keyword + ' 피부과')}`;
              Linking.openURL(url);
            }}
          >
            <Text style={styles.openMapBtnText}>카카오맵 앱으로 직접 검색</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>근처 피부과 찾기</Text>
        <TouchableOpacity
          style={styles.refreshBtn}
          onPress={() => {
            setLoading(true);
            setCoords(null);
            requestLocation();
          }}
        >
          <Text style={{ fontSize: 18 }}>🔄</Text>
        </TouchableOpacity>
      </View>

      {/* 키워드 배지 */}
      {treatmentName && (
        <View style={styles.keywordBadge}>
          <Text style={styles.keywordBadgeText}>✨ "{treatmentName}" 시술 가능한 피부과 탐색</Text>
        </View>
      )}

      {/* 지도 */}
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
          onError={(e) => {
            Alert.alert('오류', '지도를 불러오지 못했어요. 네트워크를 확인해주세요.');
          }}
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
    backgroundColor: Colors.white,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  backBtn: { width: 40, alignItems: 'flex-start' },
  backBtnText: { fontSize: 24, color: Colors.text },
  headerTitle: { fontSize: 17, fontWeight: '700', color: Colors.text },
  refreshBtn: { width: 40, alignItems: 'flex-end' },

  keywordBadge: {
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: 16, paddingVertical: 10,
    alignItems: 'center',
  },
  keywordBadgeText: { fontSize: 13, color: Colors.primary, fontWeight: '600' },

  loadingContainer: {
    flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12,
  },
  loadingText: { fontSize: 15, color: Colors.sub },

  permissionDenied: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    padding: 32, gap: 12,
  },
  permTitle: { fontSize: 20, fontWeight: '800', color: Colors.text, textAlign: 'center' },
  permDesc: { fontSize: 14, color: Colors.sub, textAlign: 'center', lineHeight: 22 },
  permBtn: {
    marginTop: 8, backgroundColor: Colors.primary,
    paddingVertical: 14, paddingHorizontal: 28, borderRadius: 12,
  },
  permBtnText: { color: Colors.white, fontWeight: '700', fontSize: 15 },
  permBtnSecondary: {
    paddingVertical: 10, paddingHorizontal: 20,
  },
  permBtnSecondaryText: { color: Colors.sub, fontSize: 14 },

  webFallback: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    padding: 32, gap: 12,
  },
  webFallbackEmoji: { fontSize: 56 },
  webFallbackTitle: { fontSize: 20, fontWeight: '800', color: Colors.text },
  webFallbackDesc: {
    fontSize: 14, color: Colors.sub, textAlign: 'center', lineHeight: 22,
  },
  openMapBtn: {
    marginTop: 8, backgroundColor: Colors.primary,
    paddingVertical: 14, paddingHorizontal: 24, borderRadius: 12,
  },
  openMapBtnText: { color: Colors.white, fontWeight: '700', fontSize: 14 },
});
