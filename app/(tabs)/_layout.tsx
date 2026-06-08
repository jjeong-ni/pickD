import { Tabs } from 'expo-router';
import { Platform, View, StyleSheet } from 'react-native';
import { Text } from 'react-native';
import { useCompare } from '../../hooks/useCompare';

function GlassTabBar() {
  return (
    <View style={styles.tabBg} />
  );
}

export default function TabsLayout() {
  const compareCount = useCompare((s) => s.items.length);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#FF6B9D',
        tabBarInactiveTintColor: 'rgba(139,123,142,0.6)',
        tabBarBackground: () => <GlassTabBar />,
        tabBarStyle: {
          backgroundColor: 'transparent',
          borderTopWidth: 0,
          borderTopColor: 'transparent',
          paddingTop: 6,
          paddingBottom: Platform.OS === 'ios' ? 20 : 10,
          height: Platform.OS === 'ios' ? 84 : 68,
          elevation: 0,
        },
        tabBarLabelStyle: { fontSize: 10, fontWeight: '700', marginTop: 0 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: '홈',
          tabBarIcon: ({ color, focused }) => (
            <Text style={{ fontSize: 22, opacity: focused ? 1 : 0.55 }}>🏠</Text>
          ),
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: '검색',
          tabBarIcon: ({ color, focused }) => (
            <Text style={{ fontSize: 22, opacity: focused ? 1 : 0.55 }}>🔍</Text>
          ),
        }}
      />
      <Tabs.Screen
        name="compare"
        options={{
          title: '비교함',
          tabBarIcon: ({ color, focused }) => (
            <Text style={{ fontSize: 22, opacity: focused ? 1 : 0.55 }}>📦</Text>
          ),
          tabBarBadge: compareCount > 0 ? compareCount : undefined,
        }}
      />
      <Tabs.Screen
        name="community"
        options={{
          title: '커뮤니티',
          tabBarIcon: ({ color, focused }) => (
            <Text style={{ fontSize: 22, opacity: focused ? 1 : 0.55 }}>💬</Text>
          ),
        }}
      />
      <Tabs.Screen
        name="mypage"
        options={{
          title: '마이페이지',
          tabBarIcon: ({ color, focused }) => (
            <Text style={{ fontSize: 22, opacity: focused ? 1 : 0.55 }}>👤</Text>
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBg: {
    flex: 1,
    backgroundColor: Platform.OS === 'web' ? 'rgba(255,255,255,0.88)' : 'rgba(255,255,255,0.95)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,107,157,0.12)',
    // @ts-ignore - web only
    ...(Platform.OS === 'web' ? { backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)' } : {}),
  },
});
