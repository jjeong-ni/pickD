import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { Colors } from '../constants/colors';

const PRIVACY = [
  {
    title: '1. 수집하는 개인정보 항목',
    body: `픽디는 서비스 제공을 위해 다음과 같은 개인정보를 수집합니다.\n\n[필수]\n· 이메일 주소 (회원 식별)\n· 닉네임\n· 피부 타입, 얼굴형, 피부 고민, 연령대, 성별 (AI 추천 서비스)\n· 얼굴 사진 (AI 피부 분석 시, 분석 완료 후 즉시 삭제)\n\n[자동 수집]\n· 서비스 이용 기록, 접속 로그, 기기 정보`,
  },
  {
    title: '2. 개인정보 수집 및 이용 목적',
    body: `수집한 개인정보는 다음 목적으로만 사용됩니다.\n\n· 회원 식별 및 서비스 제공\n· AI 피부 분석 및 맞춤형 시술·기기 추천\n· 서비스 개선 및 신규 기능 개발\n· 부정 이용 방지 및 보안 강화`,
  },
  {
    title: '3. 개인정보 보유 및 이용 기간',
    body: `회원 탈퇴 시 또는 수집·이용 목적이 달성된 후 지체 없이 해당 정보를 파기합니다. 단, 관련 법령에 의해 보존이 필요한 경우 아래 기간 동안 보존합니다.\n\n· 계약 또는 청약철회 등에 관한 기록: 5년 (전자상거래법)\n· 소비자 불만 및 분쟁처리 기록: 3년 (전자상거래법)\n· 접속에 관한 기록: 3개월 (통신비밀보호법)\n\n※ 얼굴 사진은 AI 분석 완료 즉시 삭제되며 저장되지 않습니다.`,
  },
  {
    title: '4. 개인정보 제3자 제공',
    body: `픽디는 원칙적으로 이용자의 개인정보를 외부에 제공하지 않습니다. 다만 다음의 경우는 예외로 합니다.\n\n· 이용자가 사전에 동의한 경우\n· 법령의 규정에 따라 수사기관이 요청하는 경우\n· 통계 작성·학술 연구·시장 조사 목적으로 특정 개인을 식별할 수 없는 형태로 제공하는 경우`,
  },
  {
    title: '5. 개인정보 처리 위탁',
    body: `픽디는 서비스 향상을 위해 아래와 같이 개인정보 처리를 위탁하고 있습니다.\n\n· Supabase Inc. (데이터베이스 및 인증 서버 운영)\n· Netlify Inc. (웹 서비스 호스팅)\n\n위탁 계약 시 개인정보 보호 관련 사항을 규정하고 있으며, 위탁 업무 목적 외 개인정보 처리를 금지합니다.`,
  },
  {
    title: '6. 이용자의 권리',
    body: `이용자는 언제든지 다음 권리를 행사할 수 있습니다.\n\n· 개인정보 열람 요청\n· 오류에 대한 정정 요청\n· 삭제 요청 (회원 탈퇴)\n· 처리 정지 요청\n\n권리 행사는 앱 내 계정 설정 또는 고객센터(blackwhitejocker@gmail.com)를 통해 가능하며, 요청 후 10일 이내에 처리합니다.`,
  },
  {
    title: '7. 개인정보 안전성 확보 조치',
    body: `픽디는 개인정보 보호를 위해 다음 조치를 시행하고 있습니다.\n\n· 개인정보 암호화 전송 (SSL/TLS)\n· 비밀번호 암호화 저장 (단방향 해시)\n· 접근 권한 최소화 및 통제\n· 보안 취약점 정기 점검`,
  },
  {
    title: '8. 쿠키(Cookie) 정책',
    body: `픽디는 서비스 이용 편의를 위해 쿠키를 사용할 수 있습니다. 쿠키는 이용자의 브라우저에 저장되며, 이용자는 브라우저 설정을 통해 쿠키 저장을 거부할 수 있습니다. 다만, 쿠키 거부 시 일부 서비스 이용이 제한될 수 있습니다.`,
  },
  {
    title: '9. 개인정보 보호책임자',
    body: `개인정보 관련 문의는 아래로 연락 주시기 바랍니다.\n\n· 담당자: 픽디 개인정보 보호팀\n· 이메일: privacy@pickd.kr\n· 응대 시간: 평일 10:00 ~ 18:00 (주말·공휴일 제외)`,
  },
];

export default function PrivacyScreen() {
  return (
    <View style={styles.container}>
      <View style={styles.headerBar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>개인정보처리방침</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <Text style={styles.intro}>
          픽디(이하 "회사")는 개인정보보호법 등 관련 법령을 준수하며, 이용자의 개인정보를 안전하게 처리합니다.
        </Text>
        <Text style={styles.effectiveDate}>시행일: 2025년 1월 1일</Text>

        {PRIVACY.map((item, i) => (
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
  intro: { fontSize: 14, color: Colors.sub, lineHeight: 22, marginBottom: 8 },
  effectiveDate: { fontSize: 12, color: Colors.sub, marginBottom: 20, fontWeight: '600' },
  clause: { marginBottom: 24 },
  clauseTitle: { fontSize: 15, fontWeight: '700', color: Colors.text, marginBottom: 8 },
  clauseBody: { fontSize: 14, color: Colors.sub, lineHeight: 22 },
});
