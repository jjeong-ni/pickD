import {
  View, Text, FlatList, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator, Platform,
} from 'react-native';
import { useEffect, useState, useCallback } from 'react';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '../../lib/supabase';
import { Colors, HEADER_TOP } from '../../constants/colors';
import { useAuth } from '../../hooks/useAuth';
import { usePostStore } from '../../hooks/usePostStore';
import { useResponsive } from '../../hooks/useResponsive';
import { GlassCard } from '../../components/GlassCard';
import { Post } from '../../types';

type PostWithVoteCount = Post & { quizVoteCount?: number };

const CATEGORIES = ['전체', '후기', '질문', '정보', '비교', '퀴즈'];

const VIRTUAL_NAMES = ['피부미인', '뷰티고수', '피부천재', '스킨케어러', '미용러버', '피부요정', '뷰티스타', '관리러버', '피부빛나', '뷰티천재', '피부사랑', '미용전문'];
function virtualNick(uid: string): string {
  let n = 0;
  for (let i = 0; i < uid.length; i++) n = (n * 31 + uid.charCodeAt(i)) >>> 0;
  return VIRTUAL_NAMES[n % VIRTUAL_NAMES.length];
}

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
  const { hPad } = useResponsive();
  const [category, setCategory] = useState('전체');
  const [posts, setPosts] = useState<PostWithVoteCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const [revealedIds, setRevealedIds] = useState<Set<string>>(new Set());

  const fetchPosts = useCallback(async () => {
    setLoading(true);
    setFetchError(false);
    try {
      let q = supabase
        .from('posts')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(30);
      if (category !== '전체') q = q.eq('category', category);
      const { data } = await q;
      const fetchedPosts: PostWithVoteCount[] = data ?? [];

      // Fetch nicknames separately (avoids FK dependency)
      if (fetchedPosts.length > 0) {
        const userIds = [...new Set(fetchedPosts.map((p) => p.user_id))];
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('user_id, nickname')
          .in('user_id', userIds);
        const profileMap: Record<string, string> = {};
        for (const pr of profilesData ?? []) {
          profileMap[pr.user_id] = pr.nickname;
        }
        for (const post of fetchedPosts) {
          (post as any).profile = { nickname: profileMap[post.user_id] || virtualNick(post.user_id) };
        }
      }

      // For quiz posts, fetch vote counts (table may not exist yet)
      try {
        const quizPosts = fetchedPosts.filter((p) => p.category === '퀴즈');
        if (quizPosts.length > 0) {
          const quizIds = quizPosts.map((p) => p.id);
          const { data: votes } = await supabase
            .from('quiz_votes')
            .select('post_id')
            .in('post_id', quizIds);
          if (votes) {
            const countMap: Record<string, number> = {};
            for (const v of votes) {
              countMap[v.post_id] = (countMap[v.post_id] ?? 0) + 1;
            }
            for (const post of fetchedPosts) {
              if (post.category === '퀴즈') {
                post.quizVoteCount = countMap[post.id] ?? 0;
              }
            }
          }
        }
      } catch (e) {
        console.error('quiz_votes fetch error:', e);
      }

      setPosts(fetchedPosts);
    } catch (e) {
      console.error('fetchPosts error:', e);
      setFetchError(true);
      setPosts([]);
    } finally {
      setLoading(false);
    }
  }, [category]);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts, refreshKey]);

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
      </LinearGradient>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filters}
      >
        {CATEGORIES.map((item) => (
          <TouchableOpacity
            key={item}
            style={[styles.filter, item === category && styles.filterActive]}
            onPress={() => setCategory(item)}
          >
            <Text style={[styles.filterText, item === category && styles.filterTextActive]}>
              {item}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {loading ? (
        <View style={styles.center}><ActivityIndicator color={Colors.primary} /></View>
      ) : fetchError ? (
        <View style={styles.center}>
          <Text style={styles.emptyIcon}>⚠️</Text>
          <Text style={styles.emptyText}>게시글을 불러오지 못했어요</Text>
          <TouchableOpacity style={styles.writeEmptyBtn} onPress={fetchPosts}>
            <Text style={styles.writeEmptyBtnText}>다시 시도</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={posts}
          keyExtractor={(i) => i.id}
          contentContainerStyle={{ paddingBottom: 20, paddingHorizontal: 0 }}
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
            const isQuizPost = item.category === '퀴즈';

            if (isQuizPost) {
              const voteCount = item.quizVoteCount ?? 0;
              const quizClosed = voteCount >= 4;
              return (
                <TouchableOpacity
                  style={styles.quizCard}
                  onPress={() => router.push(`/post/${item.id}`)}
                  activeOpacity={0.7}
                >
                  <View style={styles.quizCardHeader}>
                    <View style={styles.quizBadge}>
                      <Text style={styles.quizBadgeText}>🗳️ 퀴즈</Text>
                    </View>
                    <Text style={styles.postDate}>
                      {new Date(item.created_at).toLocaleDateString('ko-KR')}
                    </Text>
                  </View>
                  <Text style={styles.postTitle} numberOfLines={2}>{item.title}</Text>
                  <View style={styles.quizStatusRow}>
                    <View style={[styles.quizStatusBadge, quizClosed && styles.quizStatusBadgeClosed]}>
                      <Text style={[styles.quizStatusText, quizClosed && styles.quizStatusTextClosed]}>
                        {quizClosed ? '✅ 마감됨' : `투표 진행중 (${voteCount}/4명)`}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.postFooter}>
                    <Text style={styles.postAuthor}>
                      👤 {(item as any).profile?.nickname ?? '익명'}
                    </Text>
                    <View style={styles.postMeta}>
                      <Text style={styles.postMetaText}>💬 {item.comment_count}</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            }

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
    padding: 20, paddingTop: HEADER_TOP, paddingBottom: 16,
  },
  title: { fontSize: 22, fontWeight: '900', color: '#fff' },
  writeBtn: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 20 },
  writeBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  filters: { paddingHorizontal: 16, paddingVertical: 12, gap: 8, backgroundColor: Colors.white, flexDirection: 'row', alignItems: 'center' },
  filter: {
    paddingVertical: 10, paddingHorizontal: 18, borderRadius: 20,
    borderWidth: 1.5, borderColor: Colors.border,
    minHeight: 40, justifyContent: 'center', alignItems: 'center',
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
  quizCard: {
    padding: 20, backgroundColor: '#F0F4FF', overflow: 'hidden',
    borderLeftWidth: 4, borderLeftColor: '#7C5CEB',
  },
  quizCardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  quizBadge: {
    backgroundColor: '#7C5CEB', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 12,
  },
  quizBadgeText: { fontSize: 11, fontWeight: '700', color: Colors.white },
  quizStatusRow: { flexDirection: 'row', marginBottom: 10, marginTop: 4 },
  quizStatusBadge: {
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12,
    backgroundColor: 'rgba(124,92,235,0.12)', borderWidth: 1, borderColor: '#7C5CEB',
  },
  quizStatusBadgeClosed: {
    backgroundColor: 'rgba(39,174,96,0.12)', borderColor: '#27AE60',
  },
  quizStatusText: { fontSize: 12, fontWeight: '600', color: '#7C5CEB' },
  quizStatusTextClosed: { color: '#27AE60' },
});
