import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { Colors } from '../constants/colors';

const TERMS = [
  {
    title: '제1조 (목적)',
    body: `이 약관은 픽디(이하 "회사")가 제공하는 AI 뷰티 큐레이션 서비스 "픽디(Pick D)"(이하 "서비스")의 이용 조건 및 절차, 회사와 이용자 간의 권리·의무 및 책임사항을 규정함을 목적으로 합니다.`,
  },
  {
    title: '제2조 (정의)',
    body: `① "서비스"란 회사가 제공하는 AI 기반 뷰티 시술·기기 비교·추천 플랫폼 및 관련 제반 서비스를 의미합니다.\n② "이용자"란 이 약관에 동의하고 서비스를 이용하는 회원 및 비회원을 의미합니다.\n③ "회원"이란 회사에 개인정보를 제공하고 회원가입을 완료한 자를 의미합니다.\n④ "AI 분석 결과"란 이용자의 얼굴 사진 및 피부 정보를 기반으로 자동 생성된 피부 분석 데이터를 의미합니다.`,
  },
  {
    title: '제3조 (약관의 효력 및 변경)',
    body: `① 이 약관은 서비스 화면에 게시하거나 기타 방법으로 이용자에게 공지함으로써 효력이 발생합니다.\n② 회사는 관련 법령을 위반하지 않는 범위에서 이 약관을 변경할 수 있으며, 변경 시 7일 전 공지합니다.\n③ 이용자가 변경된 약관에 동의하지 않을 경우 서비스 이용을 중단하고 회원 탈퇴를 요청할 수 있습니다.`,
  },
  {
    title: '제4조 (서비스의 내용)',
    body: `회사는 다음 서비스를 제공합니다.\n① AI 피부 분석: 이용자의 얼굴 사진을 분석하여 피부 타입, 피부 나이, 수분도·유분도 등을 제공합니다.\n② 시술·기기 비교: 다양한 뷰티 시술 및 홈케어 기기를 비교·분석하는 서비스를 제공합니다.\n③ AI 추천: 이용자의 피부 정보와 얼굴형을 기반으로 최적화된 시술 및 기기를 추천합니다.\n④ 커뮤니티: 이용자 간 뷰티 정보를 공유하는 공간을 제공합니다.`,
  },
  {
    title: '제5조 (이용자의 의무)',
    body: `① 이용자는 다음 행위를 해서는 안 됩니다.\n- 타인의 개인정보를 무단으로 사용하는 행위\n- 서비스를 통해 허위 정보를 유포하는 행위\n- 서비스의 운영을 방해하는 행위\n- 음란물 또는 저작권 침해 콘텐츠를 게시하는 행위\n- 타 이용자에 대한 비방·명예훼손 행위\n② 이용자는 관련 법령과 이 약관을 준수해야 합니다.`,
  },
  {
    title: '제6조 (면책 조항)',
    body: `① 픽디의 AI 분석 결과 및 시술·기기 추천은 참고용 정보이며, 의료 행위나 의학적 진단을 대체하지 않습니다.\n② 시술 및 기기 정보는 제공 시점 기준이며, 실제 가격·효과는 병원 및 제조사에 따라 다를 수 있습니다.\n③ 이용자의 피부 상태, 시술 결과 등에 대해 회사는 법령이 허용하는 범위 내에서 책임을 지지 않습니다.\n④ 천재지변, 서버 장애 등 불가항력적 사유로 인한 서비스 중단에 대해 회사는 책임을 지지 않습니다.`,
  },
  {
    title: '제7조 (지식재산권)',
    body: `① 서비스 내 콘텐츠(텍스트, 이미지, AI 분석 알고리즘 등)의 지식재산권은 회사에 귀속됩니다.\n② 이용자가 서비스에 게시한 콘텐츠의 저작권은 해당 이용자에게 귀속됩니다. 다만, 이용자는 서비스 운영 및 홍보 목적의 사용에 동의합니다.\n③ 이용자는 회사의 서면 동의 없이 서비스 내 콘텐츠를 무단 복제·배포할 수 없습니다.`,
  },
  {
    title: '제8조 (서비스 이용 제한)',
    body: `① 회사는 이용자가 이 약관을 위반하거나 서비스의 정상적인 운영을 방해한 경우 서비스 이용을 제한하거나 회원 자격을 정지·박탈할 수 있습니다.\n② 회원 탈퇴 시 이용자 데이터는 개인정보처리방침에 따라 처리됩니다.`,
  },
  {
    title: '제9조 (준거법 및 관할법원)',
    body: `① 이 약관은 대한민국 법령에 따라 해석됩니다.\n② 서비스 이용과 관련한 분쟁은 회사 본사 소재지를 관할하는 법원을 전속 관할로 합니다.`,
  },
];

export default function TermsScreen() {
  return (
    <View style={styles.container}>
      <View style={styles.headerBar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>이용약관</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <Text style={styles.effectiveDate}>시행일: 2025년 1월 1일</Text>

        {TERMS.map((item, i) => (
          <View key={i} style={styles.clause}>
            <Text style={styles.clauseTitle}>{item.title}</Text>
            <Text style={styles.clauseBody}>{item.body}</Text>
          </View>
        ))}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.white },
  headerBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: 56, paddingHorizontal: 16, paddingBottom: 12,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  backBtnText: { fontSize: 22, color: Colors.text },
  headerTitle: { fontSize: 17, fontWeight: '700', color: Colors.text },
  content: { padding: 20 },
  effectiveDate: { fontSize: 12, color: Colors.sub, marginBottom: 20, fontWeight: '600' },
  clause: { marginBottom: 24 },
  clauseTitle: { fontSize: 15, fontWeight: '700', color: Colors.text, marginBottom: 8 },
  clauseBody: { fontSize: 14, color: Colors.sub, lineHeight: 22 },
});
