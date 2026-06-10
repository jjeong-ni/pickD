import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  Alert, ActivityIndicator, Clipboard, Platform,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '../lib/supabase';
import { Colors, HEADER_TOP } from '../constants/colors';

interface Clinic {
  id: string;
  name: string;
  address: string;
  district: string;
  phone: string | null;
  specialties: string[];
  discount: string | null;
  coupon_code: string | null;
  description: string | null;
  image_url: string | null;
  is_active: boolean;
}

export default function PartnerClinicsScreen() {
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDistrict, setSelectedDistrict] = useState('전체');
  const [districts, setDistricts] = useState<string[]>(['전체']);

  useEffect(() => {
    loadClinics();
  }, []);

  const loadClinics = async () => {
    const { data, error } = await supabase
      .from('partner_clinics')
      .select('*')
      .eq('is_active', true)
      .order('created_at');
    if (!error && data) {
      setClinics(data);
      const uniqueDistricts = ['전체', ...Array.from(new Set(data.map((c: Clinic) => c.district)))];
      setDistricts(uniqueDistricts);
    }
    setLoading(false);
  };

  const handleCopyCode = (code: string) => {
    if (Platform.OS === 'web') {
      try { navigator.clipboard.writeText(code); } catch {}
    } else {
      Clipboard.setString(code);
    }
    Alert.alert('복사 완료', `쿠폰 코드 "${code}"가 복사됐어요!`);
  };

  const filtered = selectedDistrict === '전체'
    ? clinics
    : clinics.filter((c) => c.district === selectedDistrict);

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#FF6B9D', '#D473E8', '#9B6FE8']}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backBtn}>←</Text>
        </TouchableOpacity>
        <Text style={styles.navTitle}>제휴 클리닉</Text>
        <View style={{ width: 32 }} />
      </LinearGradient>

      {/* 지역 필터 */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterRow}
        style={styles.filterBar}
      >
        {districts.map((d) => (
          <TouchableOpacity
            key={d}
            style={[styles.filterChip, selectedDistrict === d && styles.filterChipActive]}
            onPress={() => setSelectedDistrict(d)}
          >
            <Text style={[styles.filterTxt, selectedDistrict === d && styles.filterTxtActive]}>{d}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {loading ? (
        <View style={styles.center}><ActivityIndicator color={Colors.primary} size="large" /></View>
      ) : filtered.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="business-outline" size={48} color={Colors.border} />
          <Text style={styles.emptyTxt}>해당 지역 클리닉이 없어요</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
          {filtered.map((clinic) => (
            <View key={clinic.id} style={styles.clinicCard}>
              {/* 할인 배지 */}
              {clinic.discount && (
                <View style={styles.discountBadge}>
                  <Text style={styles.discountBadgeTxt}>🎁 픽디 회원 혜택</Text>
                </View>
              )}

              <Text style={styles.clinicName}>{clinic.name}</Text>
              <View style={styles.addressRow}>
                <Ionicons name="location-outline" size={13} color={Colors.sub} />
                <Text style={styles.addressTxt}>{clinic.address}</Text>
              </View>

              {/* 전문분야 태그 */}
              <View style={styles.tagRow}>
                {(clinic.specialties ?? []).map((s) => (
                  <View key={s} style={styles.tag}>
                    <Text style={styles.tagTxt}>{s}</Text>
                  </View>
                ))}
              </View>

              {clinic.description ? (
                <Text style={styles.description}>{clinic.description}</Text>
              ) : null}

              {/* 할인 정보 */}
              {clinic.discount && (
                <View style={styles.discountBox}>
                  <Text style={styles.discountTxt}>{clinic.discount}</Text>
                </View>
              )}

              {/* 쿠폰 코드 */}
              {clinic.coupon_code && (
                <TouchableOpacity
                  style={styles.couponRow}
                  onPress={() => handleCopyCode(clinic.coupon_code!)}
                  activeOpacity={0.7}
                >
                  <View style={styles.couponLeft}>
                    <Text style={styles.couponLabel}>쿠폰 코드</Text>
                    <Text style={styles.couponCode}>{clinic.coupon_code}</Text>
                  </View>
                  <View style={styles.copyBtn}>
                    <Ionicons name="copy-outline" size={14} color={Colors.primary} />
                    <Text style={styles.copyBtnTxt}>복사</Text>
                  </View>
                </TouchableOpacity>
              )}

              {/* 전화 버튼 */}
              {clinic.phone && (
                <TouchableOpacity
                  style={styles.phoneBtn}
                  onPress={() => {
                    if (Platform.OS !== 'web') {
                      Alert.alert('전화 연결', `${clinic.name}\n${clinic.phone}`, [
                        { text: '취소', style: 'cancel' },
                        { text: '전화하기', onPress: () => {} },
                      ]);
                    }
                  }}
                >
                  <Ionicons name="call-outline" size={16} color={Colors.primary} />
                  <Text style={styles.phoneBtnTxt}>{clinic.phone}</Text>
                </TouchableOpacity>
              )}
            </View>
          ))}
          <View style={{ height: 40 }} />
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: HEADER_TOP, paddingHorizontal: 16, paddingBottom: 16,
  },
  backBtn: { fontSize: 24, color: '#fff', width: 32 },
  navTitle: { fontSize: 17, fontWeight: '700', color: '#fff' },
  filterBar: { backgroundColor: Colors.white, borderBottomWidth: 1, borderBottomColor: Colors.border },
  filterRow: { paddingHorizontal: 16, paddingVertical: 10, gap: 8 },
  filterChip: {
    paddingVertical: 6, paddingHorizontal: 14, borderRadius: 20,
    borderWidth: 1.5, borderColor: Colors.border, backgroundColor: Colors.white,
  },
  filterChipActive: { borderColor: Colors.primary, backgroundColor: Colors.primaryLight },
  filterTxt: { fontSize: 13, fontWeight: '600', color: Colors.sub },
  filterTxtActive: { color: Colors.primary },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  emptyTxt: { fontSize: 15, color: Colors.sub },
  list: { padding: 16, gap: 14 },
  clinicCard: {
    backgroundColor: Colors.white, borderRadius: 16, padding: 16, gap: 10,
    borderWidth: 1, borderColor: Colors.border,
    shadowColor: Colors.cardShadow, shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1, shadowRadius: 8, elevation: 2,
  },
  discountBadge: {
    alignSelf: 'flex-start', backgroundColor: '#FFF0F5',
    borderRadius: 10, paddingVertical: 3, paddingHorizontal: 10,
    borderWidth: 1, borderColor: Colors.primaryLight,
  },
  discountBadgeTxt: { fontSize: 11, fontWeight: '700', color: Colors.primary },
  clinicName: { fontSize: 17, fontWeight: '800', color: Colors.text },
  addressRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  addressTxt: { fontSize: 12, color: Colors.sub, flex: 1 },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  tag: { backgroundColor: '#F0ECFF', borderRadius: 20, paddingVertical: 3, paddingHorizontal: 10 },
  tagTxt: { fontSize: 12, fontWeight: '600', color: '#6B4EFF' },
  description: { fontSize: 13, color: Colors.sub, lineHeight: 20 },
  discountBox: {
    backgroundColor: '#FFF5F9', borderRadius: 10, padding: 10,
    borderLeftWidth: 3, borderLeftColor: Colors.primary,
  },
  discountTxt: { fontSize: 13, fontWeight: '700', color: Colors.primary },
  couponRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: Colors.bg, borderRadius: 10, padding: 12,
    borderWidth: 1, borderColor: Colors.border,
  },
  couponLeft: { gap: 2 },
  couponLabel: { fontSize: 10, fontWeight: '700', color: Colors.sub, textTransform: 'uppercase' },
  couponCode: { fontSize: 16, fontWeight: '900', color: Colors.text, letterSpacing: 1 },
  copyBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingVertical: 6, paddingHorizontal: 12, borderRadius: 10,
    backgroundColor: Colors.primaryLight,
  },
  copyBtnTxt: { fontSize: 12, fontWeight: '700', color: Colors.primary },
  phoneBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingVertical: 10, borderTopWidth: 1, borderTopColor: Colors.border,
  },
  phoneBtnTxt: { fontSize: 13, color: Colors.primary, fontWeight: '600' },
});
