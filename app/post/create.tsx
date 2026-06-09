import {
  View, Text, TextInput, StyleSheet, TouchableOpacity,
  ScrollView, KeyboardAvoidingView, Platform, Alert, ActivityIndicator,
} from 'react-native';
import { useState } from 'react';
import { router } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { usePostStore } from '../../hooks/usePostStore';
import { Colors } from '../../constants/colors';

const TITLE_MAX = 50;
const BODY_MAX = 2000;

const CATEGORIES: { label: string; desc: string }[] = [
  { label: '후기', desc: '시술·기기 사용 경험을 공유해요' },
  { label: '질문', desc: '궁금한 점을 자유롭게 물어보세요' },
  { label: '정보', desc: '유용한 뷰티·피부 정보를 나눠요' },
  { label: '비교', desc: '시술이나 제품을 직접 비교해봐요' },
  { label: '퀴즈', desc: '100pt로 퀴즈를 만들어요' },
];

export default function CreatePostScreen() {
  const { user, fetchProfile, profile } = useAuth();
  const { triggerRefresh } = usePostStore();
  const [category, setCategory] = useState('후기');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [optionA, setOptionA] = useState('');
  const [optionB, setOptionB] = useState('');
  const [loading, setLoading] = useState(false);

  const isQuiz = category === '퀴즈';
  const canSubmit = isQuiz
    ? title.trim().length >= 2 && optionA.trim().length >= 1 && optionB.trim().length >= 1 && !loading
    : title.trim().length >= 2 && body.trim().length >= 10 && !loading;
  const selectedCatDesc = CATEGORIES.find((c) => c.label === category)?.desc ?? '';

  const handleSubmit = async () => {
    if (!canSubmit || !user) return;
    setLoading(true);

    if (isQuiz) {
      const currentPoints = profile?.points ?? 0;
      if (currentPoints < 100) {
        Alert.alert('포인트 부족', '퀴즈 생성에 100pt가 필요해요');
        setLoading(false);
        return;
      }
      // 포인트 차감 먼저 (서버사이드 atomic) → 성공 시 포스트 등록
      const { data: deductData, error: deductError } = await supabase.rpc('deduct_points', {
        p_user_id: user.id,
        p_amount: 100,
        p_reason: '퀴즈 생성',
      });
      if (deductError || !deductData?.success) {
        if (deductData?.error === 'insufficient_points') {
          Alert.alert('포인트 부족', '퀴즈 생성에 100pt가 필요해요');
        } else {
          Alert.alert('오류', '포인트 차감 중 오류가 발생했어요');
        }
        setLoading(false);
        return;
      }
      const { error: postError } = await supabase.from('posts').insert({
        user_id: user.id,
        title: title.trim(),
        body: JSON.stringify({ options: [optionA.trim(), optionB.trim()] }),
        category,
      });
      if (postError) {
        Alert.alert('오류', '퀴즈 작성 중 오류가 발생했어요');
        setLoading(false);
        return;
      }
      await fetchProfile(user.id);
      setLoading(false);
      triggerRefresh();
      router.back();
      return;
    }

    // Normal post
    const { error } = await supabase.from('posts').insert({
      user_id: user.id, title: title.trim(), body: body.trim(), category,
    });
    if (error) {
      Alert.alert('오류', '게시글 작성 중 오류가 발생했어요');
      setLoading(false);
      return;
    }
    // 첫 게시물 500pt 자동 지급 (중복 확인 후 RPC로 atomic 지급)
    const { data: existingLog } = await supabase
      .from('point_logs').select('id').eq('user_id', user.id).eq('reason', '첫 게시물').limit(1);
    if (!existingLog || existingLog.length === 0) {
      const { data: awarded } = await supabase.rpc('add_points', {
        p_user_id: user.id,
        p_amount: 500,
        p_reason: '첫 게시물',
      });
      if (awarded?.success) {
        await fetchProfile(user.id);
        Alert.alert('🎉 첫 게시물 축하해요!', '500pt가 지급됐어요!');
      }
    }
    setLoading(false);
    triggerRefresh();
    router.back();
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: Colors.white }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* 상단 바 */}
      <View style={styles.nav}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.cancel}>취소</Text>
        </TouchableOpacity>
        <Text style={styles.navTitle}>글 작성</Text>
        <TouchableOpacity onPress={handleSubmit} disabled={!canSubmit}>
          {loading
            ? <ActivityIndicator color={Colors.primary} />
            : <Text style={[styles.submit, !canSubmit && styles.submitDisabled]}>등록</Text>
          }
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">

        {/* 카테고리 */}
        <View>
          <Text style={styles.sectionLabel}>카테고리</Text>
          <View style={styles.categoryRow}>
            {CATEGORIES.map((c) => (
              <TouchableOpacity
                key={c.label}
                style={[styles.catChip, c.label === category && styles.catChipActive]}
                onPress={() => setCategory(c.label)}
              >
                <Text style={[styles.catText, c.label === category && styles.catTextActive]}>{c.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={styles.catDesc}>{selectedCatDesc}</Text>
        </View>

        {/* 제목 */}
        <View>
          <View style={styles.fieldHeader}>
            <Text style={styles.sectionLabel}>제목</Text>
            <Text style={[styles.charCount, title.length >= TITLE_MAX && styles.charCountOver]}>
              {title.length}/{TITLE_MAX}
            </Text>
          </View>
          <TextInput
            style={styles.titleInput}
            placeholder="제목을 입력하세요 (2자 이상)"
            placeholderTextColor={Colors.sub}
            value={title}
            onChangeText={setTitle}
            maxLength={TITLE_MAX}
          />
        </View>

        {/* 퀴즈 안내 배너 */}
        {isQuiz && (
          <View style={styles.quizNoticeBanner}>
            <Text style={styles.quizNoticeText}>
              🗳️ 퀴즈 생성 비용: 100pt • 4명 투표 시 마감 • 다수 투표자 50pt 지급
            </Text>
          </View>
        )}

        {/* 내용 / 퀴즈 선택지 */}
        {isQuiz ? (
          <View style={{ gap: 16 }}>
            <View>
              <View style={styles.fieldHeader}>
                <Text style={styles.sectionLabel}>선택지 A</Text>
                <Text style={[styles.charCount, optionA.length >= 30 && styles.charCountOver]}>
                  {optionA.length}/30
                </Text>
              </View>
              <TextInput
                style={styles.titleInput}
                placeholder="선택지 A를 입력하세요"
                placeholderTextColor={Colors.sub}
                value={optionA}
                onChangeText={(t) => setOptionA(t.slice(0, 30))}
                maxLength={30}
              />
            </View>
            <View>
              <View style={styles.fieldHeader}>
                <Text style={styles.sectionLabel}>선택지 B</Text>
                <Text style={[styles.charCount, optionB.length >= 30 && styles.charCountOver]}>
                  {optionB.length}/30
                </Text>
              </View>
              <TextInput
                style={styles.titleInput}
                placeholder="선택지 B를 입력하세요"
                placeholderTextColor={Colors.sub}
                value={optionB}
                onChangeText={(t) => setOptionB(t.slice(0, 30))}
                maxLength={30}
              />
            </View>
          </View>
        ) : (
          <View>
            <View style={styles.fieldHeader}>
              <Text style={styles.sectionLabel}>내용</Text>
              <Text style={[styles.charCount, body.length >= BODY_MAX && styles.charCountOver]}>
                {body.length}/{BODY_MAX}
              </Text>
            </View>
            <TextInput
              style={styles.bodyInput}
              placeholder="내용을 입력하세요 (10자 이상)"
              placeholderTextColor={Colors.sub}
              value={body}
              onChangeText={(t) => setBody(t.slice(0, BODY_MAX))}
              multiline
              textAlignVertical="top"
            />
          </View>
        )}

        {/* 등록 조건 안내 */}
        {!canSubmit && (title.length > 0 || body.length > 0 || optionA.length > 0 || optionB.length > 0) && (
          <View style={styles.conditionBox}>
            <Text style={styles.conditionTitle}>등록 조건</Text>
            <Text style={[styles.conditionItem, title.trim().length >= 2 && styles.conditionOk]}>
              {title.trim().length >= 2 ? '✓' : '○'} 제목 2자 이상
            </Text>
            {isQuiz ? (
              <>
                <Text style={[styles.conditionItem, optionA.trim().length >= 1 && styles.conditionOk]}>
                  {optionA.trim().length >= 1 ? '✓' : '○'} 선택지 A 1자 이상
                </Text>
                <Text style={[styles.conditionItem, optionB.trim().length >= 1 && styles.conditionOk]}>
                  {optionB.trim().length >= 1 ? '✓' : '○'} 선택지 B 1자 이상
                </Text>
              </>
            ) : (
              <Text style={[styles.conditionItem, body.trim().length >= 10 && styles.conditionOk]}>
                {body.trim().length >= 10 ? '✓' : '○'} 내용 10자 이상
              </Text>
            )}
          </View>
        )}

        {/* 커뮤니티 가이드 */}
        <View style={styles.guideBox}>
          <Text style={styles.guideText}>
            💡 픽디 커뮤니티 가이드{'\n'}
            광고·홍보·욕설·비방 게시글은 삭제될 수 있으며, 반복 위반 시 이용이 제한될 수 있어요.
          </Text>
        </View>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  nav: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 16, paddingTop: 56, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  cancel: { fontSize: 16, color: Colors.sub },
  navTitle: { fontSize: 16, fontWeight: '700', color: Colors.text },
  submit: { fontSize: 16, fontWeight: '700', color: Colors.primary },
  submitDisabled: { color: Colors.border },
  content: { padding: 20, gap: 24 },
  sectionLabel: { fontSize: 12, fontWeight: '700', color: Colors.sub, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 },
  categoryRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  catChip: {
    paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20,
    borderWidth: 1, borderColor: Colors.border,
  },
  catChipActive: { borderColor: Colors.primary, backgroundColor: 'rgba(255,107,157,0.08)' },
  catText: { fontSize: 13, color: Colors.sub },
  catTextActive: { color: Colors.primary, fontWeight: '600' },
  catDesc: { fontSize: 12, color: Colors.sub, marginTop: 8 },
  fieldHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  charCount: { fontSize: 12, color: Colors.sub },
  charCountOver: { color: Colors.danger },
  titleInput: {
    fontSize: 17, fontWeight: '700', color: Colors.text,
    borderBottomWidth: 1, borderBottomColor: Colors.border, paddingBottom: 12,
  },
  bodyInput: {
    fontSize: 15, color: Colors.text, minHeight: 200, lineHeight: 24,
    borderWidth: 1, borderColor: Colors.border, borderRadius: 12,
    padding: 14, textAlignVertical: 'top',
  },
  conditionBox: {
    backgroundColor: '#FFF8F0', borderRadius: 10, padding: 14, gap: 6,
    borderLeftWidth: 3, borderLeftColor: '#F5A623',
  },
  conditionTitle: { fontSize: 12, fontWeight: '700', color: '#B87D00', marginBottom: 2 },
  conditionItem: { fontSize: 13, color: Colors.sub },
  conditionOk: { color: '#27AE60', fontWeight: '600' },
  guideBox: {
    backgroundColor: Colors.bg, borderRadius: 10, padding: 14,
  },
  guideText: { fontSize: 12, color: Colors.sub, lineHeight: 20 },
  quizNoticeBanner: {
    backgroundColor: 'rgba(124,92,235,0.08)', borderRadius: 10, padding: 14,
    borderLeftWidth: 3, borderLeftColor: '#7C5CEB',
  },
  quizNoticeText: { fontSize: 13, color: '#7C5CEB', fontWeight: '600', lineHeight: 20 },
});
