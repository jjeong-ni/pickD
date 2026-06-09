import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  ActivityIndicator, Alert, Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { router } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { Colors } from '../../constants/colors';
import { useAuth } from '../../hooks/useAuth';
import { useCompare } from '../../hooks/useCompare';
import { useResponsive } from '../../hooks/useResponsive';
import { Treatment, Device, CompareItem } from '../../types';

const FACE_SHAPE_CATEGORIES: Record<string, string[]> = {
  '계란형': ['리프팅', '스킨케어', '필러', 'LED', 'RF'],
  '둥근형': ['보톡스', '리프팅', '윤곽', 'RF', 'EMS'],
  '사각형': ['보톡스', '필러', '윤곽', '초음파', 'EMS'],
  '하트형': ['필러', '리프팅', '스킨케어', 'RF', 'EMS'],
  '긴형': ['필러', '수분', '스킨케어', 'LED', '초음파'],
  '다이아몬드형': ['보톡스', '필러', '리프팅', 'RF', 'EMS'],
  // 구버전 호환
  '타원형': ['리프팅', '스킨케어', '필러', 'LED', 'RF'],
  '각진형': ['보톡스', '필러', '윤곽', '초음파', 'EMS'],
};

export default function CompareScreen() {
  const { user, profile } = useAuth();
  const { items, fetch, remove, clear, loading } = useCompare();
  const { hPad } = useResponsive();
  // item_id 기반 맵: 삭제해도 나머지 카드는 그대로 유지
  const [detailMap, setDetailMap] = useState<Record<string, Treatment | Device>>({});
  const [initialLoad, setInitialLoad] = useState(false);
  const [showAI, setShowAI] = useState(false);
  const [aiResult, setAiResult] = useState<AiResult | null>(null);
  const [savedAiResult, setSavedAiResult] = useState<AiResult | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  useEffect(() => {
    if (user) fetch(user.id);
  }, [user]);

  useEffect(() => {
    const missing = items.filter((ci) => !detailMap[ci.item_id]);
    if (missing.length > 0) loadMissingDetails(missing);
    // 비교 항목이 바뀌면 이전 AI 결과는 무효화
    setSavedAiResult(null);
  }, [items]);

  const loadMissingDetails = async (missing: CompareItem[]) => {
    if (Object.keys(detailMap).length === 0) setInitialLoad(true);
    const newEntries: Record<string, Treatment | Device> = {};

    const treatmentIds = missing.filter((ci) => ci.item_type === 'treatment').map((ci) => ci.item_id);
    const deviceIds = missing.filter((ci) => ci.item_type === 'device').map((ci) => ci.item_id);

    const [tRes, dRes] = await Promise.all([
      treatmentIds.length > 0
        ? supabase.from('treatments').select('*').in('id', treatmentIds)
        : { data: [] as Treatment[] },
      deviceIds.length > 0
        ? supabase.from('devices').select('*').in('id', deviceIds)
        : { data: [] as Device[] },
    ]);
    for (const t of tRes.data ?? []) newEntries[t.id] = t;
    for (const d of dRes.data ?? []) newEntries[d.id] = d;

    setDetailMap((prev) => ({ ...prev, ...newEntries }));
    setInitialLoad(false);
  };

  const [confirmTarget, setConfirmTarget] = useState<{ id: string; type: 'remove' | 'clear' } | null>(null);

  const handleRemove = (compareId: string) => {
    setConfirmTarget({ id: compareId, type: 'remove' });
  };

  const handleClear = () => {
    if (!user) return;
    setConfirmTarget({ id: user.id, type: 'clear' });
  };

  const executeConfirm = () => {
    if (!confirmTarget) return;
    if (confirmTarget.type === 'remove') remove(confirmTarget.id);
    else clear(confirmTarget.id);
    setConfirmTarget(null);
  };

  const handleAIRecommend = async () => {
    const details = items
      .map((ci) => detailMap[ci.item_id])
      .filter((d): d is Treatment | Device => !!d);
    if (details.length < 2) {
      Alert.alert('항목 부족', '비교 항목을 2개 이상 추가해주세요');
      return;
    }
    setSavedAiResult(null);
    setAiLoading(true);
    setShowAI(true);
    await new Promise((r) => setTimeout(r, 1800));
    const result = calcRecommendation(details, items.map((i) => i.item_type), profile);
    setAiResult(result);
    setAiLoading(false);
  };

  const handleCloseAI = () => {
    if (aiResult) setSavedAiResult(aiResult);
    setShowAI(false);
  };

  if (loading || initialLoad) {
    return <View style={styles.center}><ActivityIndicator color={Colors.primary} /></View>;
  }

  // items와 1:1 대응을 유지하는 쌍 (인덱스 불일치 방지)
  const tableEntries = items
    .map((ci) => ({ ci, detail: detailMap[ci.item_id] }))
    .filter((e): e is { ci: CompareItem; detail: Treatment | Device } => !!e.detail);
  const visibleDetails = tableEntries.map((e) => e.detail);
  const displayResult = aiResult ?? savedAiResult;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>비교함</Text>
        {items.length > 0 && (
          <TouchableOpacity onPress={handleClear}>
            <Text style={styles.clearBtn}>전체 삭제</Text>
          </TouchableOpacity>
        )}
      </View>

      {items.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="layers-outline" size={56} color={Colors.border} />
          <Text style={styles.emptyTitle}>비교함이 비어있어요</Text>
          <Text style={styles.emptyDesc}>시술이나 기기를 추가해{'\n'}한눈에 비교해보세요 (최대 3개)</Text>
          <TouchableOpacity style={styles.goBtn} onPress={() => router.push('/search')}>
            <Text style={styles.goBtnText}>시술·기기 둘러보기</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ paddingHorizontal: hPad, paddingVertical: 20, gap: 16 }}>
          {/* AI 추천 결과 배너 — 상단 고정 */}
          {savedAiResult && !showAI && (
            <TouchableOpacity style={styles.aiResultBanner} onPress={() => setShowAI(true)}>
              <View style={styles.aiResultBannerLeft}>
                <Text style={styles.aiResultBannerBadge}>✨ AI 추천</Text>
                <Text style={styles.aiResultBannerName} numberOfLines={1}>{savedAiResult.item.name}</Text>
                <Text style={styles.aiResultBannerScore}>
                  {'❤️'.repeat(Math.min(savedAiResult.score, 5))}{'🤍'.repeat(Math.max(0, 5 - savedAiResult.score))} {savedAiResult.score}점 · 탭하면 상세 보기
                </Text>
              </View>
              <View style={[styles.aiResultBannerImg, { backgroundColor: savedAiResult.isTreatment ? '#FFE8F0' : '#EEE8FF' }]}>
                <Ionicons name={savedAiResult.isTreatment ? 'medical-outline' : 'hardware-chip-outline'} size={26} color={savedAiResult.isTreatment ? Colors.primary : '#9B6FE8'} />
              </View>
            </TouchableOpacity>
          )}

          {/* AI 추천 버튼 — 아이템 위 */}
          {visibleDetails.length >= 2 && (
            <TouchableOpacity style={styles.aiBtn} onPress={handleAIRecommend}>
              <View style={styles.aiBtnGradient}>
                <Ionicons name="color-wand-outline" size={24} color={Colors.white} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.aiBtnTitle}>
                  {savedAiResult ? 'AI 추천 다시 받기' : 'AI 맞춤 추천받기'}
                </Text>
                <Text style={styles.aiBtnSub}>
                  {profile?.face_shape
                    ? `${profile.face_shape} 얼굴형 · ${profile.skin_type ?? ''} 피부 기반`
                    : profile?.skin_type
                    ? `${profile.skin_type} 피부 · 고민 ${profile.concerns?.length ?? 0}개 기반`
                    : '피부 프로필 기반 AI 분석'}
                </Text>
              </View>
              <Text style={styles.aiBtnArrow}>›</Text>
            </TouchableOpacity>
          )}

          {/* 아이템 카드들 */}
          <View style={styles.compareRow}>
            {items.map((ci) => {
              const detail = detailMap[ci.item_id];
              if (!detail) return null;
              const isTreatment = ci.item_type === 'treatment';
              const t = detail as Treatment;
              const d = detail as Device;
              return (
                <View key={ci.id} style={styles.compareCard}>
                  <TouchableOpacity style={styles.removeBtn} onPress={() => handleRemove(ci.id)}>
                    <Text style={styles.removeBtnText}>✕</Text>
                  </TouchableOpacity>
                  <View style={[styles.compareCardImage, !isTreatment && { backgroundColor: '#EEE8FF' }]}>
                    <Ionicons name={isTreatment ? 'medical-outline' : 'hardware-chip-outline'} size={30} color={isTreatment ? Colors.primary : '#9B6FE8'} />
                  </View>
                  <Text style={styles.compareCardType}>{isTreatment ? '시술' : '기기'}</Text>
                  <Text style={styles.compareCardName} numberOfLines={2}>{detail.name}</Text>
                  <Text style={styles.compareCardPrice}>
                    {isTreatment
                      ? `${t.price_min.toLocaleString()}~${t.price_max.toLocaleString()}원`
                      : `${d.price.toLocaleString()}원`}
                  </Text>
                  <Text style={styles.compareCardRating}>⭐ {detail.rating.toFixed(1)}</Text>
                </View>
              );
            })}
            {Array.from({ length: 3 - items.length }).map((_, i) => (
              <TouchableOpacity
                key={`empty-${i}`}
                style={styles.emptySlot}
                onPress={() => router.push('/search')}
              >
                <Text style={styles.emptySlotIcon}>+</Text>
                <Text style={styles.emptySlotText}>추가</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* 비용 환산 비교 */}
          {tableEntries.length >= 2 && tableEntries.some(({ ci }) => ci.item_type === 'treatment') && tableEntries.some(({ ci }) => ci.item_type === 'device') && (
            <View style={styles.costCard}>
              <Text style={styles.costTitle}>💰 비용 환산 비교</Text>
              <Text style={styles.costSubtitle}>시술 vs 기기를 동일 기간으로 비교해봤어요</Text>
              <View style={styles.costRows}>
                {tableEntries.map(({ ci, detail: d }) => {
                  const isTreatment = ci.item_type === 'treatment';
                  const t = d as Treatment;
                  const dv = d as Device;
                  const sessionPrice = isTreatment ? t.price_min : null;
                  const devicePrice = !isTreatment ? dv.price : null;
                  // 기기: 주 2회 6개월(52회) 기준 1회당
                  const devicePerSession = devicePrice ? Math.round(devicePrice / 52) : null;
                  return (
                    <View key={ci.item_id} style={styles.costRow}>
                      <View style={styles.costRowLeft}>
                        <View style={[styles.costBadge, { backgroundColor: isTreatment ? '#FFE8F0' : '#EEE8FF' }]}>
                          <Text style={[styles.costBadgeText, { color: isTreatment ? Colors.primary : '#9B6FE8' }]}>
                            {isTreatment ? '시술' : '기기'}
                          </Text>
                        </View>
                        <Text style={styles.costItemName} numberOfLines={1}>{d.name}</Text>
                      </View>
                      <View style={styles.costRowRight}>
                        {isTreatment ? (
                          <>
                            <Text style={styles.costAmount}>{(sessionPrice ?? 0).toLocaleString()}원</Text>
                            <Text style={styles.costNote}>1회 기준</Text>
                          </>
                        ) : (
                          <>
                            <Text style={styles.costAmount}>{(devicePrice ?? 0).toLocaleString()}원</Text>
                            <Text style={styles.costNote}>구입 후 1회당 {(devicePerSession ?? 0).toLocaleString()}원</Text>
                            <Text style={styles.costNoteDetail}>(주 2회·6개월 기준)</Text>
                          </>
                        )}
                      </View>
                    </View>
                  );
                })}
              </View>
              <Text style={styles.costDisclaimer}>* 기기는 소모품 비용 미포함, 시술은 1회 최저 비용 기준</Text>
            </View>
          )}

          {/* 상세 비교 테이블 */}
          {visibleDetails.length >= 2 && (
            <View style={styles.table}>
              <Text style={styles.tableTitle}>상세 비교</Text>

              {/* 공통 행 */}
              <CompareRow label="평점" values={visibleDetails.map((d) => `⭐ ${d.rating.toFixed(1)}`)} />
              <CompareRow label="리뷰 수" values={visibleDetails.map((d) => `${d.review_count}개`)} />
              <CompareRow
                label="가격"
                values={tableEntries.map(({ ci, detail: d }) =>
                  ci.item_type === 'treatment'
                    ? `${(d as Treatment).price_min.toLocaleString()}~\n${(d as Treatment).price_max.toLocaleString()}원`
                    : `${(d as Device).price.toLocaleString()}원`
                )}
              />
              <CompareRow label="카테고리" values={visibleDetails.map((d) => d.category)} />

              {/* 시술 전용 비교 행 */}
              {tableEntries.every(({ ci }) => ci.item_type === 'treatment') && (() => {
                const ts = visibleDetails as Treatment[];
                return (
                  <>
                    <CompareRow label="통증도" values={ts.map((t) => t.pain_level ?? '-')} />
                    <CompareRow label="회복기간" values={ts.map((t) => t.downtime ?? '-')} />
                    <CompareRow label="유지기간" values={ts.map((t) => t.duration ?? '-')} />
                    <CompareRow label="권장 횟수" values={ts.map((t) => t.sessions ?? '-')} />
                    <CompareRow label="부작용" values={ts.map((t) => t.side_effects ?? '-')} highlight />
                    <CompareRow label="금기사항" values={ts.map((t) => t.contraindications ?? '-')} highlight />
                  </>
                );
              })()}

              {/* 기기 전용 비교 행 */}
              {tableEntries.every(({ ci }) => ci.item_type === 'device') && (() => {
                const ds = visibleDetails as Device[];
                return (
                  <>
                    <CompareRow label="사용 주기" values={ds.map((d) => d.usage_frequency ?? '-')} />
                    <CompareRow label="효과 시작" values={ds.map((d) => d.results_timeline ?? '-')} />
                    <CompareRow label="부작용" values={ds.map((d) => d.side_effects ?? '-')} highlight />
                    <CompareRow label="금기사항" values={ds.map((d) => d.contraindications ?? '-')} highlight />
                  </>
                );
              })()}

              <View style={styles.tableDisclaimer}>
                <Text style={styles.tableDisclaimerText}>* 정보는 일반적 기준이며 개인차가 있을 수 있습니다. 전문의 상담을 권장합니다.</Text>
              </View>
            </View>
          )}
          {/* 전문가 상담 */}
          <View style={styles.consultCard}>
            <View style={styles.consultHeader}>
              <Text style={styles.consultTitle}>👩‍⚕️ 전문가 상담</Text>
              <View style={styles.consultBadge}><Text style={styles.consultBadgeText}>20분 · 5,000원</Text></View>
            </View>
            <Text style={styles.consultDesc}>비교 중인 시술·기기에 대해 전문가에게 직접 물어보세요</Text>
            <View style={styles.consultBtns}>
              <TouchableOpacity
                style={styles.consultBtn}
                onPress={() => Alert.alert('전화 상담', '전화 상담 연결 준비 중이에요.\n베타 종료 후 오픈될 예정입니다.')}
              >
                <Ionicons name="call-outline" size={20} color={Colors.text} />
                <Text style={styles.consultBtnText}>전화 상담</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.consultBtn, styles.consultBtnKakao]}
                onPress={() => Alert.alert('카카오톡 상담', '카카오톡 상담 연결 준비 중이에요.\n베타 종료 후 오픈될 예정입니다.')}
              >
                <Ionicons name="chatbubble-ellipses-outline" size={20} color={Colors.text} />
                <Text style={styles.consultBtnText}>카카오 톡톡</Text>
              </TouchableOpacity>
            </View>
          </View>

        </ScrollView>
      )}

      {/* 삭제 확인 모달 */}
      <Modal visible={!!confirmTarget} transparent animationType="fade" onRequestClose={() => setConfirmTarget(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.confirmSheet}>
            <Text style={styles.confirmTitle}>
              {confirmTarget?.type === 'clear' ? '비교함 전체 삭제' : '비교함에서 제거'}
            </Text>
            <Text style={styles.confirmDesc}>
              {confirmTarget?.type === 'clear'
                ? '비교함을 모두 비울까요?'
                : '이 항목을 비교함에서 제거할까요?'}
            </Text>
            <View style={styles.confirmBtns}>
              <TouchableOpacity style={styles.confirmCancel} onPress={() => setConfirmTarget(null)}>
                <Text style={styles.confirmCancelText}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.confirmOk} onPress={executeConfirm}>
                <Text style={styles.confirmOkText}>제거</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* AI 추천 모달 */}
      <Modal visible={showAI} transparent animationType="slide" onRequestClose={handleCloseAI}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalTopBar}>
              <View style={styles.modalHandle} />
              <TouchableOpacity style={styles.modalCloseX} onPress={handleCloseAI}>
                <Ionicons name="close" size={24} color={Colors.sub} />
              </TouchableOpacity>
            </View>

            {aiLoading ? (
              <View style={styles.aiLoadingWrap}>
                <ActivityIndicator color={Colors.primary} size="large" />
                <Text style={styles.aiLoadingTitle}>AI 분석 중...</Text>
                <Text style={styles.aiLoadingSub}>
                  {profile?.skin_type ?? ''}·{profile?.face_shape ?? ''} 프로필을{'\n'}기반으로 최적 항목을 찾고 있어요
                </Text>
              </View>
            ) : (aiResult ?? savedAiResult) ? (
              <ScrollView showsVerticalScrollIndicator={false}>
                <Text style={styles.modalTitle}>✨ AI 추천 결과</Text>

                <View style={styles.aiWinnerCard}>
                  <Text style={styles.aiWinnerBadge}>Pick D AI 추천</Text>
                  <View style={[styles.aiWinnerImg, { backgroundColor: displayResult!.isTreatment ? '#FFE8F0' : '#EEE8FF' }]}>
                    <Ionicons name={displayResult!.isTreatment ? 'medical-outline' : 'hardware-chip-outline'} size={44} color={displayResult!.isTreatment ? Colors.primary : '#9B6FE8'} />
                  </View>
                  <Text style={styles.aiWinnerName}>{displayResult!.item.name}</Text>
                  <Text style={styles.aiWinnerScore}>
                    {'❤️'.repeat(Math.min(displayResult!.score, 5))}{'🤍'.repeat(Math.max(0, 5 - displayResult!.score))} {displayResult!.score}점
                  </Text>
                  <Text style={styles.aiWinnerDesc} numberOfLines={2}>{displayResult!.item.description}</Text>
                </View>

                <View style={styles.aiReasonCard}>
                  <Text style={styles.aiReasonTitle}>추천 이유</Text>
                  {displayResult!.reasons.map((r, i) => (
                    <View key={i} style={styles.aiReasonRow}>
                      <Text style={styles.aiReasonDot}>✓</Text>
                      <Text style={styles.aiReasonText}>{r}</Text>
                    </View>
                  ))}
                </View>

                {/* 항목별 점수 비교 */}
                <View style={styles.aiScoreCard}>
                  <Text style={styles.aiReasonTitle}>항목별 점수 비교</Text>
                  {displayResult!.allScores.map((s, i) => (
                    <View key={i} style={styles.aiScoreRow}>
                      <Text style={styles.aiScoreName} numberOfLines={1}>{s.name}</Text>
                      <View style={styles.aiScoreBarWrap}>
                        <View style={[styles.aiScoreBar, { width: `${(s.score / 16) * 100}%` as any }]} />
                      </View>
                      <Text style={styles.aiScoreNum}>{'❤️'.repeat(Math.min(s.score, 5))} {s.score}점</Text>
                    </View>
                  ))}
                </View>

                {/* 점수 산출 근거 */}
                <View style={styles.aiBreakdownCard}>
                  <Text style={styles.aiReasonTitle}>점수 산출 근거 <Text style={styles.aiBreakdownSub}>(추천 항목 기준)</Text></Text>
                  {displayResult!.breakdown.map((b, i) => (
                    <View key={i} style={styles.aiBreakdownRow}>
                      <View style={styles.aiBreakdownLeft}>
                        <Text style={styles.aiBreakdownLabel}>{b.label}</Text>
                        <Text style={styles.aiBreakdownDetail}>{b.detail}</Text>
                      </View>
                      <Text style={[styles.aiBreakdownScore, b.points === 0 && styles.aiBreakdownScoreZero]}>
                        +{b.points}<Text style={styles.aiBreakdownMax}>/{b.max}</Text>
                      </Text>
                    </View>
                  ))}
                  <View style={styles.aiBreakdownNote}>
                    <Text style={styles.aiBreakdownNoteText}>
                      ※ AI 추천은 입력하신 피부 프로필과 태그 기반으로 계산됩니다. 전문의 상담 결과와 다를 수 있습니다.
                    </Text>
                  </View>
                </View>

                <TouchableOpacity style={styles.modalCloseBtn} onPress={handleCloseAI}>
                  <Text style={styles.modalCloseBtnText}>닫기</Text>
                </TouchableOpacity>
              </ScrollView>
            ) : null}
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ─── AI 추천 계산 ─────────────────────────────────────────────────────

interface ScoreBreakdown {
  label: string;
  points: number;
  max: number;
  detail: string;
}

interface AiResult {
  item: Treatment | Device;
  isTreatment: boolean;
  score: number;
  reasons: string[];
  allScores: { name: string; score: number }[];
  breakdown: ScoreBreakdown[];
}

function calcRecommendation(
  details: (Treatment | Device)[],
  types: string[],
  profile: any,
): AiResult {
  const scored = details.map((item, idx) => {
    let score = 0;
    const reasons: string[] = [];
    const breakdown: ScoreBreakdown[] = [];

    // 1. 피부 타입 매칭 (최대 3점)
    const skinMatch = profile?.skin_type && item.tags?.some((t: string) =>
      t.includes(profile.skin_type) || profile.skin_type.includes(t)
    );
    if (skinMatch) {
      score += 3;
      reasons.push(`${profile.skin_type} 피부 타입에 적합한 시술이에요`);
    }
    breakdown.push({
      label: '피부 타입 매칭',
      points: skinMatch ? 3 : 0,
      max: 3,
      detail: skinMatch ? `${profile?.skin_type} 피부와 태그 일치` : profile?.skin_type ? '태그 불일치' : '프로필 미입력',
    });

    // 2. 고민 매칭 (최대 6점, 고민 1개당 2점)
    const matchedConcerns: string[] = [];
    (profile?.concerns ?? []).forEach((concern: string) => {
      if (item.tags?.some((t: string) => t.includes(concern) || concern.includes(t))) {
        score += 2;
        matchedConcerns.push(concern);
      }
    });
    if (matchedConcerns.length > 0) {
      reasons.push(`${matchedConcerns.slice(0, 2).join(', ')} 고민 개선에 효과적이에요`);
    }
    breakdown.push({
      label: '고민 매칭',
      points: Math.min(matchedConcerns.length * 2, 6),
      max: 6,
      detail: matchedConcerns.length > 0 ? `${matchedConcerns.join(', ')} 매칭` : profile?.concerns?.length ? '매칭 태그 없음' : '고민 미입력',
    });

    // 3. 얼굴형 적합도 (최대 2점)
    let facePoints = 0;
    if (profile?.face_shape) {
      const recommended = FACE_SHAPE_CATEGORIES[profile.face_shape] ?? [];
      const matched = recommended.filter((cat) =>
        item.category?.includes(cat) || item.tags?.some((t: string) => t.includes(cat))
      );
      if (matched.length > 0) { facePoints = 2; score += 2; reasons.push(`${profile.face_shape} 얼굴형에 추천되는 카테고리예요`); }
    }
    breakdown.push({
      label: '얼굴형 적합도',
      points: facePoints,
      max: 2,
      detail: facePoints > 0 ? `${profile?.face_shape} 얼굴형 추천 카테고리` : profile?.face_shape ? '추천 카테고리 아님' : '얼굴형 미입력',
    });

    // 4. 사용자 평점 반영 (최대 4점)
    const ratingPoints = Math.round(item.rating * 0.8);
    score += ratingPoints;
    breakdown.push({
      label: '사용자 평점',
      points: ratingPoints,
      max: 4,
      detail: `평점 ${item.rating.toFixed(1)}점 × 0.8`,
    });

    // 5. 리뷰 신뢰도 (최대 1점)
    const reviewPoints = item.review_count > 200 ? 1 : 0;
    if (reviewPoints) { score += 1; reasons.push('리뷰가 많아 검증된 시술이에요'); }
    breakdown.push({
      label: '리뷰 신뢰도',
      points: reviewPoints,
      max: 1,
      detail: item.review_count > 200 ? `리뷰 ${item.review_count}개 — 충분히 검증됨` : `리뷰 ${item.review_count}개 — 추가 검증 필요`,
    });

    if (reasons.length === 0) reasons.push('높은 평점과 다수의 리뷰로 신뢰도가 높아요');

    return { item, isTreatment: types[idx] === 'treatment', score, reasons, breakdown };
  });

  scored.sort((a, b) => b.score - a.score);
  const winner = scored[0];

  return {
    item: winner.item,
    isTreatment: winner.isTreatment,
    score: winner.score,
    reasons: winner.reasons,
    breakdown: winner.breakdown,
    allScores: scored.map((s) => ({ name: s.item.name, score: s.score })),
  };
}

function CompareRow({ label, values, highlight }: { label: string; values: string[]; highlight?: boolean }) {
  return (
    <View style={[styles.tableRow, highlight && styles.tableRowHighlight]}>
      <Text style={[styles.tableLabel, highlight && styles.tableLabelHighlight]}>{label}</Text>
      {values.map((v, i) => (
        <Text key={i} style={[styles.tableValue, highlight && styles.tableValueHighlight]}>{v}</Text>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 20, paddingTop: 60, backgroundColor: Colors.white,
  },
  title: { fontSize: 20, fontWeight: '800', color: Colors.text },
  clearBtn: { fontSize: 14, color: Colors.danger, fontWeight: '600' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  emptyIcon: { marginBottom: 4 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: Colors.text },
  emptyDesc: { fontSize: 14, color: Colors.sub, textAlign: 'center', lineHeight: 20 },
  goBtn: { marginTop: 8, backgroundColor: Colors.primary, paddingVertical: 12, paddingHorizontal: 24, borderRadius: 12 },
  goBtnText: { color: Colors.white, fontWeight: '700', fontSize: 15 },
  compareRow: { flexDirection: 'row', gap: 10 },
  compareCard: { flex: 1, backgroundColor: Colors.white, borderRadius: 12, padding: 12, alignItems: 'center', gap: 6 },
  removeBtn: { alignSelf: 'flex-end', padding: 4 },
  removeBtnText: { fontSize: 12, color: Colors.sub },
  compareCardImage: { width: 60, height: 60, borderRadius: 12, backgroundColor: '#FFE8F0', alignItems: 'center', justifyContent: 'center' },
  compareCardType: { fontSize: 10, color: Colors.sub, fontWeight: '600' },
  compareCardName: { fontSize: 13, fontWeight: '700', color: Colors.text, textAlign: 'center' },
  compareCardPrice: { fontSize: 11, color: Colors.primary, fontWeight: '600', textAlign: 'center' },
  compareCardRating: { fontSize: 11, color: Colors.sub },
  emptySlot: {
    flex: 1, backgroundColor: Colors.white, borderRadius: 12, padding: 12,
    alignItems: 'center', justifyContent: 'center', gap: 8,
    borderWidth: 2, borderColor: Colors.border, borderStyle: 'dashed', minHeight: 160,
  },
  emptySlotIcon: { fontSize: 28, color: Colors.border },
  emptySlotText: { fontSize: 13, color: Colors.sub },
  aiResultBanner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#FFF0F7', borderRadius: 16, padding: 16,
    borderWidth: 1.5, borderColor: Colors.primaryLight,
  },
  aiResultBannerLeft: { flex: 1, gap: 4 },
  aiResultBannerBadge: { fontSize: 11, fontWeight: '700', color: Colors.primary },
  aiResultBannerName: { fontSize: 16, fontWeight: '800', color: Colors.text },
  aiResultBannerScore: { fontSize: 12, color: Colors.sub },
  aiResultBannerImg: { width: 52, height: 52, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginLeft: 12 },
  aiBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: Colors.primary, borderRadius: 16, padding: 16,
  },
  aiBtnGradient: {
    width: 44, height: 44, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center', justifyContent: 'center',
  },
  aiBtnIcon: {},
  aiBtnTitle: { fontSize: 15, fontWeight: '700', color: Colors.white },
  aiBtnSub: { fontSize: 12, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  aiBtnArrow: { fontSize: 20, color: 'rgba(255,255,255,0.8)' },
  table: { backgroundColor: Colors.white, borderRadius: 12, padding: 16, gap: 0 },
  tableTitle: { fontSize: 15, fontWeight: '700', color: Colors.text, marginBottom: 4 },
  tableRow: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 12, borderTopWidth: 1, borderTopColor: Colors.border },
  tableRowHighlight: { backgroundColor: '#FFF8FA' },
  tableLabel: { width: 60, fontSize: 12, color: Colors.sub, fontWeight: '600', paddingTop: 2 },
  tableLabelHighlight: { color: Colors.primary },
  tableValue: { flex: 1, fontSize: 12, color: Colors.text, fontWeight: '500', textAlign: 'center', lineHeight: 18 },
  tableValueHighlight: { color: '#555' },
  tableDisclaimer: { paddingTop: 12, borderTopWidth: 1, borderTopColor: Colors.border },
  tableDisclaimerText: { fontSize: 10, color: Colors.sub, lineHeight: 16 },

  /* 비용 환산 비교 */
  costCard: {
    backgroundColor: Colors.white, borderRadius: 18, padding: 18, gap: 12,
    borderWidth: 1, borderColor: Colors.border,
    shadowColor: Colors.cardShadow,
    shadowOffset: { width: 0, height: 4 }, shadowOpacity: 1, shadowRadius: 12, elevation: 3,
  },
  costTitle: { fontSize: 16, fontWeight: '800', color: Colors.text },
  costSubtitle: { fontSize: 12, color: Colors.sub, marginTop: -4 },
  costRows: { gap: 10 },
  costRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: Colors.bg, borderRadius: 12, padding: 12, gap: 10,
  },
  costRowLeft: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  costBadge: { paddingVertical: 3, paddingHorizontal: 8, borderRadius: 8 },
  costBadgeText: { fontSize: 11, fontWeight: '700' },
  costItemName: { flex: 1, fontSize: 13, fontWeight: '700', color: Colors.text },
  costRowRight: { alignItems: 'flex-end', gap: 2 },
  costAmount: { fontSize: 15, fontWeight: '800', color: Colors.primary },
  costNote: { fontSize: 11, color: Colors.sub, fontWeight: '600' },
  costNoteDetail: { fontSize: 10, color: Colors.sub },
  costDisclaimer: { fontSize: 10, color: Colors.sub, lineHeight: 16 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: Colors.white, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, paddingBottom: 48, maxHeight: '90%',
  },
  modalTopBar: { alignItems: 'center', marginBottom: 16, position: 'relative' },
  modalHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: Colors.border },
  modalCloseX: { position: 'absolute', right: 0, top: -10, padding: 8 },
  aiLoadingWrap: { alignItems: 'center', gap: 16, paddingVertical: 32 },
  aiLoadingTitle: { fontSize: 18, fontWeight: '700', color: Colors.text },
  aiLoadingSub: { fontSize: 14, color: Colors.sub, textAlign: 'center', lineHeight: 22 },
  modalTitle: { fontSize: 20, fontWeight: '800', color: Colors.text, marginBottom: 20 },
  aiWinnerCard: { alignItems: 'center', backgroundColor: Colors.bg, borderRadius: 16, padding: 24, marginBottom: 16, gap: 8 },
  aiWinnerBadge: { fontSize: 12, fontWeight: '700', color: Colors.primary, backgroundColor: Colors.primaryLight, paddingVertical: 4, paddingHorizontal: 12, borderRadius: 20 },
  aiWinnerImg: { width: 80, height: 80, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  aiWinnerName: { fontSize: 18, fontWeight: '800', color: Colors.text },
  aiWinnerScore: { fontSize: 13, color: Colors.primary, fontWeight: '700' },
  aiWinnerDesc: { fontSize: 12, color: Colors.sub, textAlign: 'center', lineHeight: 18, marginTop: 6, paddingHorizontal: 8 },
  aiReasonCard: { backgroundColor: Colors.bg, borderRadius: 12, padding: 16, marginBottom: 12, gap: 10 },
  aiReasonTitle: { fontSize: 14, fontWeight: '700', color: Colors.text, marginBottom: 4 },
  aiReasonRow: { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  aiReasonDot: { fontSize: 13, color: Colors.primary, fontWeight: '700', marginTop: 1 },
  aiReasonText: { flex: 1, fontSize: 13, color: Colors.sub, lineHeight: 20 },
  aiScoreCard: { backgroundColor: Colors.bg, borderRadius: 12, padding: 16, marginBottom: 20, gap: 12 },
  aiScoreRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  aiScoreName: { width: 80, fontSize: 12, color: Colors.text, fontWeight: '600' },
  aiScoreBarWrap: { flex: 1, height: 8, backgroundColor: Colors.border, borderRadius: 4, overflow: 'hidden' },
  aiScoreBar: { height: 8, backgroundColor: Colors.primary, borderRadius: 4 },
  aiScoreNum: { width: 32, fontSize: 12, color: Colors.primary, fontWeight: '700', textAlign: 'right' },
  modalCloseBtn: { backgroundColor: Colors.primary, borderRadius: 12, padding: 16, alignItems: 'center' },
  modalCloseBtnText: { color: Colors.white, fontWeight: '700', fontSize: 16 },
  aiBreakdownCard: { backgroundColor: Colors.bg, borderRadius: 12, padding: 16, marginBottom: 20, gap: 10 },
  aiBreakdownSub: { fontSize: 11, color: Colors.sub, fontWeight: '400' },
  aiBreakdownRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingVertical: 6, borderTopWidth: 1, borderTopColor: Colors.border },
  aiBreakdownLeft: { flex: 1, gap: 2 },
  aiBreakdownLabel: { fontSize: 13, fontWeight: '600', color: Colors.text },
  aiBreakdownDetail: { fontSize: 11, color: Colors.sub },
  aiBreakdownScore: { fontSize: 15, fontWeight: '800', color: Colors.primary, minWidth: 40, textAlign: 'right' },
  aiBreakdownScoreZero: { color: Colors.sub },
  aiBreakdownMax: { fontSize: 11, fontWeight: '400', color: Colors.sub },
  aiBreakdownNote: { marginTop: 4, paddingTop: 8, borderTopWidth: 1, borderTopColor: Colors.border },
  aiBreakdownNoteText: { fontSize: 10, color: Colors.sub, lineHeight: 16 },
  confirmSheet: {
    backgroundColor: Colors.white, borderRadius: 20, padding: 24, margin: 32,
    shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.15, shadowRadius: 20, elevation: 10,
  },
  confirmTitle: { fontSize: 17, fontWeight: '800', color: Colors.text, marginBottom: 8 },
  confirmDesc: { fontSize: 14, color: Colors.sub, marginBottom: 24, lineHeight: 20 },
  confirmBtns: { flexDirection: 'row', gap: 10 },
  confirmCancel: {
    flex: 1, paddingVertical: 14, borderRadius: 12,
    borderWidth: 1.5, borderColor: Colors.border, alignItems: 'center',
  },
  confirmCancelText: { fontSize: 15, fontWeight: '600', color: Colors.sub },
  confirmOk: { flex: 1, paddingVertical: 14, borderRadius: 12, backgroundColor: Colors.danger, alignItems: 'center' },
  confirmOkText: { fontSize: 15, fontWeight: '700', color: Colors.white },

  /* 전문가 상담 */
  consultCard: {
    backgroundColor: Colors.white, borderRadius: 18, padding: 20,
    borderWidth: 1.5, borderColor: '#E0D7FF',
    shadowColor: '#6B4EFF', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08, shadowRadius: 12, elevation: 4,
  },
  consultHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  consultTitle: { fontSize: 16, fontWeight: '800', color: Colors.text },
  consultBadge: {
    backgroundColor: '#F0ECFF', paddingVertical: 4, paddingHorizontal: 10,
    borderRadius: 20,
  },
  consultBadgeText: { fontSize: 12, fontWeight: '700', color: '#6B4EFF' },
  consultDesc: { fontSize: 13, color: Colors.sub, lineHeight: 18, marginBottom: 16 },
  consultBtns: { flexDirection: 'row', gap: 10 },
  consultBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 14, borderRadius: 14,
    backgroundColor: Colors.bg, borderWidth: 1.5, borderColor: Colors.border,
  },
  consultBtnKakao: { backgroundColor: '#FEE500', borderColor: '#FEE500' },
  consultBtnIcon: {},
  consultBtnText: { fontSize: 14, fontWeight: '700', color: Colors.text },
});
