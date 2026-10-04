import {
  View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, Platform,
} from 'react-native';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { reportMutationError } from '../lib/mutate';
import { Colors, HEADER_TOP } from '../constants/colors';

/**
 * 비밀번호 재설정 — 메일 링크가 돌아오는 자리.
 *
 * 이 화면이 없어서 `resetPasswordForEmail(..., { redirectTo: '…/reset-password' })` 가
 * 보낸 메일 링크는 **존재하지 않는 경로**로 떨어지고 있었다.
 * 보내기는 성공하고 돌아올 곳이 없었던 셈이다.
 *
 * 복구 토큰은 공급자/메일 템플릿에 따라 두 가지 모양으로 온다. 둘 다 받는다.
 *   1) 해시:  #access_token=…&refresh_token=…&type=recovery   → setSession
 *   2) 쿼리:  ?token_hash=…&type=recovery                     → verifyOtp
 *
 * `detectSessionInUrl` 은 끈 채로 둔다(전역 동작을 바꾸지 않는다). 대신 여기서 직접 읽는다.
 */

type Phase = 'checking' | 'ready' | 'invalid' | 'done';

function readTokensFromUrl(): { access?: string; refresh?: string; tokenHash?: string } {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return {};
  const out: { access?: string; refresh?: string; tokenHash?: string } = {};
  const hash = window.location.hash?.startsWith('#') ? window.location.hash.slice(1) : '';
  if (hash) {
    const h = new URLSearchParams(hash);
    out.access = h.get('access_token') ?? undefined;
    out.refresh = h.get('refresh_token') ?? undefined;
  }
  const q = new URLSearchParams(window.location.search);
  out.tokenHash = q.get('token_hash') ?? undefined;
  return out;
}

/** 주소창에서 토큰을 지운다. 새로고침·뒤로가기로 재사용되지 않게. */
function scrubUrl() {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return;
  try {
    window.history.replaceState({}, '', window.location.pathname);
  } catch {
    /* 히스토리 조작이 막힌 환경이면 그냥 둔다 */
  }
}

export default function ResetPasswordScreen() {
  const [phase, setPhase] = useState<Phase>('checking');
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let alive = true;

    // 네이티브에서는 딥링크가 세션을 바로 꽂아주기도 한다. 그 신호도 받는다.
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (!alive) return;
      if (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') setPhase('ready');
    });

    (async () => {
      const { access, refresh, tokenHash } = readTokensFromUrl();
      try {
        if (access && refresh) {
          const { error } = await supabase.auth.setSession({
            access_token: access,
            refresh_token: refresh,
          });
          scrubUrl();
          if (!alive) return;
          setPhase(error ? 'invalid' : 'ready');
          return;
        }
        if (tokenHash) {
          const { error } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: 'recovery',
          });
          scrubUrl();
          if (!alive) return;
          setPhase(error ? 'invalid' : 'ready');
          return;
        }
        // 토큰이 없다 — 이미 복구 세션이 서 있는지만 확인한다.
        const { data } = await supabase.auth.getSession();
        if (!alive) return;
        setPhase(data.session ? 'ready' : 'invalid');
      } catch {
        if (alive) setPhase('invalid');
      }
    })();

    return () => {
      alive = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const canSave = pw.length >= 6 && pw === pw2 && !saving;

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: pw });
      if (error) {
        setSaving(false);
        reportMutationError('비밀번호 변경', error.message);
        return;
      }
      setSaving(false);
      setPhase('done');
    } catch (e) {
      setSaving(false);
      reportMutationError('비밀번호 변경');
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.backBtn} onPress={() => router.replace('/(auth)/login' as any)}>
        <Ionicons name="arrow-back" size={24} color={Colors.text} />
      </TouchableOpacity>

      <View style={styles.content}>
        {phase === 'checking' && (
          <>
            <ActivityIndicator color={Colors.primary} />
            <Text style={styles.subtitle}>링크를 확인하고 있어요…</Text>
          </>
        )}

        {phase === 'invalid' && (
          <>
            <Ionicons name="alert-circle-outline" size={56} color={Colors.danger} />
            <Text style={styles.title}>링크가 만료됐어요</Text>
            <Text style={styles.subtitle}>
              비밀번호 재설정 링크는 일정 시간이 지나면 쓸 수 없어요.{'\n'}
              로그인 화면에서 다시 요청해주세요.
            </Text>
            <TouchableOpacity style={styles.mainBtn} onPress={() => router.replace('/(auth)/login' as any)}>
              <Text style={styles.mainBtnText}>로그인 화면으로</Text>
            </TouchableOpacity>
          </>
        )}

        {phase === 'ready' && (
          <>
            <Ionicons name="lock-closed-outline" size={56} color={Colors.primary} />
            <Text style={styles.title}>새 비밀번호 설정</Text>
            <Text style={styles.subtitle}>6자 이상으로 입력해주세요.</Text>

            <TextInput
              style={styles.input}
              placeholder="새 비밀번호"
              placeholderTextColor={Colors.sub}
              secureTextEntry
              value={pw}
              onChangeText={setPw}
              autoCapitalize="none"
              textContentType="newPassword"
            />
            <TextInput
              style={styles.input}
              placeholder="새 비밀번호 확인"
              placeholderTextColor={Colors.sub}
              secureTextEntry
              value={pw2}
              onChangeText={setPw2}
              autoCapitalize="none"
              textContentType="newPassword"
            />
            {pw2.length > 0 && pw !== pw2 && (
              <Text style={styles.warn}>비밀번호가 서로 달라요.</Text>
            )}

            <TouchableOpacity
              style={[styles.mainBtn, !canSave && styles.mainBtnDisabled]}
              onPress={handleSave}
              disabled={!canSave}
            >
              {saving
                ? <ActivityIndicator color={Colors.white} />
                : <Text style={styles.mainBtnText}>비밀번호 변경하기</Text>}
            </TouchableOpacity>
          </>
        )}

        {phase === 'done' && (
          <>
            <Ionicons name="checkmark-circle-outline" size={56} color={Colors.success} />
            <Text style={styles.title}>변경됐어요</Text>
            <Text style={styles.subtitle}>새 비밀번호로 로그인해주세요.</Text>
            <TouchableOpacity style={styles.mainBtn} onPress={() => router.replace('/(auth)/login' as any)}>
              <Text style={styles.mainBtnText}>로그인하러 가기</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.white },
  backBtn: { paddingTop: HEADER_TOP, paddingHorizontal: 20, paddingBottom: 8 },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14, padding: 32 },
  title: { fontSize: 22, fontWeight: '800', color: Colors.text },
  subtitle: { fontSize: 14, color: Colors.sub, textAlign: 'center', lineHeight: 22 },
  input: {
    width: '100%', backgroundColor: Colors.bg, borderRadius: 14,
    paddingHorizontal: 16, paddingVertical: 14, fontSize: 15, color: Colors.text,
    borderWidth: 1, borderColor: Colors.border,
  },
  warn: { fontSize: 13, color: Colors.danger, alignSelf: 'flex-start' },
  mainBtn: {
    width: '100%', backgroundColor: Colors.primary,
    paddingVertical: 16, borderRadius: 14, alignItems: 'center', marginTop: 4,
  },
  mainBtnDisabled: { backgroundColor: Colors.border },
  mainBtnText: { color: Colors.white, fontSize: 16, fontWeight: '700' },
});
