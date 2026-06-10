import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  TextInput, KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { useRef, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { Colors, HEADER_TOP } from '../constants/colors';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const QUICK_QUESTIONS = [
  '내 피부타입에 맞는 시술을 추천해줘',
  '리프팅 시술 비교 도와줘',
  '홈케어 기기 추천해줘',
  '시술 부작용이 걱정돼',
  '이 시술 통증이 어느 정도야?',
];

export default function AiChatScreen() {
  const { user, profile } = useAuth();
  const { context } = useLocalSearchParams<{ context?: string }>();
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: `안녕하세요! 픽디 AI 상담사예요 ✨\n${
        profile?.skin_type ? `${profile.skin_type} 피부 · ` : ''
      }${profile?.face_shape ? `${profile.face_shape} 얼굴형 ` : ''}궁금한 점을 무엇이든 물어보세요 😊`,
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  // context 파라미터로 비교 아이템 전달 가능
  let compareItems: { name: string; type: string }[] = [];
  try {
    if (context) compareItems = JSON.parse(decodeURIComponent(context));
  } catch {}

  const sendMessage = async (text: string) => {
    if (!text.trim() || loading) return;
    const userMsg: Message = { role: 'user', content: text.trim() };
    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    setInput('');
    setLoading(true);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(
        `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/ai-chat`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session?.access_token ?? ''}`,
            apikey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '',
          },
          body: JSON.stringify({
            messages: nextMessages.map((m) => ({ role: m.role, content: m.content })),
            profile: profile ? {
              skin_type: profile.skin_type,
              baumann_code: profile.baumann_code,
              face_shape: profile.face_shape,
              concerns: profile.concerns,
              age_group: profile.age_group,
            } : undefined,
            compareItems: compareItems.length > 0 ? compareItems : undefined,
          }),
        }
      );

      const json = await res.json();
      const reply = json.reply ?? '죄송해요, 잠시 후 다시 시도해주세요.';
      setMessages((prev) => [...prev, { role: 'assistant', content: reply }]);
    } catch {
      setMessages((prev) => [...prev, {
        role: 'assistant',
        content: '일시적인 오류가 발생했어요. 잠시 후 다시 시도해주세요 🙏',
      }]);
    } finally {
      setLoading(false);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 150);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={0}
    >
      {/* 헤더 */}
      <LinearGradient
        colors={['#FF6B9D', '#C084FC']}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
        style={styles.header}
      >
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>픽디 AI 상담</Text>
          <View style={styles.onlineBadge}>
            <View style={styles.onlineDot} />
            <Text style={styles.onlineText}>온라인</Text>
          </View>
        </View>
        <View style={{ width: 40 }} />
      </LinearGradient>

      {/* 메시지 목록 */}
      <ScrollView
        ref={scrollRef}
        style={styles.messageList}
        contentContainerStyle={styles.messageListContent}
        onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: false })}
        keyboardShouldPersistTaps="handled"
      >
        {messages.map((msg, i) => (
          <View key={i} style={[styles.msgRow, msg.role === 'user' && styles.msgRowUser]}>
            {msg.role === 'assistant' && (
              <View style={styles.avatarBubble}>
                <Text style={styles.avatarEmoji}>✨</Text>
              </View>
            )}
            <View style={[styles.bubble, msg.role === 'user' ? styles.bubbleUser : styles.bubbleAI]}>
              <Text style={[styles.bubbleText, msg.role === 'user' && styles.bubbleTextUser]}>
                {msg.content}
              </Text>
            </View>
          </View>
        ))}

        {loading && (
          <View style={styles.msgRow}>
            <View style={styles.avatarBubble}>
              <Text style={styles.avatarEmoji}>✨</Text>
            </View>
            <View style={[styles.bubble, styles.bubbleAI, styles.loadingBubble]}>
              <ActivityIndicator size="small" color={Colors.primary} />
              <Text style={styles.loadingText}>답변 작성 중...</Text>
            </View>
          </View>
        )}

        {/* 빠른 질문 (초기에만) */}
        {messages.length === 1 && !loading && (
          <View style={styles.quickQWrap}>
            <Text style={styles.quickQLabel}>빠른 질문</Text>
            {QUICK_QUESTIONS.map((q, i) => (
              <TouchableOpacity key={i} style={styles.quickQBtn} onPress={() => sendMessage(q)}>
                <Text style={styles.quickQText}>{q}</Text>
                <Ionicons name="arrow-forward" size={14} color={Colors.primary} />
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>

      {/* 입력창 */}
      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          placeholder="궁금한 점을 물어보세요..."
          placeholderTextColor={Colors.sub}
          value={input}
          onChangeText={setInput}
          multiline
          maxLength={300}
          returnKeyType="send"
          onSubmitEditing={() => sendMessage(input)}
          blurOnSubmit={false}
        />
        <TouchableOpacity
          style={[styles.sendBtn, (!input.trim() || loading) && styles.sendBtnDisabled]}
          onPress={() => sendMessage(input)}
          disabled={!input.trim() || loading}
        >
          <Ionicons name="send" size={20} color={!input.trim() || loading ? Colors.sub : '#fff'} />
        </TouchableOpacity>
      </View>

      <View style={styles.disclaimer}>
        <Text style={styles.disclaimerText}>AI 답변은 참고용입니다. 전문의 상담을 권장합니다.</Text>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: HEADER_TOP, paddingBottom: 14, paddingHorizontal: 16,
  },
  backBtn: { width: 40 },
  headerCenter: { alignItems: 'center', gap: 2 },
  headerTitle: { fontSize: 16, fontWeight: '800', color: '#fff' },
  onlineBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  onlineDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#4ADE80' },
  onlineText: { fontSize: 11, color: 'rgba(255,255,255,0.85)', fontWeight: '600' },

  messageList: { flex: 1 },
  messageListContent: { padding: 16, gap: 12 },

  msgRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  msgRowUser: { justifyContent: 'flex-end' },
  avatarBubble: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  avatarEmoji: { fontSize: 16 },
  bubble: {
    maxWidth: '78%', borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10,
  },
  bubbleAI: {
    backgroundColor: Colors.white,
    borderWidth: 1, borderColor: Colors.border,
    borderBottomLeftRadius: 4,
  },
  bubbleUser: {
    backgroundColor: Colors.primary,
    borderBottomRightRadius: 4,
  },
  bubbleText: { fontSize: 14, color: Colors.text, lineHeight: 21 },
  bubbleTextUser: { color: '#fff' },
  loadingBubble: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  loadingText: { fontSize: 13, color: Colors.sub },

  /* 빠른 질문 */
  quickQWrap: { marginTop: 8, gap: 8 },
  quickQLabel: { fontSize: 12, fontWeight: '700', color: Colors.sub, marginBottom: 2 },
  quickQBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: Colors.white, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11,
    borderWidth: 1.5, borderColor: Colors.primaryLight,
  },
  quickQText: { fontSize: 13, color: Colors.primary, fontWeight: '600', flex: 1 },

  /* 입력창 */
  inputRow: {
    flexDirection: 'row', alignItems: 'flex-end', gap: 10,
    backgroundColor: Colors.white, paddingHorizontal: 16, paddingTop: 10, paddingBottom: 10,
    borderTopWidth: 1, borderTopColor: Colors.border,
  },
  input: {
    flex: 1, borderWidth: 1.5, borderColor: Colors.border, borderRadius: 20,
    paddingHorizontal: 16, paddingVertical: 10, fontSize: 14, color: Colors.text,
    maxHeight: 100, backgroundColor: Colors.bg,
  },
  sendBtn: {
    width: 42, height: 42, borderRadius: 21, backgroundColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  sendBtnDisabled: { backgroundColor: Colors.border },
  disclaimer: {
    backgroundColor: Colors.white, paddingVertical: 6, paddingHorizontal: 16,
    borderTopWidth: 1, borderTopColor: Colors.border,
  },
  disclaimerText: { fontSize: 10, color: Colors.sub, textAlign: 'center' },
});
