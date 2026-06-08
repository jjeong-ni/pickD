import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Alert, Platform,
} from 'react-native';
import { useEffect, useState } from 'react';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { Colors, HEADER_TOP } from '../constants/colors';
import { Post } from '../types';

export default function MyPostsScreen() {
  const { user } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) fetchPosts();
    else setLoading(false);
  }, [user]);

  const fetchPosts = async () => {
    const { data } = await supabase
      .from('posts')
      .select('*')
      .eq('user_id', user!.id)
      .order('created_at', { ascending: false });
    setPosts(data ?? []);
    setLoading(false);
  };

  const handleDelete = (postId: string, title: string) => {
    Alert.alert('게시글 삭제', `"${title.slice(0, 20)}..." 글을 삭제하시겠어요?`, [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제',
        style: 'destructive',
        onPress: async () => {
          await supabase.from('posts').delete().eq('id', postId).eq('user_id', user!.id);
          setPosts((prev) => prev.filter((p) => p.id !== postId));
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#FF6B9D', '#D473E8', '#9B6FE8']}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.back}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>내가 쓴 글</Text>
        <View style={{ width: 32 }} />
      </LinearGradient>

      {loading ? (
        <View style={styles.center}><ActivityIndicator color={Colors.primary} /></View>
      ) : posts.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyIcon}>✍️</Text>
          <Text style={styles.emptyTitle}>작성한 글이 없어요</Text>
          <Text style={styles.emptyDesc}>커뮤니티에서 첫 글을 남겨보세요</Text>
          <TouchableOpacity style={styles.goBtn} onPress={() => router.push('/(tabs)/community' as any)}>
            <Text style={styles.goBtnText}>커뮤니티 보러가기</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={posts}
          keyExtractor={(i) => i.id}
          contentContainerStyle={{ padding: 16, gap: 10 }}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.card}
              onPress={() => router.push(`/post/${item.id}` as any)}
              activeOpacity={0.8}
            >
              <View style={styles.cardTop}>
                <View style={styles.categoryBadge}>
                  <Text style={styles.categoryText}>{item.category}</Text>
                </View>
                <View style={styles.cardTopRight}>
                  <Text style={styles.date}>
                    {new Date(item.created_at).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}
                  </Text>
                  <TouchableOpacity
                    onPress={() => handleDelete(item.id, item.title)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Text style={styles.deleteBtn}>삭제</Text>
                  </TouchableOpacity>
                </View>
              </View>
              <Text style={styles.postTitle} numberOfLines={2}>{item.title}</Text>
              <Text style={styles.postBody} numberOfLines={2}>{item.body}</Text>
              <View style={styles.meta}>
                <Text style={styles.metaText}>❤️ {item.likes}</Text>
                <Text style={styles.metaText}>💬 {item.comment_count}</Text>
              </View>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 16, paddingTop: HEADER_TOP, paddingBottom: 16,
  },
  back: { fontSize: 24, color: Colors.white, width: 32 },
  title: { fontSize: 17, fontWeight: '700', color: Colors.white },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  emptyIcon: { fontSize: 52 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: Colors.text },
  emptyDesc: { fontSize: 14, color: Colors.sub },
  goBtn: { marginTop: 8, backgroundColor: Colors.primary, paddingVertical: 12, paddingHorizontal: 28, borderRadius: 12 },
  goBtnText: { color: Colors.white, fontWeight: '700', fontSize: 15 },
  card: {
    backgroundColor: Colors.white, borderRadius: 14, padding: 16, gap: 8,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardTopRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  deleteBtn: { fontSize: 12, color: Colors.danger, fontWeight: '600' },
  categoryBadge: { backgroundColor: Colors.primaryLight, paddingVertical: 3, paddingHorizontal: 10, borderRadius: 20 },
  categoryText: { fontSize: 11, fontWeight: '700', color: Colors.primary },
  date: { fontSize: 11, color: Colors.sub },
  postTitle: { fontSize: 15, fontWeight: '700', color: Colors.text, lineHeight: 22 },
  postBody: { fontSize: 13, color: Colors.sub, lineHeight: 20 },
  meta: { flexDirection: 'row', gap: 12 },
  metaText: { fontSize: 12, color: Colors.sub },
});
