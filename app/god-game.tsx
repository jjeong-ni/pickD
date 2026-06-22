import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  ScrollView,
  Share,
  Platform,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

const { width: W, height: H } = Dimensions.get('window');
const MAX = 5;

// ─── 재료 목록 ────────────────────────────────────────────────────
const INGREDIENTS = [
  { id: 'sleep',    emoji: '😴', name: '잠만자',     desc: '알람 5개는 기본 세팅',   category: 'rest' },
  { id: 'food',     emoji: '🍔', name: '먹방러',     desc: '배고프면 사람이 변함',   category: 'food' },
  { id: 'phone',    emoji: '📱', name: '폰 중독',    desc: '자기 전 5분이 2시간',    category: 'digital' },
  { id: 'emotional',emoji: '😭', name: '감수성 폭발',desc: '광고 보다 울기 가능',    category: 'emotion' },
  { id: 'stubborn', emoji: '😤', name: '고집 한 스푼',desc: '내가 맞다, 무조건',    category: 'personality' },
  { id: 'overthink',emoji: '🤔', name: '생각 과부하',desc: '자기 전 뇌 OFF 불가',   category: 'personality' },
  { id: 'talkative',emoji: '🗣️', name: '수다쟁이',  desc: '침묵이 너무 불편해',    category: 'social' },
  { id: 'gaming',   emoji: '🎮', name: '게임광',     desc: '한 판만... 또 한 판만',  category: 'digital' },
  { id: 'night',    emoji: '🌙', name: '야행성',     desc: '새벽 2시가 골든타임',   category: 'rest' },
  { id: 'perfect',  emoji: '✨', name: '완벽주의',   desc: '각도기 들고 살기',       category: 'personality' },
  { id: 'broke',    emoji: '💸', name: '텅장 체질',  desc: '월급은 잠깐 들렀다 감', category: 'daily' },
  { id: 'coffee',   emoji: '☕', name: '카페인 의존',desc: '커피 없인 아침 없어',   category: 'food' },
  { id: 'laugh',    emoji: '😂', name: '웃음보 터짐',desc: '혼자 웃다 이상한 사람', category: 'emotion' },
  { id: 'clumsy',   emoji: '🫨', name: '덜렁거림',  desc: '핸드폰 또 어딨지',      category: 'daily' },
  { id: 'fitness',  emoji: '💪', name: '운동귀신',   desc: '쉬는 날도 헬스장',      category: 'energy' },
  { id: 'sensitive',emoji: '🥺', name: '눈치 레이더',desc: '공기 읽기 전문가',      category: 'social' },
] as const;

type Ingredient = (typeof INGREDIENTS)[number];
type IngredientId = Ingredient['id'];

// ─── 카테고리 메타 ─────────────────────────────────────────────────
const CAT_NAME: Record<string, string> = {
  rest:        '☁️ 여유/수면',
  food:        '🍽️ 먹방',
  digital:     '💻 디지털',
  emotion:     '💕 감성',
  personality: '🧠 성격',
  social:      '🌸 사회성',
  daily:       '📦 일상',
  energy:      '⚡ 에너지',
};

const CAT_COLOR: Record<string, string> = {
  rest: '#7BB8F5', food: '#F5A83C', digital: '#5CB85C',
  emotion: '#E56FAF', personality: '#9B7FE0', social: '#3CB8A3',
  daily: '#E0A83C', energy: '#FF6B2F',
};

// ─── 성격 유형 ─────────────────────────────────────────────────────
const PERSONALITY_TYPES = [
  {
    id: 'sleepy', emoji: '😪',
    title: '인간 슬리핑 뷰티',
    subtitle: '이불 밖은 위험해 타입',
    dominant: ['rest'],
    desc: '수면이야말로 최고의 힐링. 이불 밖은 위험하다는 걸 온몸으로 아는 분. 하지만 그 여유로운 에너지로 주변에 평화를 가져다준다. 잠깐, 지금도 졸려?',
    tags: ['#이불밖은위험해', '#수면전문가', '#알람5개기본'],
  },
  {
    id: 'digital', emoji: '🤖',
    title: '디지털 좀비',
    subtitle: '충전 없으면 방전 타입',
    dominant: ['digital'],
    desc: '핸드폰과 한 몸. 화면이 꺼지면 불안한 현대인. 알고리즘이 나를 나보다 더 잘 알고, 충전기를 잃으면 존재 자체가 흔들린다.',
    tags: ['#폰없으면못살아', '#디지털원주민', '#충전기인생'],
  },
  {
    id: 'emotional', emoji: '🎭',
    title: 'K-드라마 주인공',
    subtitle: '감성 MAX 공감 천재',
    dominant: ['emotion', 'social'],
    desc: '광고 보다 울고, 드라마 보다 울고, 그러면서도 웃음이 끊이지 않는다. 공감 능력이 탑재된 인간 감성 충만 FULL. 주변 사람들의 마음을 누구보다 잘 안다.',
    tags: ['#감수성폭발', '#공감의신', '#눈물도웃음도많아'],
  },
  {
    id: 'thinker', emoji: '🧠',
    title: '뇌가 쉬지를 않아',
    subtitle: '생각 고구마 줄기 타입',
    dominant: ['personality'],
    desc: '자기 전 5년 후 걱정하고, 완벽하게 하려다 시작을 못 하기도. 하지만 그 꼼꼼함과 깊이가 어떤 일이든 특별하게 만든다. 장단점이 명확한 매력.',
    tags: ['#생각과부하', '#완벽주의자', '#고집도있어'],
  },
  {
    id: 'foodie', emoji: '🍴',
    title: '먹방의 신',
    subtitle: '배 부르면 행복 타입',
    dominant: ['food'],
    desc: '먹는 게 낙이고, 먹는 게 힐링. 맛집 리스트 항상 업데이트 중. 배고프면 사람이 변한다는 걸 주변 사람들이 먼저 안다. 오늘 저녁은 뭐 먹지?',
    tags: ['#먹방러', '#음식이행복', '#배고프면주의'],
  },
  {
    id: 'social', emoji: '🌟',
    title: '분위기 메이커',
    subtitle: '침묵이 불편한 타입',
    dominant: ['social'],
    desc: '어디서나 웃음을 만드는 분위기 메이커. 침묵은 채워야 하고, 새로운 사람 만나는 게 즐겁다. 모임의 태양 같은 존재. 혼자 있어도 뇌 속에서 대화 중.',
    tags: ['#수다쟁이', '#분위기메이커', '#인싸본능'],
  },
  {
    id: 'energy', emoji: '⚡',
    title: '에너자이저 폭발형',
    subtitle: '에너지가 어디서 나와 타입',
    dominant: ['energy'],
    desc: '쉬는 날도 헬스장, 체력이 넘쳐서 주변이 지친다. 하지만 그 에너지로 목표 달성율 200%. 몸이 먼저 움직이고 머리가 따라가는 액션 타입.',
    tags: ['#운동귀신', '#에너지폭발', '#몸이먼저움직여'],
  },
  {
    id: 'daily', emoji: '😅',
    title: '일상의 생존러',
    subtitle: '카페인으로 버티는 타입',
    dominant: ['daily'],
    desc: '텅장이지만 오늘도 행복하고, 덜렁거리지만 어떻게든 해낸다. 커피 없이는 아침이 없는 현실형 인간의 정석. 생존 본능 하나만큼은 탑재.',
    tags: ['#텅장러', '#카페인의존', '#그래도살아남기'],
  },
  {
    id: 'chaotic', emoji: '🎰',
    title: '신도 포기한 조합',
    subtitle: '예측 불가 혼돈 천재',
    dominant: [],
    desc: '도무지 한 마디로 정의 불가. 다양한 매력이 폭발적으로 섞여 신도 손 놓은 독특한 존재. 만나는 사람마다 다른 나를 발견하게 된다. 그것이 매력.',
    tags: ['#반전매력', '#예측불가', '#나도나를모름'],
  },
];

function getPersonalityType(items: Ingredient[]) {
  const counts: Record<string, number> = {};
  items.forEach(i => { counts[i.category] = (counts[i.category] || 0) + 1; });
  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);

  // 5개 전부 다른 카테고리 → chaotic
  if (sorted.length >= 4 && sorted[0][1] === 1) {
    return PERSONALITY_TYPES.find(p => p.id === 'chaotic')!;
  }
  const topCat = sorted[0]?.[0];
  const topCount = sorted[0]?.[1] ?? 0;

  const match = PERSONALITY_TYPES.find(p =>
    topCount >= 2 && p.dominant.includes(topCat)
  );
  return match ?? PERSONALITY_TYPES.find(p => p.id === 'chaotic')!;
}

function getCategoryBreakdown(items: Ingredient[]) {
  const counts: Record<string, number> = {};
  items.forEach(i => { counts[i.category] = (counts[i.category] || 0) + 1; });
  return Object.entries(counts)
    .map(([cat, count]) => ({ cat, count, pct: Math.round((count / items.length) * 100) }))
    .sort((a, b) => b.count - a.count);
}

const PARTICLE_EMOJIS = ['✨', '💥', '🌟', '⚡', '🔥', '💨', '🫧', '💫'];

// ─── 메인 컴포넌트 ──────────────────────────────────────────────────
export default function GodGame() {
  const [phase, setPhase] = useState<'select' | 'explosion' | 'result'>('select');
  const [selected, setSelected] = useState<Ingredient[]>([]);
  const [godMood, setGodMood] = useState('🧑‍🔬');

  const godX       = useRef(new Animated.Value(0)).current;
  const godY       = useRef(new Animated.Value(0)).current;
  const godRotate  = useRef(new Animated.Value(0)).current;
  const beakerScale= useRef(new Animated.Value(1)).current;
  const flashOpacity = useRef(new Animated.Value(0)).current;
  const resultY    = useRef(new Animated.Value(H)).current;
  const fillAnim   = useRef(new Animated.Value(0)).current;
  const labelOpacity = useRef(new Animated.Value(1)).current;

  const bounceAnims = useRef(
    INGREDIENTS.reduce((acc, ing) => {
      acc[ing.id] = new Animated.Value(1);
      return acc;
    }, {} as Record<IngredientId, Animated.Value>)
  ).current;

  const particleAnims = useRef(
    Array.from({ length: 8 }, (_, i) => ({
      x: new Animated.Value(0),
      y: new Animated.Value(0),
      opacity: new Animated.Value(0),
      scale: new Animated.Value(0),
      emoji: PARTICLE_EMOJIS[i],
    }))
  ).current;

  useEffect(() => {
    Animated.timing(fillAnim, {
      toValue: selected.length / MAX,
      duration: 350,
      useNativeDriver: false,
    }).start();
  }, [selected.length]);

  const triggerExplosion = useCallback(() => {
    setGodMood('😰');

    // 비커 흔들림
    Animated.sequence([
      Animated.timing(beakerScale, { toValue: 1.5, duration: 180, useNativeDriver: true }),
      Animated.timing(beakerScale, { toValue: 0.8, duration: 120, useNativeDriver: true }),
      Animated.timing(beakerScale, { toValue: 1.4, duration: 140, useNativeDriver: true }),
      Animated.timing(beakerScale, { toValue: 0.9, duration: 100, useNativeDriver: true }),
      Animated.timing(beakerScale, { toValue: 1.0, duration: 200, useNativeDriver: true }),
    ]).start();

    // 신 좌우 흔들림
    const shakeSeq = Array.from({ length: 10 }, (_, i) =>
      Animated.timing(godX, { toValue: i % 2 === 0 ? 22 : -22, duration: 70, useNativeDriver: true })
    );
    Animated.sequence([
      ...shakeSeq,
      Animated.timing(godX, { toValue: 0, duration: 70, useNativeDriver: true }),
    ]).start();

    // 신 위아래 달리기
    Animated.sequence([
      Animated.delay(200),
      Animated.timing(godY, { toValue: -20, duration: 150, useNativeDriver: true }),
      Animated.timing(godY, { toValue: 10, duration: 120, useNativeDriver: true }),
      Animated.timing(godY, { toValue: -15, duration: 130, useNativeDriver: true }),
      Animated.timing(godY, { toValue: 0, duration: 150, useNativeDriver: true }),
    ]).start(() => setGodMood('💥'));

    // 신 회전
    Animated.sequence([
      Animated.delay(400),
      Animated.timing(godRotate, { toValue: 1, duration: 250, useNativeDriver: true }),
      Animated.timing(godRotate, { toValue: -1, duration: 250, useNativeDriver: true }),
      Animated.timing(godRotate, { toValue: 0.5, duration: 200, useNativeDriver: true }),
      Animated.timing(godRotate, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start(() => setTimeout(() => setGodMood('😵‍💫'), 200));

    // 플래시
    Animated.sequence([
      Animated.timing(flashOpacity, { toValue: 0.9, duration: 80, useNativeDriver: true }),
      Animated.timing(flashOpacity, { toValue: 0, duration: 600, useNativeDriver: true }),
    ]).start();

    // 파티클
    particleAnims.forEach((p, i) => {
      const angle = (i / particleAnims.length) * Math.PI * 2;
      const dist = 90 + Math.random() * 60;
      p.x.setValue(0); p.y.setValue(0);
      p.opacity.setValue(0); p.scale.setValue(0);
      Animated.sequence([
        Animated.delay(150 + i * 50),
        Animated.parallel([
          Animated.timing(p.opacity,  { toValue: 1,                      duration: 120, useNativeDriver: true }),
          Animated.timing(p.scale,    { toValue: 1.6,                     duration: 120, useNativeDriver: true }),
          Animated.timing(p.x,        { toValue: Math.cos(angle) * dist,  duration: 750, useNativeDriver: true }),
          Animated.timing(p.y,        { toValue: Math.sin(angle) * dist,  duration: 750, useNativeDriver: true }),
        ]),
        Animated.timing(p.opacity, { toValue: 0, duration: 350, useNativeDriver: true }),
      ]).start();
    });

    // 결과 화면 슬라이드 업
    setTimeout(() => {
      setPhase('result');
      Animated.spring(resultY, { toValue: 0, useNativeDriver: true, tension: 55, friction: 9 }).start();
    }, 2900);
  }, []);

  const handleSelect = useCallback((ing: Ingredient) => {
    if (phase !== 'select') return;
    const isSel = !!selected.find(s => s.id === ing.id);

    Animated.sequence([
      Animated.timing(bounceAnims[ing.id], { toValue: 0.8, duration: 80, useNativeDriver: true }),
      Animated.spring(bounceAnims[ing.id], { toValue: 1, useNativeDriver: true, tension: 220, friction: 5 }),
    ]).start();

    if (isSel) {
      setSelected(prev => prev.filter(s => s.id !== ing.id));
      return;
    }
    if (selected.length >= MAX) return;

    const newSel = [...selected, ing];
    setSelected(newSel);

    if (newSel.length === MAX) {
      // 라벨 fade out 후 폭발
      Animated.timing(labelOpacity, { toValue: 0, duration: 300, useNativeDriver: true }).start();
      setPhase('explosion');
      setTimeout(triggerExplosion, 350);
    }
  }, [selected, phase, triggerExplosion]);

  const handleReset = useCallback(() => {
    setSelected([]);
    setGodMood('🧑‍🔬');
    setPhase('select');
    resultY.setValue(H);
    fillAnim.setValue(0);
    godX.setValue(0); godY.setValue(0); godRotate.setValue(0);
    flashOpacity.setValue(0);
    labelOpacity.setValue(1);
  }, []);

  const handleShare = useCallback(async () => {
    const pType = getPersonalityType(selected);
    const bd = getCategoryBreakdown(selected);
    const ingList = selected.map(i => `${i.emoji} ${i.name}`).join(' · ');
    const catList = bd.map(b => `${CAT_NAME[b.cat]} ${b.pct}%`).join('\n');
    const msg = [
      '🧪 신이 나를 만들 때',
      '',
      `${pType.emoji} ${pType.title}`,
      `"${pType.subtitle}"`,
      '',
      `📦 나의 재료: ${ingList}`,
      '',
      '📊 성분 분석:',
      catList,
      '',
      pType.tags.join(' '),
      '',
      '#신이나를만들때 #PickD',
    ].join('\n');
    try { await Share.share({ message: msg }); } catch { /* ignore */ }
  }, [selected]);

  const godRotateInterp = godRotate.interpolate({
    inputRange: [-1, 0, 1],
    outputRange: ['-35deg', '0deg', '35deg'],
  });

  const personality = (phase === 'result' || (phase === 'explosion' && selected.length === MAX))
    ? getPersonalityType(selected) : null;
  const breakdown = personality ? getCategoryBreakdown(selected) : [];

  // 비커 색상 (채워질수록 과학 실험 색으로)
  const beakerColor = fillAnim.interpolate({
    inputRange: [0, 0.2, 0.4, 0.6, 0.8, 1.0],
    outputRange: ['#7BB8F5', '#5CB85C', '#9B7FE0', '#F5A83C', '#FF6B2F', '#FF3030'],
  });

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" />
      <LinearGradient colors={['#120428', '#1D0A40', '#0D1A38']} style={StyleSheet.absoluteFill} />

      {/* 별 배경 */}
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        {['✦','✧','✦','✧','✦','✧','✦','✧','✦','✧','✦','✧'].map((star, i) => (
          <Text key={i} style={[s.star, {
            left: `${(i * 9) % 95}%` as any,
            top: `${(i * 13) % 45}%` as any,
            opacity: 0.15 + (i % 4) * 0.12,
            fontSize: 6 + (i % 4) * 3,
          }]}>{star}</Text>
        ))}
      </View>

      <SafeAreaView style={s.safe}>
        {/* ── 헤더 ── */}
        <View style={s.header}>
          <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
            <Ionicons name="arrow-back" size={22} color="rgba(255,255,255,0.8)" />
          </TouchableOpacity>
          <View style={s.headerCenter}>
            <Text style={s.headerTitle}>🧪 신이 나를 만들 때</Text>
            <Text style={s.headerSub}>실험실 성격 분석기</Text>
          </View>
          <View style={{ width: 40 }} />
        </View>

        {/* ── 실험실 영역 (신 + 비커) ── */}
        <View style={s.labRow}>
          {/* 신 캐릭터 */}
          <Animated.View style={[s.godWrap, {
            transform: [
              { translateX: godX },
              { translateY: godY },
              { rotate: godRotateInterp },
            ],
          }]}>
            <Text style={s.godEmoji}>{godMood}</Text>
            {phase === 'select' && (
              <Animated.Text style={[s.godLabel, { opacity: labelOpacity }]}>
                {selected.length === 0   ? '재료를 골라봐!' :
                 selected.length < MAX   ? `${MAX - selected.length}개 남았어!` :
                                           '실험 시작! 💥'}
              </Animated.Text>
            )}
            {phase === 'explosion' && (
              <Text style={s.godLabelExplosion}>헤롱헤롱...</Text>
            )}
          </Animated.View>

          {/* 비커 */}
          <Animated.View style={[s.beakerWrap, { transform: [{ scale: beakerScale }] }]}>
            <View style={s.beakerTube}>
              {/* 눈금선 */}
              {[1,2,3,4].map(i => (
                <View key={i} style={[s.beakerTick, { bottom: `${i * 20}%` }]} />
              ))}
              {/* 채워지는 액체 */}
              <Animated.View style={[s.beakerLiquid, {
                height: fillAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
                backgroundColor: beakerColor,
              }]}>
                {selected.length > 0 && (
                  <Text style={s.beakerBubble} numberOfLines={1}>
                    {selected.slice(-2).map(i => i.emoji).join('')}
                  </Text>
                )}
              </Animated.View>
            </View>
            <View style={s.beakerStem} />
            <View style={s.beakerBase} />
            <Text style={s.beakerCount}>{selected.length}/{MAX}</Text>
          </Animated.View>

          {/* 파티클 */}
          {particleAnims.map((p, i) => (
            <Animated.View key={i} pointerEvents="none" style={[s.particle, {
              transform: [{ translateX: p.x }, { translateY: p.y }, { scale: p.scale }],
              opacity: p.opacity,
            }]}>
              <Text style={s.particleEmoji}>{p.emoji}</Text>
            </Animated.View>
          ))}
        </View>

        {/* ── 선택된 재료 스트립 ── */}
        {selected.length > 0 && phase === 'select' && (
          <ScrollView
            horizontal showsHorizontalScrollIndicator={false}
            style={s.strip}
            contentContainerStyle={s.stripInner}
          >
            {selected.map(ing => (
              <TouchableOpacity
                key={ing.id} style={s.stripChip}
                onPress={() => handleSelect(ing)} activeOpacity={0.7}
              >
                <Text style={s.stripChipEmoji}>{ing.emoji}</Text>
                <Text style={s.stripChipName}>{ing.name}</Text>
                <Text style={s.stripChipX}>×</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {/* ── 재료 그리드 ── */}
        {phase === 'select' && (
          <ScrollView
            style={s.gridScroll}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={s.gridContent}
          >
            <Text style={s.gridHint}>
              {selected.length < MAX
                ? `🧫 재료를 ${MAX}개 골라봐 (${selected.length}/${MAX})`
                : '🎉 5개 선택 완료! 폭발 중...'}
            </Text>
            <View style={s.grid}>
              {INGREDIENTS.map(ing => {
                const isSel     = !!selected.find(s => s.id === ing.id);
                const isDisabled = !isSel && selected.length >= MAX;
                return (
                  <Animated.View key={ing.id} style={{ transform: [{ scale: bounceAnims[ing.id] }] }}>
                    <TouchableOpacity
                      style={[s.card, isSel && s.cardSel, isDisabled && s.cardDim]}
                      onPress={() => handleSelect(ing)}
                      activeOpacity={0.75}
                    >
                      <Text style={s.cardEmoji}>{ing.emoji}</Text>
                      <Text style={[s.cardName, isSel && s.cardNameSel]}>{ing.name}</Text>
                      <Text style={[s.cardDesc, isSel && s.cardDescSel]} numberOfLines={2}>{ing.desc}</Text>
                      {isSel && (
                        <View style={s.badge}>
                          <Text style={s.badgeTxt}>✓</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  </Animated.View>
                );
              })}
            </View>
          </ScrollView>
        )}

        {/* ── 폭발 중 안내 ── */}
        {phase === 'explosion' && (
          <View style={s.explosionMid}>
            <Text style={s.explosionTitle}>⚗️ 실험 진행 중!!</Text>
            <Text style={s.explosionSub}>신이 열심히 섞고 있어요...</Text>
            <View style={s.explosionIngs}>
              {selected.map(ing => (
                <Text key={ing.id} style={s.explosionIngEmoji}>{ing.emoji}</Text>
              ))}
            </View>
            <Text style={s.explosionDots}>· · ·</Text>
          </View>
        )}
      </SafeAreaView>

      {/* ── 플래시 오버레이 ── */}
      <Animated.View
        pointerEvents="none"
        style={[StyleSheet.absoluteFill, s.flashLayer, { opacity: flashOpacity }]}
      />

      {/* ── 결과 화면 ── */}
      {personality && (
        <Animated.View style={[s.resultLayer, { transform: [{ translateY: resultY }] }]}>
          <LinearGradient colors={['#120428', '#1D0A40', '#0D1438']} style={StyleSheet.absoluteFill} />
          <SafeAreaView style={s.safe}>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.resultContent}>
              {/* 결과 헤더 */}
              <View style={s.resultHeader}>
                <Text style={s.resultHeaderTxt}>🧪 실험 결과가 나왔어!</Text>
              </View>

              {/* 성격 유형 카드 */}
              <LinearGradient
                colors={['rgba(155,127,224,0.3)', 'rgba(107,181,255,0.15)']}
                style={s.typeCard}
              >
                <Text style={s.typeEmoji}>{personality.emoji}</Text>
                <Text style={s.typeTitle}>{personality.title}</Text>
                <Text style={s.typeSub}>{personality.subtitle}</Text>
              </LinearGradient>

              {/* 선택한 재료 */}
              <View style={s.section}>
                <Text style={s.sectionTitle}>📦 넣은 재료</Text>
                <View style={s.recapGrid}>
                  {selected.map(ing => (
                    <View key={ing.id} style={s.recapChip}>
                      <Text style={s.recapEmoji}>{ing.emoji}</Text>
                      <Text style={s.recapName}>{ing.name}</Text>
                    </View>
                  ))}
                </View>
              </View>

              {/* 성분 비율 분석 */}
              <View style={s.section}>
                <Text style={s.sectionTitle}>📊 성분 비율 분석</Text>
                {breakdown.map(b => (
                  <View key={b.cat} style={s.barRow}>
                    <Text style={s.barLabel}>{CAT_NAME[b.cat]}</Text>
                    <View style={s.barTrack}>
                      <View style={[s.barFill, {
                        width: `${b.pct}%` as any,
                        backgroundColor: CAT_COLOR[b.cat] ?? '#9B7FE0',
                      }]} />
                    </View>
                    <Text style={s.barPct}>{b.pct}%</Text>
                  </View>
                ))}
              </View>

              {/* 이 조합은요 */}
              <View style={s.section}>
                <Text style={s.sectionTitle}>💬 이 조합은요...</Text>
                <View style={s.descBox}>
                  <Text style={s.descTxt}>{personality.desc}</Text>
                </View>
                <View style={s.tagsRow}>
                  {personality.tags.map(tag => (
                    <View key={tag} style={s.tag}>
                      <Text style={s.tagTxt}>{tag}</Text>
                    </View>
                  ))}
                </View>
              </View>

              {/* 액션 버튼 */}
              <View style={s.actionRow}>
                <TouchableOpacity style={s.shareBtn} onPress={handleShare} activeOpacity={0.85}>
                  <Ionicons name="share-social-outline" size={18} color="white" />
                  <Text style={s.shareBtnTxt}>결과 공유하기</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.resetBtn} onPress={handleReset} activeOpacity={0.85}>
                  <Ionicons name="refresh-outline" size={18} color="#C084FC" />
                  <Text style={s.resetBtnTxt}>다시 하기</Text>
                </TouchableOpacity>
              </View>

              <Text style={s.bottomTag}>#신이나를만들때 #PickD</Text>
            </ScrollView>
          </SafeAreaView>
        </Animated.View>
      )}
    </View>
  );
}

// ─── 스타일 ────────────────────────────────────────────────────────
const CARD_W = (W - 48) / 3;

const s = StyleSheet.create({
  root: { flex: 1 },
  safe: { flex: 1 },
  star: { position: 'absolute', color: 'white' },

  // 헤더
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10 },
  backBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'flex-start' },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: { color: 'white', fontSize: 16, fontWeight: '700' },
  headerSub: { color: 'rgba(255,255,255,0.5)', fontSize: 11, marginTop: 1 },

  // 실험실 영역
  labRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around',
    paddingHorizontal: 20, paddingVertical: 6, minHeight: 120,
  },
  godWrap: { alignItems: 'center', width: 120 },
  godEmoji: { fontSize: 64 },
  godLabel: { color: 'rgba(255,255,255,0.75)', fontSize: 11, marginTop: 4, textAlign: 'center' },
  godLabelExplosion: { color: '#FFD700', fontSize: 13, marginTop: 4, fontWeight: '700' },

  // 비커
  beakerWrap: { alignItems: 'center' },
  beakerTube: {
    width: 54, height: 80,
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.45)',
    borderRadius: 4, overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.04)',
    position: 'relative',
  },
  beakerTick: {
    position: 'absolute', left: 4, right: 4, height: 1,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  beakerLiquid: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    justifyContent: 'center', alignItems: 'center',
    borderRadius: 2,
  },
  beakerBubble: { fontSize: 13, textAlign: 'center' },
  beakerStem: { width: 20, height: 10, backgroundColor: 'rgba(255,255,255,0.3)', marginTop: -1 },
  beakerBase: { width: 38, height: 7, backgroundColor: 'rgba(255,255,255,0.25)', borderRadius: 3 },
  beakerCount: { color: 'rgba(255,255,255,0.7)', fontSize: 13, marginTop: 5, fontWeight: '800' },

  // 파티클
  particle: { position: 'absolute', alignSelf: 'center' },
  particleEmoji: { fontSize: 22 },

  // 선택 스트립
  strip: { maxHeight: 52, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.08)' },
  stripInner: { paddingHorizontal: 12, paddingVertical: 8, flexDirection: 'row', gap: 8 },
  stripChip: {
    backgroundColor: 'rgba(155,127,224,0.25)', borderRadius: 20,
    paddingHorizontal: 10, paddingVertical: 5,
    flexDirection: 'row', alignItems: 'center', gap: 4,
    borderWidth: 1, borderColor: 'rgba(155,127,224,0.5)',
  },
  stripChipEmoji: { fontSize: 14 },
  stripChipName: { color: 'white', fontSize: 11, fontWeight: '600' },
  stripChipX: { color: 'rgba(255,255,255,0.4)', fontSize: 11 },

  // 재료 그리드
  gridScroll: { flex: 1 },
  gridContent: { paddingHorizontal: 12, paddingBottom: 24 },
  gridHint: { color: 'rgba(255,255,255,0.55)', fontSize: 12, textAlign: 'center', marginVertical: 8 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' },

  card: {
    width: CARD_W, backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 14, padding: 10, alignItems: 'center',
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.1)', position: 'relative',
  },
  cardSel: { backgroundColor: 'rgba(155,127,224,0.22)', borderColor: '#9B7FE0' },
  cardDim: { opacity: 0.3 },
  cardEmoji: { fontSize: 28, marginBottom: 4 },
  cardName: { color: 'rgba(255,255,255,0.9)', fontSize: 11, fontWeight: '700', textAlign: 'center', marginBottom: 2 },
  cardNameSel: { color: '#D4BFFF' },
  cardDesc: { color: 'rgba(255,255,255,0.4)', fontSize: 9, textAlign: 'center', lineHeight: 12 },
  cardDescSel: { color: 'rgba(212,191,255,0.65)' },
  badge: {
    position: 'absolute', top: 5, right: 5,
    width: 16, height: 16, borderRadius: 8,
    backgroundColor: '#9B7FE0', justifyContent: 'center', alignItems: 'center',
  },
  badgeTxt: { color: 'white', fontSize: 9, fontWeight: '700' },

  // 폭발 중 화면
  explosionMid: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 14 },
  explosionTitle: { color: 'white', fontSize: 26, fontWeight: '900' },
  explosionSub: { color: 'rgba(255,255,255,0.65)', fontSize: 14 },
  explosionIngs: { flexDirection: 'row', gap: 6 },
  explosionIngEmoji: { fontSize: 34 },
  explosionDots: { color: 'rgba(255,255,255,0.4)', fontSize: 20, letterSpacing: 6 },

  // 플래시
  flashLayer: { backgroundColor: '#FFF5AA' },

  // 결과 화면
  resultLayer: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 100 },
  resultContent: { padding: 20, paddingBottom: 48 },
  resultHeader: { alignItems: 'center', marginBottom: 16 },
  resultHeaderTxt: { color: 'rgba(255,255,255,0.65)', fontSize: 13, letterSpacing: 0.5 },

  typeCard: {
    borderRadius: 22, padding: 28, alignItems: 'center',
    marginBottom: 22, borderWidth: 1.5, borderColor: 'rgba(155,127,224,0.35)',
  },
  typeEmoji: { fontSize: 68, marginBottom: 8 },
  typeTitle: { color: 'white', fontSize: 22, fontWeight: '900', textAlign: 'center', marginBottom: 4 },
  typeSub: { color: 'rgba(255,255,255,0.6)', fontSize: 14, textAlign: 'center' },

  section: { marginBottom: 22 },
  sectionTitle: { color: 'rgba(255,255,255,0.75)', fontSize: 13, fontWeight: '700', marginBottom: 12, letterSpacing: 0.4 },

  recapGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  recapChip: {
    backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 12,
    paddingHorizontal: 12, paddingVertical: 8,
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  recapEmoji: { fontSize: 18 },
  recapName: { color: 'white', fontSize: 12, fontWeight: '600' },

  barRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 8 },
  barLabel: { color: 'rgba(255,255,255,0.65)', fontSize: 11, width: 88 },
  barTrack: { flex: 1, height: 8, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 4, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 4 },
  barPct: { color: 'rgba(255,255,255,0.8)', fontSize: 11, width: 34, textAlign: 'right', fontWeight: '700' },

  descBox: { backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 14, padding: 16, marginBottom: 12 },
  descTxt: { color: 'rgba(255,255,255,0.82)', fontSize: 14, lineHeight: 22 },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tag: {
    backgroundColor: 'rgba(155,127,224,0.18)', borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 6,
    borderWidth: 1, borderColor: 'rgba(155,127,224,0.28)',
  },
  tagTxt: { color: '#D4BFFF', fontSize: 12, fontWeight: '600' },

  actionRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  shareBtn: {
    flex: 1, backgroundColor: '#9B7FE0', borderRadius: 14,
    paddingVertical: 14, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8,
  },
  shareBtnTxt: { color: 'white', fontSize: 14, fontWeight: '700' },
  resetBtn: {
    flex: 1, borderRadius: 14, paddingVertical: 14,
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8,
    borderWidth: 1.5, borderColor: '#9B7FE0',
  },
  resetBtnTxt: { color: '#C084FC', fontSize: 14, fontWeight: '700' },

  bottomTag: { color: 'rgba(255,255,255,0.3)', fontSize: 11, textAlign: 'center' },
});
