import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  TextInput, Alert, ActivityIndicator, Modal,
} from 'react-native';
import { router } from 'expo-router';
import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { Colors } from '../constants/colors';

const SKIN_TYPES = ['지성', '건성', '중성', '복합성', '민감성'];
const FACE_SHAPES = ['계란형', '둥근형', '사각형', '하트형', '긴형', '다이아몬드형'];
const AGE_GROUPS = ['20대 초반', '20대 후반', '30대 초반', '30대 중반', '30대 후반', '40대 이상'];
const SKIN_CONCERNS = ['주름', '색소침착', '모공', '리프팅', '수분', '홍조', '트러블', '탄력'];
const GENDERS = ['여성', '남성', '선택 안함'];

const SKIN_TYPE_DESC: Record<string, string> = {
  '지성': '피지 분비가 많고 번들거리는 피부',
  '건성': '수분이 부족하고 당김이 느껴지는 피부',
  '중성': '균형 잡힌 이상적인 피부',
  '복합성': 'T존 유분, 볼 건조가 복합적인 피부',
  '민감성': '자극에 민감하고 쉽게 붉어지는 피부',
};

export default function AccountScreen() {
  const { user, profile, fetchProfile } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editNickname, setEditNickname] = useState('');
  const [editSkinType, setEditSkinType] = useState('');
  const [editFaceShape, setEditFaceShape] = useState('');
  const [editAgeGroup, setEditAgeGroup] = useState('');
  const [editGender, setEditGender] = useState('');
  const [editConcerns, setEditConcerns] = useState<string[]>([]);

  const [showPwModal, setShowPwModal] = useState(false);
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [pwLoading, setPwLoading] = useState(false);

  const startEditing = () => {
    setEditNickname(profile?.nickname ?? '');
    setEditSkinType(profile?.skin_type ?? '');
    setEditFaceShape(profile?.face_shape ?? '');
    setEditAgeGroup(profile?.age_group ?? '');
    setEditGender(profile?.gender ?? '');
    setEditConcerns(profile?.concerns ?? []);
    setIsEditing(true);
  };

  const handleSave = async () => {
    if (!user || !editNickname.trim()) {
      Alert.alert('알림', '닉네임을 입력해주세요');
      return;
    }
    setSaving(true);
    const { error } = await supabase.from('profiles').update({
      nickname: editNickname.trim(),
      skin_type: editSkinType || null,
      face_shape: editFaceShape || null,
      age_group: editAgeGroup || null,
      gender: editGender === '선택 안함' ? null : editGender || null,
      concerns: editConcerns,
    }).eq('user_id', user.id);
    if (error) {
      Alert.alert('오류', '저장 중 문제가 발생했어요');
      setSaving(false);
      return;
    }
    await fetchProfile(user.id);
    setSaving(false);
    setIsEditing(false);
  };

  const toggleConcern = (c: string) => {
    setEditConcerns((prev) => prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]);
  };

  const handleChangePw = async () => {
    if (newPw.length < 6 || newPw !== confirmPw) return;
    setPwLoading(true);
    const { error } = await supabase.auth.updateUser({ password: newPw });
    setPwLoading(false);
    if (error) {
      Alert.alert('오류', '비밀번호 변경에 실패했어요');
      return;
    }
    Alert.alert('완료', '비밀번호가 변경되었어요');
    setShowPwModal(false);
    setNewPw('');
    setConfirmPw('');
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerBar}>
        <TouchableOpacity
          onPress={() => { if (isEditing) setIsEditing(false); else router.back(); }}
          style={styles.backBtn}
        >
          <Text style={styles.backBtnText}>{isEditing ? '취소' : '←'}</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{isEditing ? '정보 수정' : '계정 정보'}</Text>
        {isEditing ? (
          <TouchableOpacity style={styles.actionBtn} onPress={handleSave} disabled={saving}>
            {saving
              ? <ActivityIndicator size="small" color={Colors.primary} />
              : <Text style={styles.actionBtnText}>저장</Text>}
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.actionBtn} onPress={startEditing}>
            <Text style={styles.actionBtnText}>수정</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* 기본 정보 */}
        <SectionTitle label="기본 정보" />
        <View style={styles.section}>
          <InfoRow label="이메일" value={user?.email ?? '-'} />
          {isEditing ? (
            <View style={styles.editRow}>
              <Text style={styles.editLabel}>닉네임</Text>
              <TextInput
                style={styles.editInput}
                value={editNickname}
                onChangeText={setEditNickname}
                placeholder="닉네임"
                placeholderTextColor={Colors.sub}
                maxLength={20}
              />
            </View>
          ) : (
            <InfoRow label="닉네임" value={profile?.nickname ?? '-'} />
          )}
          {isEditing ? (
            <View style={styles.editRow}>
              <Text style={styles.editLabel}>성별</Text>
              <View style={styles.chipRow}>
                {GENDERS.map((g) => (
                  <TouchableOpacity
                    key={g}
                    style={[styles.chip, editGender === g && styles.chipActive]}
                    onPress={() => setEditGender(editGender === g ? '' : g)}
                  >
                    <Text style={[styles.chipText, editGender === g && styles.chipTextActive]}>{g}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          ) : (
            <InfoRow label="성별" value={profile?.gender ?? '미설정'} />
          )}
          {isEditing ? (
            <View style={[styles.editRow, { borderBottomWidth: 0 }]}>
              <Text style={styles.editLabel}>연령대</Text>
              <View style={styles.chipRow}>
                {AGE_GROUPS.map((a) => (
                  <TouchableOpacity
                    key={a}
                    style={[styles.chip, editAgeGroup === a && styles.chipActive]}
                    onPress={() => setEditAgeGroup(editAgeGroup === a ? '' : a)}
                  >
                    <Text style={[styles.chipText, editAgeGroup === a && styles.chipTextActive]}>{a}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          ) : (
            <InfoRow label="연령대" value={profile?.age_group ?? '미설정'} />
          )}
        </View>

        {/* 피부 정보 */}
        <SectionTitle label="피부 정보" />
        <View style={styles.section}>
          {isEditing ? (
            <>
              <View style={styles.editRow}>
                <Text style={styles.editLabel}>피부 타입</Text>
                <View style={styles.chipRow}>
                  {SKIN_TYPES.map((s) => (
                    <TouchableOpacity
                      key={s}
                      style={[styles.chip, editSkinType === s && styles.chipActive]}
                      onPress={() => setEditSkinType(editSkinType === s ? '' : s)}
                    >
                      <Text style={[styles.chipText, editSkinType === s && styles.chipTextActive]}>{s}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
              <View style={styles.editRow}>
                <Text style={styles.editLabel}>얼굴형</Text>
                <View style={styles.chipRow}>
                  {FACE_SHAPES.map((f) => (
                    <TouchableOpacity
                      key={f}
                      style={[styles.chip, editFaceShape === f && styles.chipActive]}
                      onPress={() => setEditFaceShape(editFaceShape === f ? '' : f)}
                    >
                      <Text style={[styles.chipText, editFaceShape === f && styles.chipTextActive]}>{f}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
              <View style={[styles.editRow, { borderBottomWidth: 0 }]}>
                <Text style={styles.editLabel}>피부 고민</Text>
                <View style={styles.chipRow}>
                  {SKIN_CONCERNS.map((c) => (
                    <TouchableOpacity
                      key={c}
                      style={[styles.chip, editConcerns.includes(c) && styles.chipActive]}
                      onPress={() => toggleConcern(c)}
                    >
                      <Text style={[styles.chipText, editConcerns.includes(c) && styles.chipTextActive]}>{c}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </>
          ) : (
            <>
              <InfoRow
                label="피부 타입"
                value={profile?.skin_type ?? '미설정'}
                sub={profile?.skin_type ? SKIN_TYPE_DESC[profile.skin_type] : undefined}
              />
              <InfoRow label="얼굴형" value={profile?.face_shape ?? '미설정'} />
              <InfoRow
                label="피부 고민"
                value={profile?.concerns?.length ? profile.concerns.join(', ') : '미설정'}
              />
            </>
          )}
        </View>

        {/* AI 분석 결과 */}
        {!isEditing && (profile?.skin_age || profile?.moisture_score || profile?.oil_score) && (
          <>
            <SectionTitle label="AI 피부 분석 결과" />
            <View style={styles.section}>
              {profile?.skin_age && <InfoRow label="피부 나이" value={`${profile.skin_age}세`} />}
              {profile?.moisture_score && <InfoRow label="수분도" value={`${profile.moisture_score}점`} />}
              {profile?.oil_score && <InfoRow label="유분도" value={`${profile.oil_score}점`} />}
            </View>
          </>
        )}

        {/* 포인트 */}
        {!isEditing && (
          <>
            <SectionTitle label="포인트" />
            <View style={styles.section}>
              <InfoRow label="보유 포인트" value={`${profile?.points ?? 0} pt`} />
            </View>
          </>
        )}

        {/* 보안 */}
        {!isEditing && (
          <>
            <SectionTitle label="보안" />
            <View style={styles.section}>
              <TouchableOpacity style={styles.infoRow} onPress={() => setShowPwModal(true)}>
                <Text style={styles.infoLabel}>비밀번호 변경</Text>
                <Text style={styles.menuArrow}>›</Text>
              </TouchableOpacity>
            </View>
          </>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* 비밀번호 변경 모달 */}
      <Modal visible={showPwModal} transparent animationType="slide" onRequestClose={() => setShowPwModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.pwSheet}>
            <Text style={styles.pwSheetTitle}>비밀번호 변경</Text>
            <TextInput
              style={styles.pwInput}
              placeholder="새 비밀번호 (6자 이상)"
              placeholderTextColor={Colors.sub}
              secureTextEntry
              value={newPw}
              onChangeText={setNewPw}
              maxLength={100}
            />
            <TextInput
              style={styles.pwInput}
              placeholder="비밀번호 확인"
              placeholderTextColor={Colors.sub}
              secureTextEntry
              value={confirmPw}
              onChangeText={setConfirmPw}
              maxLength={100}
            />
            {confirmPw.length > 0 && newPw !== confirmPw && (
              <Text style={styles.pwMismatch}>비밀번호가 일치하지 않아요</Text>
            )}
            <TouchableOpacity
              style={[styles.pwSubmitBtn, (newPw.length < 6 || newPw !== confirmPw || pwLoading) && styles.pwSubmitBtnDisabled]}
              onPress={handleChangePw}
              disabled={newPw.length < 6 || newPw !== confirmPw || pwLoading}
            >
              {pwLoading
                ? <ActivityIndicator color={Colors.white} />
                : <Text style={styles.pwSubmitBtnText}>변경하기</Text>}
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.pwCancelBtn}
              onPress={() => { setShowPwModal(false); setNewPw(''); setConfirmPw(''); }}
            >
              <Text style={styles.pwCancelBtnText}>취소</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function SectionTitle({ label }: { label: string }) {
  return (
    <View style={styles.sectionTitleWrap}>
      <Text style={styles.sectionTitleText}>{label}</Text>
    </View>
  );
}

function InfoRow({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <View style={{ flex: 1, alignItems: 'flex-end' }}>
        <Text style={styles.infoValue}>{value}</Text>
        {sub && <Text style={styles.infoSub}>{sub}</Text>}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  headerBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: HEADER_TOP, paddingHorizontal: 16, paddingBottom: 12, backgroundColor: Colors.white,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  backBtn: { width: 60, height: 40, justifyContent: 'center' },
  backBtnText: { fontSize: 16, color: Colors.text, fontWeight: '600' },
  headerTitle: { fontSize: 17, fontWeight: '700', color: Colors.text },
  actionBtn: { width: 60, alignItems: 'flex-end', justifyContent: 'center', height: 40 },
  actionBtnText: { fontSize: 15, color: Colors.primary, fontWeight: '700' },
  sectionTitleWrap: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 8 },
  sectionTitleText: { fontSize: 12, fontWeight: '700', color: Colors.sub, textTransform: 'uppercase', letterSpacing: 0.5 },
  section: { backgroundColor: Colors.white },
  infoRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 14, paddingHorizontal: 20,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  infoLabel: { fontSize: 14, color: Colors.sub, fontWeight: '600' },
  infoValue: { fontSize: 14, color: Colors.text, fontWeight: '600', textAlign: 'right' },
  infoSub: { fontSize: 11, color: Colors.sub, marginTop: 2, textAlign: 'right' },
  menuArrow: { fontSize: 18, color: Colors.sub },
  editRow: {
    paddingVertical: 14, paddingHorizontal: 20,
    borderBottomWidth: 1, borderBottomColor: Colors.border, gap: 10,
  },
  editLabel: { fontSize: 13, fontWeight: '700', color: Colors.sub },
  editInput: {
    borderWidth: 1.5, borderColor: Colors.border, borderRadius: 10,
    paddingVertical: 10, paddingHorizontal: 14, fontSize: 15, color: Colors.text,
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingVertical: 7, paddingHorizontal: 14, borderRadius: 20,
    borderWidth: 1.5, borderColor: Colors.border, backgroundColor: Colors.white,
  },
  chipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  chipText: { fontSize: 13, color: Colors.text, fontWeight: '500' },
  chipTextActive: { color: Colors.white },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  pwSheet: {
    backgroundColor: Colors.white, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, paddingBottom: 48, gap: 12,
  },
  pwSheetTitle: { fontSize: 18, fontWeight: '800', color: Colors.text, marginBottom: 4 },
  pwInput: {
    borderWidth: 1.5, borderColor: Colors.border, borderRadius: 10,
    paddingVertical: 12, paddingHorizontal: 14, fontSize: 15, color: Colors.text,
  },
  pwMismatch: { fontSize: 12, color: Colors.danger, marginTop: -4 },
  pwSubmitBtn: { backgroundColor: Colors.primary, borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  pwSubmitBtnDisabled: { backgroundColor: Colors.border },
  pwSubmitBtnText: { color: Colors.white, fontSize: 15, fontWeight: '700' },
  pwCancelBtn: { alignItems: 'center', paddingVertical: 8 },
  pwCancelBtnText: { fontSize: 14, color: Colors.sub },
});
