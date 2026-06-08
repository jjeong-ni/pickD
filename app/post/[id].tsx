import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  TextInput, ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useEffect, useState } from 'react';
import { useLocalSearchParams, router } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { Colors } from '../../constants/colors';
import { useAuth } from '../../hooks/useAuth';
import { Post } from '../../types';

interface Comment {
  id: string;
  user_id: string;
  post_id: string;
  body: string;
  created_at: string;
  profile?: { nickname: string };
}

export default function PostDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user, fetchProfile } = useAuth();
  const [post, setPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [commentText, setCommentText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [liked, setLiked] = useState(false);

  useEffect(() => {
    fetchData();
    // localStorage로 이미 좋아요한 게시글 확인 (새로고침 후에도 유지)
    if (typeof window !== 'undefined' && id) {
      const key = `liked_post_${id}`;
      if (localStorage.getItem(key) === '1') setLiked(true);
    }
  }, [id]);

  const fetchData = async () => {
    const [p, c] = await Promise.all([
      supabase
        .from('posts')
        .select('*, profile:profiles(nickname)')
        .eq('id', id)
        .single(),
      supabase
        .from('comments')
        .select('*, profile:profiles(nickname)')
        .eq('post_id', id)
        .order('created_at', { ascending: true }),
    ]);
    setPost(p.data);
    setComments(c.data ?? []);
    setLoading(false);
  };

  const handleLike = async () => {
    if (!post || liked) return;
    const newLikes = post.likes + 1;
    await supabase.from('posts').update({ likes: newLikes }).eq('id', id);
    setPost({ ...post, likes: newLikes });
    setLiked(true);
    if (typeof window !== 'undefined' && id) {
      localStorage.setItem(`liked_post_${id}`, '1');
    }
  };

  const handleComment = async () => {
    if (!user || !commentText.trim()) return;
    setSubmitting(true);
    const { data } = await supabase
      .from('comments')
      .insert({ post_id: id, user_id: user.id, body: commentText.trim() })
      .select('*, profile:profiles(nickname)')
      .single();
    if (data) {
      setComments((prev) => [...prev, data]);
      setCommentText('');
      if (post) {
        await supabase.from('posts').update({ comment_count: post.comment_count + 1 }).eq('id', id);
        setPost({ ...post, comment_count: post.comment_count + 1 });
      }
      // 댓글 10pt/일 자동 지급
      const today = new Date().toISOString().split('T')[0];
      const { data: existingLog } = await supabase
        .from('point_logs').select('id').eq('user_id', user.id).eq('reason', '댓글')
        .gte('created_at', `${today}T00:00:00`).limit(1);
      if (!existingLog || existingLog.length === 0) {
        const { data: p } = await supabase.from('profiles').select('points').eq('user_id', user.id).single();
        await supabase.from('point_logs').insert({ user_id: user.id, amount: 10, reason: '댓글' });
        await supabase.from('profiles').update({ points: (p?.points ?? 0) + 10 }).eq('user_id', user.id);
        await fetchProfile(user.id);
      }
    }
    setSubmitting(false);
  };

  if (loading) return <View style={styles.center}><ActivityIndicator color={Colors.primary} /></View>;
  if (!post) return <View style={styles.center}><Text>게시글을 찾을 수 없어요</Text></View>;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: Colors.bg }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* 헤더 */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.backBtn}>←</Text>
          </TouchableOpacity>
        </View>

        {/* 게시글 */}
        <View style={styles.postCard}>
          <View style={styles.postMeta}>
            <Text style={styles.categoryBadge}>{post.category}</Text>
            <Text style={styles.date}>
              {new Date(post.created_at).toLocaleDateString('ko-KR')}
            </Text>
          </View>
          <Text style={styles.title}>{post.title}</Text>
          <Text style={styles.author}>👤 {(post as any).profile?.nickname ?? '익명'}</Text>
          <Text style={styles.body}>{post.body}</Text>

          <View style={styles.actions}>
            <TouchableOpacity style={styles.likeBtn} onPress={handleLike} disabled={liked}>
              <Text style={[styles.likeBtnText, liked && styles.likeBtnActive]}>
                ❤️ {post.likes}
              </Text>
            </TouchableOpacity>
            <Text style={styles.commentCount}>💬 {post.comment_count}</Text>
          </View>
        </View>

        {/* 댓글 */}
        <View style={styles.commentsSection}>
          <Text style={styles.commentsTitle}>댓글 {comments.length}개</Text>
          {comments.length === 0 ? (
            <Text style={styles.noComment}>첫 댓글을 남겨보세요!</Text>
          ) : (
            comments.map((c) => (
              <View key={c.id} style={styles.commentCard}>
                <Text style={styles.commentNickname}>
                  {c.profile?.nickname ?? '익명'}
                </Text>
                <Text style={styles.commentBody}>{c.body}</Text>
                <Text style={styles.commentDate}>
                  {new Date(c.created_at).toLocaleDateString('ko-KR')}
                </Text>
              </View>
            ))
          )}
        </View>

        <View style={{ height: 80 }} />
      </ScrollView>

      {/* 댓글 입력 */}
      {user && (
        <View style={styles.commentInput}>
          <TextInput
            style={styles.input}
            placeholder="댓글을 입력하세요"
            placeholderTextColor={Colors.sub}
            value={commentText}
            onChangeText={setCommentText}
            multiline
          />
          <TouchableOpacity
            style={[styles.sendBtn, !commentText.trim() && styles.sendBtnDisabled]}
            onPress={handleComment}
            disabled={!commentText.trim() || submitting}
          >
            {submitting
              ? <ActivityIndicator color={Colors.white} size="small" />
              : <Text style={styles.sendBtnText}>등록</Text>
            }
          </TouchableOpacity>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    paddingTop: 56, paddingHorizontal: 16, paddingBottom: 8,
    backgroundColor: Colors.white,
  },
  backBtn: { fontSize: 24, color: Colors.text },
  postCard: { backgroundColor: Colors.white, padding: 20, marginBottom: 8 },
  postMeta: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  categoryBadge: { fontSize: 12, fontWeight: '700', color: Colors.primary },
  date: { fontSize: 12, color: Colors.sub },
  title: { fontSize: 20, fontWeight: '800', color: Colors.text, lineHeight: 28, marginBottom: 8 },
  author: { fontSize: 13, color: Colors.sub, marginBottom: 16 },
  body: { fontSize: 15, color: Colors.text, lineHeight: 24 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 16, marginTop: 20, paddingTop: 16, borderTopWidth: 1, borderTopColor: Colors.border },
  likeBtn: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 20, backgroundColor: Colors.bg },
  likeBtnText: { fontSize: 14, color: Colors.sub, fontWeight: '600' },
  likeBtnActive: { color: Colors.danger },
  commentCount: { fontSize: 14, color: Colors.sub },
  commentsSection: { backgroundColor: Colors.white, padding: 20 },
  commentsTitle: { fontSize: 16, fontWeight: '700', color: Colors.text, marginBottom: 16 },
  noComment: { fontSize: 14, color: Colors.sub, textAlign: 'center', paddingVertical: 20 },
  commentCard: {
    paddingVertical: 14, borderTopWidth: 1, borderTopColor: Colors.border,
  },
  commentNickname: { fontSize: 13, fontWeight: '700', color: Colors.text, marginBottom: 4 },
  commentBody: { fontSize: 14, color: Colors.sub, lineHeight: 20 },
  commentDate: { fontSize: 11, color: Colors.sub, marginTop: 4 },
  commentInput: {
    flexDirection: 'row', gap: 8, padding: 12, paddingBottom: 28,
    backgroundColor: Colors.white, borderTopWidth: 1, borderTopColor: Colors.border,
  },
  input: {
    flex: 1, borderWidth: 1, borderColor: Colors.border, borderRadius: 20,
    paddingVertical: 10, paddingHorizontal: 16, fontSize: 14, color: Colors.text,
    maxHeight: 80,
  },
  sendBtn: {
    backgroundColor: Colors.primary, borderRadius: 20,
    paddingVertical: 10, paddingHorizontal: 16, justifyContent: 'center',
  },
  sendBtnDisabled: { backgroundColor: Colors.border },
  sendBtnText: { color: Colors.white, fontWeight: '700', fontSize: 14 },
});
