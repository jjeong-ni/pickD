import { Tabs } from 'expo-router';
import { Colors } from '../../constants/colors';
import { useCompare } from '../../hooks/useCompare';
import { Text } from 'react-native';

export default function TabsLayout() {
  const compareCount = useCompare((s) => s.items.length);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.sub,
        tabBarStyle: {
          borderTopColor: Colors.border,
          paddingTop: 6,
          paddingBottom: 20,
          height: 76,
        },
        tabBarLabelStyle: { fontSize: 10, fontWeight: '600', marginTop: 2 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: '홈',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 22, color }}>🏠</Text>,
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: '검색',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 22, color }}>🔍</Text>,
        }}
      />
      <Tabs.Screen
        name="compare"
        options={{
          title: '비교함',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 22, color }}>📦</Text>,
          tabBarBadge: compareCount > 0 ? compareCount : undefined,
        }}
      />
      <Tabs.Screen
        name="community"
        options={{
          title: '커뮤니티',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 22, color }}>💬</Text>,
        }}
      />
      <Tabs.Screen
        name="mypage"
        options={{
          title: '마이페이지',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 22, color }}>👤</Text>,
        }}
      />
    </Tabs>
  );
}
