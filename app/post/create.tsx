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
];

export default function CreatePostScreen() {
  const { user, fetchProfile } = useAuth();
  const { triggerRefresh } = usePostStore();
  const [category, setCategory] = useState('후기');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [loading, setLoading] = useState(false);

  const canSubmit = title.trim().length >= 2 && body.trim().length >= 10 && !loading;
  const selectedCatDesc = CATEGORIES.find((c) => c.label === category)?.desc ?? '';

  const handleSubmit = async () => {
    if (!canSubmit || !user) return;
    setLoading(true);
    const { error } = await supabase.from('posts').insert({
      user_id: user.id, title: title.trim(), body: body.trim(), category,
    });
    if (error) {
      Alert.alert('오류', '게시글 작성 중 오류가 발생했어요');
      setLoading(false);
      return;
    }
    // 첫 게시물 500pt 자동 지급
    const { data: existingLog } = await supabase
      .from('point_logs').select('id').eq('user_id', user.id).eq('reason', '첫 게시물').limit(1);
    if (!existingLog || existingLog.length === 0) {
      const { data: p } = await supabase.from('profiles').select('points').eq('user_id', user.id).single();
      await supabase.from('point_logs').insert({ user_id: user.id, amount: 500, reason: '첫 게시물' });
      await supabase.from('profiles').update({ points: (p?.points ?? 0) + 500 }).eq('user_id', user.id);
      await fetchProfile(user.id);
      Alert.alert('🎉 첫 게시물 축하해요!', '500pt가 지급됐어요!');
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

        {/* 내용 */}
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

        {/* 등록 조건 안내 */}
        {!canSubmit && (title.length > 0 || body.length > 0) && (
          <View style={styles.conditionBox}>
            <Text style={styles.conditionTitle}>등록 조건</Text>
            <Text style={[styles.conditionItem, title.trim().length >= 2 && styles.conditionOk]}>
              {title.trim().length >= 2 ? '✓' : '○'} 제목 2자 이상
            </Text>
            <Text style={[styles.conditionItem, body.trim().length >= 10 && styles.conditionOk]}>
              {body.trim().length >= 10 ? '✓' : '○'} 내용 10자 이상
            </Text>
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
});
