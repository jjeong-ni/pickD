import { useEffect, useRef } from 'react';
import { Stack, router, usePathname } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Platform, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';

/**
 * 비밀번호 재설정은 **로그아웃 상태로 들어온다.**
 * 루트 게이트가 그걸 모르면 두 번 가로챈다 —
 *   ① 세션이 없다고 welcome 으로 쫓아내고,
 *   ② 복구 토큰으로 세션이 서는 순간 SIGNED_IN 으로 보고 (tabs) 로 끌고 간다.
 * 그러면 새 비밀번호를 입력할 화면이 뜨지조차 못한다. 그래서 이 경로만 비켜준다.
 */
const RECOVERY_PATH = '/reset-password';
function isRecoveryPath(p?: string | null): boolean {
  if (p && p.startsWith(RECOVERY_PATH)) return true;
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    if (window.location.pathname.startsWith(RECOVERY_PATH)) return true;
    // 메일 링크가 해시로 떨어지는 경우도 있다
    if (window.location.hash.includes('type=recovery')) return true;
  }
  return false;
}

export default function RootLayout() {
  const { setSession, fetchProfile } = useAuth();
  const pathname = usePathname();
  // 구독 콜백은 마운트 시점 값에 묶이므로, 현재 경로를 ref 로 따로 들고 있어야 한다.
  const pathRef = useRef(pathname);
  useEffect(() => { pathRef.current = pathname; }, [pathname]);

  // Fix: aria-hidden warning on web — blur focused element when route changes
  // (React Navigation sets aria-hidden="true" on inactive screens, which conflicts
  //  with a focused button from the previous screen)
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    if (typeof document !== 'undefined' && document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
  }, [pathname]);

  useEffect(() => {
    // 초기 세션: demo 파라미터가 있으면 리다이렉트 없음
    const isDemoUrl = Platform.OS === 'web' && typeof window !== 'undefined' && window.location.href.includes('demo=');
    // 레퍼럴 코드 저장
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const ref = new URLSearchParams(window.location.search).get('ref');
      if (ref) AsyncStorage.setItem('pendingRef', ref);
    }
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        fetchProfile(session.user.id);
      } else if (!isDemoUrl && !isRecoveryPath(pathRef.current)) {
        router.replace('/(auth)/welcome');
      }
    });

    // 실제 로그인/로그아웃 이벤트에만 리다이렉트
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        if (event === 'SIGNED_IN' && session?.user) {
          fetchProfile(session.user.id);
          // 복구 화면에서 선 세션이면 끌고 가지 않는다 — 비밀번호를 아직 안 바꿨다.
          if (!isRecoveryPath(pathRef.current)) router.replace('/(tabs)');
        } else if (event === 'SIGNED_OUT') {
          router.replace('/(auth)/welcome');
        } else if (session?.user) {
          fetchProfile(session.user.id);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const stack = (
    <>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="reset-password" options={{ presentation: 'card' }} />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="treatment/[id]" options={{ presentation: 'card' }} />
        <Stack.Screen name="device/[id]" options={{ presentation: 'card' }} />
        <Stack.Screen name="post/[id]" options={{ presentation: 'card' }} />
        <Stack.Screen name="post/create" options={{ presentation: 'modal' }} />
        <Stack.Screen name="payment" options={{ presentation: 'modal' }} />
        <Stack.Screen name="coming-soon" options={{ presentation: 'card' }} />
        <Stack.Screen name="purchases" options={{ presentation: 'card' }} />
        <Stack.Screen name="my-posts" options={{ presentation: 'card' }} />
        <Stack.Screen name="point-logs" options={{ presentation: 'card' }} />
        <Stack.Screen name="favorites" options={{ presentation: 'card' }} />
        <Stack.Screen name="face-analysis" options={{ presentation: 'card' }} />
        <Stack.Screen name="skin-analysis" options={{ presentation: 'card' }} />
        <Stack.Screen name="missions" options={{ presentation: 'card' }} />
        <Stack.Screen name="analysis-report" options={{ presentation: 'card' }} />
        <Stack.Screen name="profile-setup" options={{ presentation: 'modal' }} />
        <Stack.Screen name="account" options={{ presentation: 'card' }} />
        <Stack.Screen name="terms" options={{ presentation: 'card' }} />
        <Stack.Screen name="privacy" options={{ presentation: 'card' }} />
        <Stack.Screen name="clinic-map" options={{ presentation: 'card' }} />
        <Stack.Screen name="notifications" options={{ presentation: 'card' }} />
        <Stack.Screen name="skin-report" options={{ presentation: 'card' }} />
        <Stack.Screen name="skin-history" options={{ presentation: 'card' }} />
        <Stack.Screen name="ai-chat" options={{ presentation: 'card' }} />
        <Stack.Screen name="reviews" options={{ presentation: 'card' }} />
        <Stack.Screen name="camera-skin-analysis" options={{ presentation: 'card' }} />
        <Stack.Screen name="routine" options={{ presentation: 'card' }} />
        <Stack.Screen name="skin-diary" options={{ presentation: 'card' }} />
        <Stack.Screen name="ingredient-analysis" options={{ presentation: 'card' }} />
        <Stack.Screen name="partner-clinics" options={{ presentation: 'card' }} />
      </Stack>
    </>
  );

  // 웹: 중앙 정렬 + 유동 max-width (모바일 앱 프레임)
  if (Platform.OS === 'web') {
    return (
      <View style={{ flex: 1, backgroundColor: '#E0D6EC', alignItems: 'center', justifyContent: 'center' }}>
        {/* 배경 데코 */}
        <View style={{
          position: 'absolute', width: 400, height: 400, borderRadius: 200,
          backgroundColor: 'rgba(255,107,157,0.07)', top: -80, right: -60,
        }} />
        <View style={{
          position: 'absolute', width: 300, height: 300, borderRadius: 150,
          backgroundColor: 'rgba(155,111,232,0.06)', bottom: -60, left: -40,
        }} />
        <View style={{
          flex: 1,
          width: '100%',
          // @ts-ignore
          maxWidth: 680,
          backgroundColor: '#fff',
          overflow: 'hidden',
          // @ts-ignore
          boxShadow: '0 0 60px rgba(180,80,140,0.12)',
        }}>
          {stack}
        </View>
      </View>
    );
  }

  return stack;
}
