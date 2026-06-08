import { useEffect } from 'react';
import { Stack, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Platform, View } from 'react-native';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';

export default function RootLayout() {
  const { setSession, fetchProfile } = useAuth();

  useEffect(() => {
    // 초기 세션: 상태만 설정, 강제 리다이렉트 없음 (직접 URL 진입 유지)
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
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
      </Stack>
    </>
  );

  // 데스크톱 웹: 중앙 정렬 + max-width로 모바일 앱 프레임 연출
  if (Platform.OS === 'web') {
    return (
      <View style={{ flex: 1, backgroundColor: '#E8E8ED', alignItems: 'center' }}>
        <View style={{ flex: 1, width: '100%', maxWidth: 430, backgroundColor: '#fff', overflow: 'hidden' }}>
          {stack}
        </View>
      </View>
    );
  }

  return stack;
}
