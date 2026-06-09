import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  TextInput, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Pressable,
} from 'react-native';
import { useEffect, useState } from 'react';
import { useLocalSearchParams, router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../../lib/supabase';
import { Colors } from '../../constants/colors';
import { useAuth } from '../../hooks/useAuth';
import { Post } from '../../types';

const VIRTUAL_NAMES = ['피부미인', '뷰티고수', '피부천재', '스킨케어러', '미용러버', '피부요정', '뷰티스타', '관리러버', '피부빛나', '뷰티천재', '피부사랑', '미용전문'];
function virtualNick(uid: string): string {
  let n = 0;
  for (let i = 0; i < uid.length; i++) n = (n * 31 + uid.charCodeAt(i)) >>> 0;
  return VIRTUAL_NAMES[n % VIRTUAL_NAMES.length];
}

interface Comment {
  id: string;
  user_id: string;
  post_id: string;
  body: string;
  created_at: string;
  profile?: { nickname: string };
}

interface QuizVote {
  option_index: number;
  user_id: string;
}

export default function PostDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user, profile, setProfile, fetchProfile } = useAuth();
  const [post, setPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [networkError, setNetworkError] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [liked, setLiked] = useState(false);

  // Quiz state
  const [quizVotes, setQuizVotes] = useState<QuizVote[]>([]);
  const [userVote, setUserVote] = useState<number | null>(null);
  const [votingLoading, setVotingLoading] = useState(false);

  useEffect(() => {
    fetchData();
    if (id) {
      AsyncStorage.getItem(`liked_post_${id}`).then((val) => {
        if (val === '1') setLiked(true);
      });
    }
  }, [id]);

  // Fetch quiz votes after post is loaded
  useEffect(() => {
    if (post?.category === '퀴즈' && id) {
      fetchQuizVotes();
    }
  }, [post?.category]);

  const fetchQuizVotes = async () => {
    const { data: votes } = await supabase
      .from('quiz_votes')
      .select('option_index, user_id')
      .eq('post_id', id);
    const voteList: QuizVote[] = votes ?? [];
    setQuizVotes(voteList);
    if (user) {
      const myVote = voteList.find((v) => v.user_id === user.id);
      if (myVote) setUserVote(myVote.option_index);
    }
  };

  const fetchData = async () => {
    try {
    const [p, c] = await Promise.all([
      supabase.from('posts').select('*').eq('id', id).single(),
      supabase.from('comments').select('*').eq('post_id', id).order('created_at', { ascending: true }),
    ]);
    if (p.error && p.error.code !== 'PGRST116') {
      setNetworkError(true);
      setLoading(false);
      return;
    }
    if (!p.data) { setLoading(false); return; }

    // Collect all user_ids and fetch nicknames in one query
    const userIds = [p.data.user_id, ...(c.data ?? []).map((cm: any) => cm.user_id)];
    const { data: profiles } = await supabase.from('profiles').select('user_id, nickname').in('user_id', [...new Set(userIds)]);
    const nickMap: Record<string, string> = {};
    (profiles ?? []).forEach((pr: any) => { nickMap[pr.user_id] = pr.nickname; });

    setPost({ ...p.data, profile: { nickname: nickMap[p.data.user_id] || virtualNick(p.data.user_id) } } as any);
    setComments((c.data ?? []).map((cm: any) => ({ ...cm, profile: { nickname: nickMap[cm.user_id] || virtualNick(cm.user_id) } })));
    setLoading(false);
    } catch (e) {
      console.error('fetchData error:', e);
      setNetworkError(true);
      setLoading(false);
    }
  };

  const handleLike = async () => {
    if (!post || liked) return;
    const newLikes = post.likes + 1;
    setPost({ ...post, likes: newLikes });
    setLiked(true);
    await AsyncStorage.setItem(`liked_post_${id}`, '1');
    const { error } = await supabase.from('posts').update({ likes: newLikes }).eq('id', id);
    if (error) {
      // 실패 시 롤백
      setPost({ ...post, likes: post.likes });
      setLiked(false);
      await AsyncStorage.removeItem(`liked_post_${id}`);
      console.error('handleLike error:', error);
      return;
    }
    // Append to liked posts list (for "하트 누른 게시물" tab)
    const raw = await AsyncStorage.getItem('liked_posts');
    let ids: string[] = [];
    try { ids = raw ? JSON.parse(raw) : []; } catch { ids = []; }
    if (!ids.includes(id as string)) {
      await AsyncStorage.setItem('liked_posts', JSON.stringify([...ids, id as string]));
    }
  };

  const handleComment = async () => {
    if (!user || !commentText.trim()) return;
    setSubmitting(true);
    const { data, error: insertError } = await supabase
      .from('comments')
      .insert({ post_id: id, user_id: user.id, body: commentText.trim() })
      .select('*')
      .single();
    if (insertError) {
      Alert.alert('오류', '댓글 등록에 실패했어요. 다시 시도해주세요.');
      setSubmitting(false);
      return;
    }
    if (data) {
      const { data: prof } = await supabase.from('profiles').select('nickname').eq('user_id', user.id).maybeSingle();
      setComments((prev) => [...prev, { ...data, profile: { nickname: prof?.nickname || virtualNick(user.id) } }]);
      setCommentText('');
      if (post) {
        const { error: countError } = await supabase
          .from('posts').update({ comment_count: post.comment_count + 1 }).eq('id', id);
        if (!countError) setPost({ ...post, comment_count: post.comment_count + 1 });
      }
      // 댓글 10pt/일 자동 지급
      const today = new Date().toISOString().split('T')[0];
      const { data: existingLog } = await supabase
        .from('point_logs').select('id').eq('user_id', user.id).eq('reason', '댓글')
        .gte('created_at', `${today}T00:00:00`).limit(1);
      if (!existingLog || existingLog.length === 0) {
        const { data: p } = await supabase.from('profiles').select('points').eq('user_id', user.id).maybeSingle();
        await supabase.from('point_logs').insert({ user_id: user.id, amount: 10, reason: '댓글' });
        await supabase.from('profiles').update({ points: (p?.points ?? 0) + 10 }).eq('user_id', user.id);
        await fetchProfile(user.id);
      }
    }
    setSubmitting(false);
  };

  const handleCloseQuiz = async () => {
    if (!user || !post) return;
    Alert.alert(
      '퀴즈 마감',
      '퀴즈를 마감하면 되돌릴 수 없어요. 지금 투표한 결과로 포인트가 지급됩니다.',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '마감하기', style: 'destructive',
          onPress: async () => {
            setVotingLoading(true);
            try {
              // Mark quiz as closed in body JSON
              let bodyData: any = {};
              try { bodyData = JSON.parse(post.body); } catch {}
              bodyData.closed = true;
              await supabase.from('posts').update({ body: JSON.stringify(bodyData) }).eq('id', post.id);
              setPost({ ...post, body: JSON.stringify(bodyData) });

              // Distribute 50pt to winners based on current votes
              const countA = quizVotes.filter((v) => v.option_index === 0).length;
              const countB = quizVotes.filter((v) => v.option_index === 1).length;
              if (quizVotes.length > 0) {
                let winnerIndices: number[] = [];
                if (countA > countB) winnerIndices = [0];
                else if (countB > countA) winnerIndices = [1];
                else winnerIndices = [0, 1];

                for (const winIdx of winnerIndices) {
                  const winnerIds = quizVotes.filter((v) => v.option_index === winIdx).map((v) => v.user_id);
                  for (const winnerId of winnerIds) {
                    const { data: wp } = await supabase.from('profiles').select('points').eq('user_id', winnerId).maybeSingle();
                    const pts = wp?.points ?? 0;
                    await supabase.from('profiles').update({ points: pts + 50 }).eq('user_id', winnerId);
                    await supabase.from('point_logs').insert({ user_id: winnerId, amount: 50, reason: '퀴즈 당첨' });
                    if (winnerId === user.id && profile) setProfile({ ...profile, points: pts + 50 });
                  }
                }
                Alert.alert('✅ 퀴즈 마감 완료', '다수 투표자에게 50pt가 지급됐어요!');
              } else {
                Alert.alert('✅ 퀴즈 마감 완료', '투표자가 없어 포인트 지급이 없어요.');
              }
            } finally {
              setVotingLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleVote = async (optionIndex: number) => {
    if (!user) {
      Alert.alert('로그인 필요', '투표하려면 로그인해주세요');
      return;
    }
    if (post?.user_id === user.id) {
      Alert.alert('투표 불가', '퀴즈 작성자는 투표할 수 없어요');
      return;
    }
    if (userVote !== null) return;
    const bodyData = (() => { try { return JSON.parse(post?.body ?? '{}'); } catch { return {}; } })();
    if (bodyData.closed) return;

    setVotingLoading(true);
    try {
      const { error } = await supabase
        .from('quiz_votes')
        .insert({ post_id: id, user_id: user.id, option_index: optionIndex });

      if (error) {
        Alert.alert('오류', '투표 중 오류가 발생했어요');
        setVotingLoading(false);
        return;
      }

      setUserVote(optionIndex);

      // Refetch votes
      const { data: votes } = await supabase
        .from('quiz_votes')
        .select('option_index, user_id')
        .eq('post_id', id);
      const newVotes: QuizVote[] = votes ?? [];
      setQuizVotes(newVotes);
    } finally {
      setVotingLoading(false);
    }
  };

  if (loading) return <View style={styles.center}><ActivityIndicator color={Colors.primary} /></View>;
  if (networkError) return (
    <View style={styles.center}>
      <Text style={{ fontSize: 36 }}>📡</Text>
      <Text style={{ fontSize: 15, color: '#8B7B8E', marginTop: 12, textAlign: 'center' }}>
        네트워크 오류가 발생했어요{'\n'}연결 상태를 확인해주세요
      </Text>
      <TouchableOpacity
        onPress={() => { setNetworkError(false); setLoading(true); fetchData(); }}
        style={{ marginTop: 20, paddingVertical: 12, paddingHorizontal: 24, backgroundColor: '#FF6B9D', borderRadius: 12 }}
      >
        <Text style={{ color: '#fff', fontWeight: '700' }}>다시 시도</Text>
      </TouchableOpacity>
    </View>
  );
  if (!post) return <View style={styles.center}><Text>게시글을 찾을 수 없어요</Text></View>;

  // Quiz data
  const isQuiz = post.category === '퀴즈';
  let quizOptions: string[] = [];
  if (isQuiz && post.body) {
    try { quizOptions = JSON.parse(post.body).options ?? []; } catch {}
  }
  const quizBodyData = (() => { try { return JSON.parse(post.body); } catch { return {}; } })();
  const quizClosed = quizBodyData.closed === true;
  const voteCountA = quizVotes.filter((v) => v.option_index === 0).length;
  const voteCountB = quizVotes.filter((v) => v.option_index === 1).length;
  const totalVotes = quizVotes.length;
  const pctA = totalVotes > 0 ? Math.round((voteCountA / totalVotes) * 100) : 0;
  const pctB = totalVotes > 0 ? Math.round((voteCountB / totalVotes) * 100) : 0;
  const winnerIdx = quizClosed ? (voteCountA > voteCountB ? 0 : voteCountB > voteCountA ? 1 : -1) : -1; // -1 = tie or open
  const showResults = userVote !== null || quizClosed;
  const isCreator = user?.id === post.user_id;

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
            {isQuiz ? (
              <View style={styles.quizCategoryBadge}>
                <Text style={styles.quizCategoryBadgeText}>🗳️ 퀴즈</Text>
              </View>
            ) : (
              <Text style={styles.categoryBadge}>{post.category}</Text>
            )}
            <Text style={styles.date}>
              {new Date(post.created_at).toLocaleDateString('ko-KR')}
            </Text>
          </View>
          <Text style={styles.title}>{post.title}</Text>
          <Text style={styles.author}>👤 {(post as any).profile?.nickname ?? virtualNick((post as any).user_id ?? '')}</Text>

          {/* Quiz UI */}
          {isQuiz ? (
            <View style={styles.quizSection}>
              {/* Status badge */}
              <View style={[styles.quizStatusBadge, quizClosed && styles.quizStatusBadgeClosed]}>
                <Text style={[styles.quizStatusText, quizClosed && styles.quizStatusTextClosed]}>
                  {quizClosed ? '✅ 퀴즈 마감' : `🗳️ 투표 진행중 (${totalVotes}명 참여)`}
                </Text>
              </View>

              {/* Creator controls */}
              {isCreator && !quizClosed && (
                <View style={styles.creatorNotice}>
                  <Text style={styles.creatorNoticeText}>작성자는 투표에 참여할 수 없어요</Text>
                  <TouchableOpacity
                    style={styles.closeQuizBtn}
                    onPress={handleCloseQuiz}
                    disabled={votingLoading}
                  >
                    <Text style={styles.closeQuizBtnText}>🔒 퀴즈 마감하기</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Voting buttons or result bars */}
              <View style={styles.quizOptions}>
                {quizOptions.map((opt, idx) => {
                  const voteCount = idx === 0 ? voteCountA : voteCountB;
                  const pct = idx === 0 ? pctA : pctB;
                  const isWinner = quizClosed && (winnerIdx === idx || winnerIdx === -1);
                  const isUserChoice = userVote === idx;
                  const label = idx === 0 ? 'A' : 'B';

                  if (!showResults && !isCreator && !quizClosed) {
                    // Show vote buttons
                    return (
                      <Pressable
                        key={idx}
                        style={[styles.voteButton, votingLoading && styles.voteButtonDisabled]}
                        onPress={() => handleVote(idx)}
                        disabled={votingLoading}
                      >
                        <View style={styles.voteButtonLabel}>
                          <View style={styles.voteOptionBadge}>
                            <Text style={styles.voteOptionBadgeText}>{label}</Text>
                          </View>
                          <Text style={styles.voteButtonText} numberOfLines={2}>{opt}</Text>
                        </View>
                        {votingLoading && <ActivityIndicator size="small" color="#7C5CEB" />}
                      </Pressable>
                    );
                  }

                  // Show result bars
                  return (
                    <View key={idx} style={[styles.resultBar, isUserChoice && styles.resultBarUserChoice, isWinner && styles.resultBarWinner]}>
                      <View style={styles.resultBarHeader}>
                        <View style={[styles.voteOptionBadge, isWinner && styles.voteOptionBadgeWinner]}>
                          <Text style={[styles.voteOptionBadgeText, isWinner && styles.voteOptionBadgeTextWinner]}>{label}</Text>
                        </View>
                        <Text style={styles.resultBarOptionText} numberOfLines={2}>{opt}</Text>
                        {isUserChoice && <Text style={styles.myVoteLabel}>내 선택</Text>}
                        {isWinner && quizClosed && <Text style={styles.winnerLabel}>🏆</Text>}
                      </View>
                      <View style={styles.progressBarBg}>
                        <View style={[
                          styles.progressBarFill,
                          { width: `${pct}%` },
                          isWinner && styles.progressBarFillWinner,
                        ]} />
                      </View>
                      <Text style={styles.resultBarStats}>{voteCount}명 • {pct}%</Text>
                    </View>
                  );
                })}
              </View>

              {!showResults && !isCreator && !quizClosed && (
                <Text style={styles.voteHint}>선택지를 눌러 투표해보세요</Text>
              )}
              {showResults && !quizClosed && (
                <Text style={styles.voteHint}>투표 완료! 작성자가 마감하면 결과가 확정돼요</Text>
              )}
            </View>
          ) : (
            <Text style={styles.body}>{post.body}</Text>
          )}

          <View style={styles.actions}>
            {!isQuiz && (
              <TouchableOpacity style={styles.likeBtn} onPress={handleLike} disabled={liked}>
                <Text style={[styles.likeBtnText, liked && styles.likeBtnActive]}>
                  ❤️ {post.likes}
                </Text>
              </TouchableOpacity>
            )}
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
                  {c.profile?.nickname ?? virtualNick(c.user_id)}
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
  postMeta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  categoryBadge: { fontSize: 12, fontWeight: '700', color: Colors.primary },
  quizCategoryBadge: {
    backgroundColor: '#7C5CEB', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 12,
  },
  quizCategoryBadgeText: { fontSize: 11, fontWeight: '700', color: Colors.white },
  date: { fontSize: 12, color: Colors.sub },
  title: { fontSize: 20, fontWeight: '800', color: Colors.text, lineHeight: 28, marginBottom: 8 },
  author: { fontSize: 13, color: Colors.sub, marginBottom: 16 },
  body: { fontSize: 15, color: Colors.text, lineHeight: 24 },

  // Quiz styles
  quizSection: { gap: 14 },
  quizStatusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20,
    backgroundColor: 'rgba(124,92,235,0.10)', borderWidth: 1, borderColor: '#7C5CEB',
  },
  quizStatusBadgeClosed: {
    backgroundColor: 'rgba(39,174,96,0.10)', borderColor: '#27AE60',
  },
  quizStatusText: { fontSize: 13, fontWeight: '700', color: '#7C5CEB' },
  quizStatusTextClosed: { color: '#27AE60' },
  creatorNotice: {
    backgroundColor: '#F8F4FF', borderRadius: 12, padding: 12,
    borderLeftWidth: 3, borderLeftColor: '#7C5CEB', gap: 10,
  },
  creatorNoticeText: { fontSize: 12, color: '#7C5CEB', fontWeight: '500' },
  closeQuizBtn: {
    backgroundColor: '#7C5CEB', borderRadius: 10,
    paddingVertical: 10, alignItems: 'center',
  },
  closeQuizBtnText: { fontSize: 14, fontWeight: '800', color: '#fff' },
  quizOptions: { gap: 12 },
  voteButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#F8F4FF', borderRadius: 14, padding: 16,
    borderWidth: 1.5, borderColor: '#7C5CEB',
  },
  voteButtonDisabled: { opacity: 0.6 },
  voteButtonLabel: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  voteButtonText: { fontSize: 15, fontWeight: '600', color: Colors.text, flex: 1 },
  voteOptionBadge: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: '#7C5CEB', alignItems: 'center', justifyContent: 'center',
  },
  voteOptionBadgeWinner: { backgroundColor: '#27AE60' },
  voteOptionBadgeText: { fontSize: 12, fontWeight: '800', color: Colors.white },
  voteOptionBadgeTextWinner: { color: Colors.white },
  resultBar: {
    backgroundColor: '#F5F5FA', borderRadius: 14, padding: 14, gap: 8,
    borderWidth: 1.5, borderColor: Colors.border,
  },
  resultBarUserChoice: { borderColor: '#7C5CEB', backgroundColor: '#F8F4FF' },
  resultBarWinner: { borderColor: '#27AE60', backgroundColor: 'rgba(39,174,96,0.05)' },
  resultBarHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  resultBarOptionText: { fontSize: 14, fontWeight: '600', color: Colors.text, flex: 1 },
  myVoteLabel: { fontSize: 11, fontWeight: '700', color: '#7C5CEB', marginLeft: 4 },
  winnerLabel: { fontSize: 16 },
  progressBarBg: {
    height: 8, backgroundColor: Colors.border, borderRadius: 4, overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%', backgroundColor: '#7C5CEB', borderRadius: 4,
  },
  progressBarFillWinner: { backgroundColor: '#27AE60' },
  resultBarStats: { fontSize: 12, color: Colors.sub, fontWeight: '500' },
  voteHint: { fontSize: 12, color: Colors.sub, textAlign: 'center', marginTop: 4 },

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
