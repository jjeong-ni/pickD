import {
  View, Text, FlatList, StyleSheet, TouchableOpacity, ActivityIndicator, Platform,
} from 'react-native';
import { useEffect, useState, useCallback } from 'react';
import { router, useFocusEffect } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '../../lib/supabase';
import { Colors } from '../../constants/colors';
import { useAuth } from '../../hooks/useAuth';
import { usePostStore } from '../../hooks/usePostStore';
import { GlassCard } from '../../components/GlassCard';
import { Post } from '../../types';

const CATEGORIES = ['전체', '후기', '질문', '정보', '비교'];

const NOTICES = [
  {
    id: 'notice-1',
    title: '📌 픽디 커뮤니티 이용 가이드 (필독)',
    body: '건강한 소통 문화를 위해 가이드라인을 꼭 확인해주세요. 욕설, 비방, 광고 등은 제재 대상입니다.',
    date: '2026.05.01',
  },
  {
    id: 'notice-2',
    title: '📢 베타테스트 참여 감사 이벤트 안내',
    body: '소중한 의견을 주셔서 감사합니다. 리뷰 작성 시 포인트 2배 지급됩니다.',
    date: '2026.05.10',
  },
  {
    id: 'notice-3',
    title: '🆕 기기·시술 비교 기능 업데이트 안내',
    body: '최대 3개 시술·기기를 한 번에 비교할 수 있습니다. 비교함 탭을 확인해보세요!',
    date: '2026.05.20',
  },
];

const SPAM_KEYWORDS = ['링크', '클릭하세요', '구매하세요', '할인쿠폰', '공구', '협찬', '무료증정', '한정수량', '세일중', '이벤트참여'];

function isSpamPost(title: string, body: string): boolean {
  const text = `${title} ${body}`;
  return SPAM_KEYWORDS.some((kw) => text.includes(kw));
}

export default function CommunityScreen() {
  const { user } = useAuth();
  const { refreshKey } = usePostStore();
  const [category, setCategory] = useState('전체');
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [revealedIds, setRevealedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchPosts();
  }, [category, refreshKey]);

  useFocusEffect(
    useCallback(() => {
      fetchPosts();
    }, [category])
  );

  const fetchPosts = async () => {
    setLoading(true);
    let q = supabase
      .from('posts')
      .select('*, profile:profiles(nickname)')
      .order('created_at', { ascending: false })
      .limit(30);
    if (category !== '전체') q = q.eq('category', category);
    const { data } = await q;
    setPosts(data ?? []);
    setLoading(false);
  };

  const revealPost = (id: string) => {
    setRevealedIds((prev) => new Set([...prev, id]));
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#FF6B9D', '#D473E8', '#9B6FE8']}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <Text style={styles.title}>커뮤니티</Text>
        {user && (
          <TouchableOpacity onPress={() => router.push('/post/create' as any)} activeOpacity={0.85}>
            <GlassCard style={styles.writeBtn} intensity="low">
              <Text style={styles.writeBtnText}>✏️ 글쓰기</Text>
            </GlassCard>
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        horizontal
        data={CATEGORIES}
        keyExtractor={(i) => i}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filters}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.filter, item === category && styles.filterActive]}
            onPress={() => setCategory(item)}
          >
            <Text style={[styles.filterText, item === category && styles.filterTextActive]}>
              {item}
            </Text>
          </TouchableOpacity>
        )}
      />

      {loading ? (
        <View style={styles.center}><ActivityIndicator color={Colors.primary} /></View>
      ) : (
        <FlatList
          data={posts}
          keyExtractor={(i) => i.id}
          contentContainerStyle={{ paddingBottom: 20 }}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          ListHeaderComponent={<NoticeSection />}
          ListEmptyComponent={() => (
            <View style={styles.center}>
              <Text style={styles.emptyIcon}>📝</Text>
              <Text style={styles.emptyText}>아직 게시글이 없어요</Text>
              {user && (
                <TouchableOpacity style={styles.writeEmptyBtn} onPress={() => router.push('/post/create')}>
                  <Text style={styles.writeEmptyBtnText}>첫 글 작성하기</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
          renderItem={({ item }) => {
            const spam = isSpamPost(item.title, item.body);
            const revealed = revealedIds.has(item.id);
            return (
              <TouchableOpacity
                style={styles.postCard}
                onPress={() => !spam || revealed ? router.push(`/post/${item.id}`) : undefined}
                activeOpacity={spam && !revealed ? 1 : 0.7}
              >
                {/* 게시글 본문 (스팸이면 흐림) */}
                <View style={spam && !revealed ? styles.blurred : undefined}>
                  <View style={styles.postHeader}>
                    <Text style={styles.categoryBadge}>{item.category}</Text>
                    <Text style={styles.postDate}>
                      {new Date(item.created_at).toLocaleDateString('ko-KR')}
                    </Text>
                  </View>
                  <Text style={styles.postTitle} numberOfLines={2}>{item.title}</Text>
                  <Text style={styles.postBody} numberOfLines={2}>{item.body}</Text>
                  <View style={styles.postFooter}>
                    <Text style={styles.postAuthor}>
                      👤 {(item as any).profile?.nickname ?? '익명'}
                    </Text>
                    <View style={styles.postMeta}>
                      <Text style={styles.postMetaText}>❤️ {item.likes}</Text>
                      <Text style={styles.postMetaText}>💬 {item.comment_count}</Text>
                    </View>
                  </View>
                </View>

                {/* 광고 의심 오버레이 */}
                {spam && !revealed && (
                  <View style={styles.spamOverlay}>
                    <Text style={styles.spamIcon}>⚠️</Text>
                    <Text style={styles.spamLabel}>광고 의심 게시글입니다</Text>
                    <TouchableOpacity style={styles.spamBtn} onPress={() => revealPost(item.id)}>
                      <Text style={styles.spamBtnText}>확인</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </TouchableOpacity>
            );
          }}
        />
      )}

      {!user && (
        <View style={styles.loginBanner}>
          <Text style={styles.loginBannerText}>로그인하면 글을 작성할 수 있어요</Text>
          <TouchableOpacity onPress={() => router.push('/(auth)/login')}>
            <Text style={styles.loginBannerBtn}>로그인</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

function NoticeSection() {
  const [expanded, setExpanded] = useState<string | null>(null);

  return (
    <View style={noticeStyles.container}>
      {NOTICES.map((n) => (
        <TouchableOpacity
          key={n.id}
          style={noticeStyles.row}
          onPress={() => setExpanded(expanded === n.id ? null : n.id)}
          activeOpacity={0.7}
        >
          <View style={noticeStyles.rowMain}>
            <View style={noticeStyles.badge}>
              <Text style={noticeStyles.badgeText}>공지</Text>
            </View>
            <Text style={noticeStyles.title} numberOfLines={expanded === n.id ? undefined : 1}>
              {n.title}
            </Text>
          </View>
          {expanded === n.id && (
            <Text style={noticeStyles.body}>{n.body}</Text>
          )}
          <Text style={noticeStyles.date}>{n.date}</Text>
        </TouchableOpacity>
      ))}
      <View style={noticeStyles.divider} />
    </View>
  );
}

const noticeStyles = StyleSheet.create({
  container: { backgroundColor: '#FFFBF0' },
  row: {
    paddingHorizontal: 20, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: '#F0EAD0',
  },
  rowMain: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  badge: {
    backgroundColor: '#F5A623', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4,
  },
  badgeText: { fontSize: 10, fontWeight: '700', color: Colors.white },
  title: { flex: 1, fontSize: 13, fontWeight: '600', color: Colors.text },
  body: { fontSize: 12, color: Colors.sub, marginTop: 6, lineHeight: 18 },
  date: { fontSize: 11, color: Colors.sub, marginTop: 4 },
  divider: { height: 6, backgroundColor: '#F2F2F7' },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 20, paddingTop: Platform.OS === 'web' ? 60 : 56, paddingBottom: 16,
  },
  title: { fontSize: 22, fontWeight: '900', color: '#fff' },
  writeBtn: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 20 },
  writeBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  filters: { paddingHorizontal: 20, paddingVertical: 12, gap: 8, backgroundColor: Colors.white },
  filter: {
    paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20,
    borderWidth: 1, borderColor: Colors.border,
  },
  filterActive: { borderColor: Colors.primary, backgroundColor: 'rgba(255,107,157,0.08)' },
  filterText: { fontSize: 13, color: Colors.sub },
  filterTextActive: { color: Colors.primary, fontWeight: '600' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40, gap: 12 },
  emptyIcon: { fontSize: 48 },
  emptyText: { fontSize: 15, color: Colors.sub },
  writeEmptyBtn: {
    marginTop: 4, backgroundColor: Colors.primary,
    paddingVertical: 10, paddingHorizontal: 24, borderRadius: 20,
  },
  writeEmptyBtnText: { color: Colors.white, fontWeight: '700', fontSize: 14 },
  separator: { height: 1, backgroundColor: Colors.border },
  postCard: { padding: 20, backgroundColor: Colors.white, overflow: 'hidden' },
  blurred: { opacity: 0.15 },
  spamOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    alignItems: 'center', justifyContent: 'center', gap: 6,
  },
  spamIcon: { fontSize: 24 },
  spamLabel: { fontSize: 14, fontWeight: '700', color: Colors.primary },
  spamBtn: {
    marginTop: 4, backgroundColor: Colors.primary,
    paddingVertical: 8, paddingHorizontal: 28, borderRadius: 20,
  },
  spamBtnText: { color: Colors.white, fontWeight: '700', fontSize: 14 },
  postHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  categoryBadge: { fontSize: 11, fontWeight: '700', color: Colors.primary },
  postDate: { fontSize: 11, color: Colors.sub },
  postTitle: { fontSize: 16, fontWeight: '700', color: Colors.text, marginBottom: 6 },
  postBody: { fontSize: 14, color: Colors.sub, lineHeight: 20 },
  postFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 },
  postAuthor: { fontSize: 12, color: Colors.sub },
  postMeta: { flexDirection: 'row', gap: 12 },
  postMetaText: { fontSize: 12, color: Colors.sub },
  loginBanner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 16, paddingHorizontal: 20, backgroundColor: Colors.white,
    borderTopWidth: 1, borderTopColor: Colors.border,
  },
  loginBannerText: { fontSize: 13, color: Colors.sub },
  loginBannerBtn: { fontSize: 13, fontWeight: '700', color: Colors.primary },
});
