import { useEffect } from 'react';
import { Stack, router, usePathname } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Platform, View } from 'react-native';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';

export default function RootLayout() {
  const { setSession, fetchProfile } = useAuth();
  const pathname = usePathname();

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
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        fetchProfile(session.user.id);
      } else if (!isDemoUrl) {
        router.replace('/(auth)/welcome');
      }
    });

    // 실제 로그인/로그아웃 이벤트에만 리다이렉트
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        if (event === 'SIGNED_IN' && session?.user) {
          fetchProfile(session.user.id);
          router.replace('/(tabs)');
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
        <Stack.Screen name="reviews" options={{ presentation: 'card' }} />
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
