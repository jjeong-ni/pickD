import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Profile {
  skin_type?: string;
  baumann_code?: string;
  face_shape?: string;
  concerns?: string[];
  age_group?: string;
}

function has(text: string, kws: string[]): boolean {
  return kws.some(k => text.includes(k));
}

function getConcernTip(concern: string): string {
  if (has(concern, ['여드름', '트러블', '뾰루지'])) return '아그네스RF 또는 살균 레이저 추천';
  if (has(concern, ['주름', '탄력', '처짐', '노화'])) return '보톡스 + HIFU 리프팅 조합 추천';
  if (has(concern, ['색소', '기미', '잡티', '칙칙'])) return '피코레이저 + 레이저 토닝 추천';
  if (has(concern, ['모공'])) return '프락셀 또는 아그네스RF 추천';
  if (has(concern, ['홍조', '붉음'])) return 'IPL 또는 브이빔 레이저 추천';
  if (has(concern, ['건조', '수분'])) return '스킨부스터 또는 수분 보톡스 추천';
  if (has(concern, ['피지', '번들'])) return '레이저 토닝 + BHA 관리 추천';
  return '전문의 상담으로 맞춤 시술을 받으세요';
}

function getFaceShapeResponse(shape: string): string {
  const map: Record<string, string> = {
    '계란형': '계란형 얼굴이시군요 😊 가장 이상적인 비율이에요!\n\n추천 시술:\n1. 스킨부스터 (피부 광채·촉촉함 유지)\n2. 레이저 토닝 (피부 톤 균일화)\n3. 보톡스 예방 관리 (현재 상태 유지)\n\n💡 볼륨보다는 피부 자체 퀄리티를 높이는 시술이 가장 어울려요!',
    '둥근형': '둥근형 얼굴이시군요! 세로 비율을 강조하는 시술이 도움돼요 📐\n\n추천 시술:\n1. 턱 필러 (턱선 연장으로 세로 비율↑)\n2. 이마 필러 (이마 볼륨으로 세로감)\n3. 볼 보톡스 (가로 폭 축소)\n\n💡 광대 쪽 HIFU 리프팅으로 슬림한 윤곽도 가능해요!',
    '사각형': '사각형 얼굴이시군요! 부드럽고 갸름하게 만드는 시술이 잘 어울려요 ✨\n\n추천 시술:\n1. 사각턱 보톡스 (가장 효과적! 3~4개월 유지)\n2. HIFU 리프팅 (하관 슬림)\n3. 턱선 필러 (부드러운 라인)\n\n💡 사각턱 보톡스는 2~3회 맞으면 근육이 줄어 효과가 오래 지속돼요!',
    '하트형': '하트형 얼굴이시군요! 하관 볼륨을 균형 있게 보완하는 시술이 어울려요 💕\n\n추천 시술:\n1. 턱 필러 (턱선 볼륨 보완)\n2. 볼 중간 필러 (볼 볼륨 균형)\n3. 이마 보톡스 (상하 균형 조절)\n\n💡 뾰족한 턱이 더 강조되지 않도록 볼 중간에 살짝 볼륨감을 주면 좋아요!',
    '긴형': '긴형 얼굴이시군요! 가로 너비를 채우는 시술이 균형을 맞춰줘요 ↔️\n\n추천 시술:\n1. 볼 필러 (중안부 볼륨으로 가로감)\n2. 이마 보톡스 (이마 길이 최소화)\n3. 스킨부스터 (전체 볼륨감)\n\n💡 이마를 낮추거나 볼에 볼륨감을 주면 황금 비율에 가까워져요!',
    '다이아몬드형': '다이아몬드형 얼굴이시군요! 광대를 자연스럽게 줄이고 균형을 맞추면 더 예뻐요 💎\n\n추천 시술:\n1. 광대 보톡스 (광대 근육 축소)\n2. 턱 필러 (하관 볼륨으로 균형)\n3. 이마 필러 (상관 비율 보완)\n\n💡 광대 보톡스 + 턱 필러 조합이 황금 비율 완성에 가장 효과적이에요!',
  };
  return map[shape] ?? `${shape} 얼굴형 기반 맞춤 시술을 추천드릴게요! 구체적인 고민(광대, 턱선, 볼 등)을 말씀해주시면 더 상세히 안내드릴게요 😊`;
}

function getBaumannRecommendation(code: string, skinType: string, concerns: string[]): string {
  const b = code.toUpperCase();
  const parts: string[] = [];
  const tips: string[] = [];

  if (b.includes('D')) { parts.push('스킨부스터 (수분·볼륨 충전)'); tips.push('건성 피부는 시술 후 집중 보습이 중요해요'); }
  if (b.includes('O')) { parts.push('레이저 토닝 (피지 조절·모공 축소)'); tips.push('지성 피부는 BHA 스킨케어와 병행하면 효과가 좋아요'); }
  if (b.includes('S')) { parts.push('LED 마스크 (진정·장벽 강화)'); tips.push('민감성 피부는 저자극 시술부터 시작해 반응을 확인하세요'); }
  if (b.includes('R') && parts.length < 2) { parts.push('고주파 RF 또는 IPL (다양한 시술 가능)'); }
  if (b.includes('P')) { parts.push('피코레이저 또는 레이저 토닝 (색소·기미)'); tips.push('SPF50+ 자외선차단제 매일 사용이 필수예요'); }
  if (b.includes('W')) { parts.push('보톡스 + HIFU 리프팅 (주름·처짐 예방)'); tips.push('리프팅 시술은 30대부터 예방적으로 받으면 효과가 커요'); }
  if (parts.length === 0) { parts.push('스킨케어 집중으로 현재 상태 유지'); }

  const concernNote = concerns.length > 0
    ? `\n\n주요 고민 (${concerns.slice(0, 2).join(', ')}) 추가 추천:\n• ${getConcernTip(concerns[0])}`
    : '';
  const tipText = tips.length > 0 ? `\n\n💡 ${tips[0]}` : '';
  const label = skinType || code;
  const recList = parts.slice(0, 3).map((p, i) => `${i + 1}. ${p}`).join('\n');

  return `${label} 피부 맞춤 추천이에요 ✨\n\n추천 시술:\n${recList}${concernNote}${tipText}\n\n더 구체적인 시술(보톡스, 레이저, 리프팅 등)이 궁금하면 물어보세요 😊`;
}

function getRuleBasedResponse(
  messages: { role: string; content: string }[],
  profile?: Profile,
  compareItems?: { name: string; type: string }[],
): string {
  const msg = [...messages].reverse().find(m => m.role === 'user')?.content ?? '';

  const b = (profile?.baumann_code ?? '').toUpperCase();
  const isDry = b.includes('D');
  const isOily = b.includes('O');
  const isSensitive = b.includes('S');
  const isPigmented = b.includes('P');
  const isWrinkled = b.includes('W');
  const faceShape = profile?.face_shape ?? '';
  const skinType = profile?.skin_type ?? '';
  const concerns = profile?.concerns ?? [];

  // 비교 아이템
  if (compareItems && compareItems.length >= 2) {
    const names = compareItems.map(i => i.name).join(' vs ');
    return `${names} 비교 상담이시군요! ⚡\n\n두 시술의 주요 차이를 정리해드릴게요:\n\n• 효과: 각 시술은 적용 부위와 기전이 달라요\n• 비용: 개원가마다 다르지만 30~200만원대\n• 통증: 대부분 마취크림으로 완화 가능\n• 다운타임: 0~7일 (시술별 상이)\n\n어떤 부분(효과, 통증, 가격, 회복기간)이 가장 궁금하신가요? 😊`;
  }

  // 1. 통증
  if (has(msg, ['통증', '아프', '아파', '아픈', '따가', '따끔', '얼마나 아프', '많이 아프', '통증이 어느'])) {
    return `시술별 통증 가이드예요 💉\n\n• 보톡스: ★☆☆☆☆ 거의 무통 (모기 물린 느낌)\n• 필러: ★★☆☆☆ 약간 따끔 (마취크림 사용)\n• 레이저 토닝: ★★☆☆☆ 약한 따끔임\n• 피코레이저: ★★★☆☆ 고무줄 튕기는 느낌\n• 고주파 RF: ★★★★☆ 강한 열감\n• 울쎄라·HIFU: ★★★★☆ 찌릿한 통증 (마취 권장)\n\n😊 민감하신 분은 시술 30분 전 마취크림 요청하면 훨씬 편해요!`;
  }

  // 2. 부작용
  if (has(msg, ['부작용', '위험', '걱정', '안전한가', '무서', '안전해'])) {
    const note = isSensitive ? '\n\n⚠️ 민감성 피부이시니 시술 후 진정 케어와 자외선 차단이 특히 중요해요!' : '';
    return `주요 시술 부작용 정리해드릴게요 ⚠️\n\n• 보톡스: 멍·붓기 1~3일, 두통(드물게)\n• 필러: 붓기·멍 3~7일, 혈관 주의\n• 레이저: 일시적 색소침착 (SPF 차단제 필수!)\n• HIFU 리프팅: 붓기·열감 1~3일\n• 써마지: 화상 주의 (숙련 의사 선택 중요)${note}\n\n🏥 정식 의원에서 사전 상담 후 진행하시면 위험을 크게 줄일 수 있어요!`;
  }

  // 3. 회복기간
  if (has(msg, ['회복', '다운타임', '붓기', '붓는', '멍', '일상복귀', '며칠', '언제부터 화장'])) {
    return `시술별 회복기간(다운타임) 정리해드릴게요 📅\n\n• 보톡스: 0~1일 (당일 세안·화장 가능)\n• 필러: 1~3일 (멍·붓기)\n• 레이저 토닝: 0~1일 (약한 홍조)\n• 피코레이저: 3~5일 (딱지 주의)\n• 울쎄라·HIFU: 1~3일 (붓기·열감)\n• 써마지: 1~7일 (개인차 큼)\n• 프락셀: 5~7일 (홍조·각질 탈락)\n\n💡 중요한 약속이 있다면 최소 1~2주 여유를 두고 시술받으세요!`;
  }

  // 4. 가격
  if (has(msg, ['가격', '비용', '얼마', '금액', '가성비', '싼', '비싼', '요금'])) {
    return `시술 평균 가격대 안내해드릴게요 💰\n\n• 보톡스 (이마): 5~15만원\n• 필러 (1cc): 20~50만원\n• 레이저 토닝 (전체): 5~20만원\n• 피코레이저: 15~40만원\n• 스킨부스터: 15~30만원\n• HIFU 리프팅: 20~60만원\n• 울쎄라 (얼굴전체): 60~150만원\n• 써마지 (얼굴): 80~200만원\n\n⚠️ 병원·지역·시술 범위에 따라 크게 달라요. 여러 곳 상담 비교를 추천드려요 🏥`;
  }

  // 5. 보톡스
  if (has(msg, ['보톡스', '보툴리눔', '사각턱 보톡스', '승모근 보톡스', '이마 주름'])) {
    const note = isWrinkled ? '\n\n✨ 주름성 피부이시니 보톡스 예방 관리가 특히 효과적이에요!' : '';
    return `보톡스 상담이시군요! 💉\n\n보톡스는 근육 이완으로 주름 예방·개선에 효과적이에요.\n\n주요 부위:\n• 이마·미간 주름 (가장 대중적)\n• 눈가 주름 (까마귀발)\n• 사각턱 (V라인 효과)\n• 승모근 (어깨 라인)\n\n지속기간: 4~6개월\n통증: 거의 없음 ★☆☆☆☆\n회복: 당일 일상 복귀 가능${note}\n\n⚠️ 임산부·수유 중에는 시술 불가해요.`;
  }

  // 6. 필러
  if (has(msg, ['필러', '애교살', '팔자', '코 필러', '입술 필러', '볼 필러', '턱 필러', '볼륨 주사'])) {
    return `필러 상담이시군요! ✨\n\n필러는 볼륨 보충·윤곽 교정에 효과적이에요.\n\n주요 부위:\n• 볼·팔자 주름·입술\n• 코 (코필러)\n• 눈 밑 애교살\n• 턱·턱선 (V라인)\n\n필러 종류:\n• HA 필러: 가장 대중적, 용해 가능, 6개월~1.5년\n• PCL 필러: 긴 지속력 (2년+), 콜라겐 자극\n• 리쥬란: 피부 재생·탄력 개선\n\n💡 처음이시면 소량으로 시작해 반응 보는 걸 추천해요!`;
  }

  // 7. 레이저
  if (has(msg, ['레이저', '피코', '프락셀', '토닝', '제네시스', 'IPL', '아이피엘'])) {
    const pigNote = isPigmented ? '\n\n✨ 색소성 피부이시니 피코레이저나 레이저 토닝이 특히 효과적일 수 있어요!' : '';
    const senNote = isSensitive ? '\n\n⚠️ 민감성 피부이시니 낮은 에너지로 시작하는 게 안전해요.' : '';
    return `레이저 시술 안내해드릴게요 ⚡\n\n• 레이저 토닝: 기미·잡티·피부 톤 개선 (다운타임 거의 없음)\n• 피코레이저: 강한 색소 집중 제거, 모공·흉터\n• 프락셀: 모공·흉터·잔주름 리모델링 (다운타임 5~7일)\n• IPL: 홍조·혈관·색소 복합 케어\n• 제네시스: 홍조·모공·피부결 개선 (저자극)${pigNote}${senNote}\n\n☀️ 모든 레이저 시술 후 SPF50+ 자외선차단제는 필수예요!`;
  }

  // 8. 리프팅
  if (has(msg, ['리프팅', '울쎄라', '써마지', '하이푸', 'HIFU', '슈링크', '인모드'])) {
    const note = isWrinkled ? '\n\n💡 주름성 피부이시니 울쎄라 or HIFU가 가장 효과적일 수 있어요!' : '';
    return `리프팅 시술 비교해드릴게요 🔥\n\n• 울쎄라 (HIFU): 초음파 에너지 → 근막층 자극. 효과 강함, 통증 있음\n• 써마지 (RF): 고주파 → 피부 조직 가열. 넓은 범위, 1회 효과\n• 슈링크·리니어지: HIFU 계열, 써마지보다 저렴, 국내 기기\n• 인모드 (RF): 피부 내외부 동시 케어\n\n효과: 울쎄라 ≥ 써마지 > 슈링크 (개인차 있음)\n비용: 써마지 > 울쎄라 > 슈링크${note}\n\n어느 부위 리프팅이 목적이신가요? 더 상세히 알려드릴게요 😊`;
  }

  // 9. 홈케어 기기
  if (has(msg, ['기기', '홈케어', '가정용', '집에서', '디바이스', '기기 추천'])) {
    const notes: string[] = [];
    if (isDry) notes.push('건성 피부는 EMS·LED 위주, RF는 주 1회 이하가 좋아요');
    if (isOily) notes.push('지성 피부는 초음파 스크러버나 LED 블루광 기기도 추천해요');
    if (isSensitive) notes.push('민감성 피부는 LED 마스크부터 시작하세요');
    const extra = notes.length > 0 ? `\n\n💡 ${notes[0]}` : '';
    return `홈케어 기기 추천드릴게요 🏠\n\n• LED 마스크: 피부 재생·진정·항균 (매일 가능, 가성비 최고)\n• EMS 미세전류: 리프팅·탄력 (매일 5~10분)\n• 초음파 스크러버: 각질·흡수력 향상\n• 가정용 RF: 모공·리프팅 (주 2~3회)\n• 스팀기: 각질 연화·흡수력 향상${extra}\n\n💡 가정용 기기 효과는 클리닉의 30~50% 수준이에요. 꾸준함이 핵심!`;
  }

  // 10. 스킨부스터
  if (has(msg, ['스킨부스터', '쥬베룩', '리쥬란', '수분 주사', '물광주사', '물광', '엑소좀'])) {
    return `스킨부스터 상담이시군요! 💧\n\n스킨부스터는 피부 속 직접 수분·성분을 공급해요.\n\n주요 종류:\n• 리쥬란: 연어 DNA → 피부 재생·탄력 (6개월 이상)\n• 쥬베룩: PLLA → 콜라겐 생성 자극 (2년+)\n• 보톡스 물광: 보툴리눔+HA → 모공·수분 동시\n• 엑소좀: 피부 재생·줄기세포 인자\n\n효과: 피부 톤·수분·탄력·광채 개선\n주기: 3~4회 초기 집중 → 3~6개월 유지\n\n💡 피부 기본기를 올리는 데 가장 좋은 시술이에요!`;
  }

  // 11. 얼굴형
  if (has(msg, ['얼굴형', '얼굴 모양', '내 얼굴형', '얼굴형에 맞는'])) {
    if (faceShape) return getFaceShapeResponse(faceShape);
    return `얼굴형 분석을 먼저 해주세요 💎\n\n마이페이지 → AI 피부 분석 → 얼굴형 분석\n\n5가지 질문으로 내 얼굴형(계란형·둥근형·사각형·하트형·긴형·다이아몬드형)을 진단해드려요!\n분석 완료 후 오시면 얼굴형에 딱 맞는 시술을 추천해드릴게요 ✨`;
  }

  // 12. 여드름·모공
  if (has(msg, ['여드름', '트러블', '뾰루지', '피지', '모공', '블랙헤드'])) {
    const note = isSensitive ? '\n\n⚠️ 민감성 피부이시니 저자극 LED 블루광이나 IPL부터 시도해보세요!' : '';
    const note2 = isOily ? '\n\n💡 지성 피부이시니 BHA(살리실산) 스킨케어와 병행하면 효과 UP!' : '';
    return `여드름·모공 고민 해결 방법이에요 🌿\n\n클리닉 시술:\n• 아그네스 RF: 피지선 파괴 → 근본 치료 (최고 효과)\n• 레이저 토닝: 피지 조절·피부 톤 개선\n• 프락셀: 모공·흉터 개선\n\n홈케어:\n• BHA(살리실산) 세럼·토너\n• LED 블루광 기기로 살균\n• 나이아신아마이드로 모공 관리${note}${note2}\n\n😊 식단·수면·스트레스 관리도 여드름에 큰 영향을 줘요!`;
  }

  // 13. 색소·미백
  if (has(msg, ['색소', '미백', '기미', '잡티', '칙칙', '어두운', '피부 톤', '얼룩', '멜라닌'])) {
    const note = isPigmented ? '\n\n✨ 색소성 피부이시니 레이저 토닝이나 피코레이저가 특히 도움될 거예요!' : '';
    return `색소·미백 고민이시군요! ✨\n\n효과적인 시술:\n• 레이저 토닝: 기미·잡티 전반적 개선 (다운타임 거의 없음)\n• 피코레이저: 강한 색소 집중 제거\n• IPL: 홍조+색소 복합 케어\n• 스킨부스터: 광채·투명도 향상${note}\n\n홈케어:\n• 비타민C 세럼 (아침)\n• 나이아신아마이드 (미백+모공)\n• SPF50+ 자외선차단제 (가장 중요!)\n\n☀️ 자외선 차단 없으면 색소는 재발해요. 차단제가 핵심!`;
  }

  // 14. 주름·탄력·처짐
  if (has(msg, ['주름', '노화', '처짐', '탄력', '팔자주름', '눈가주름', '이마주름', '나이 들어'])) {
    const note = isWrinkled ? '\n\n💡 주름성 피부이시니 보톡스 예방 관리를 지금 시작하는 게 가성비 최고예요!' : '';
    return `주름·탄력 고민이시군요! 💪\n\n효과 순서:\n1. 보톡스: 주름 예방·완화 (즉각 효과, 4~6개월 지속)\n2. 리프팅 시술: 처짐·탄력 개선 (울쎄라·HIFU·써마지)\n3. 스킨부스터: 볼륨·탄력 동시 개선 (쥬베룩·리쥬란)\n4. 필러: 깊은 주름 볼륨 채움${note}\n\n홈케어:\n• 레티놀·레티날 (항노화 핵심)\n• EMS 미세전류 기기\n• 펩타이드 크림\n\n💡 30대부터 보톡스 예방 관리가 가성비 최고예요!`;
  }

  // 15. 피부타입·맞춤 추천
  if (has(msg, ['추천', '맞는', '좋은 시술', '어떤 시술', '뭐가 좋', '맞춤', '피부에 맞', '내 피부', '피부타입', '피부 타입'])) {
    if (b) return getBaumannRecommendation(b, skinType, concerns);
    if (skinType) return getBaumannRecommendation('', skinType, concerns);
    return `맞춤 추천을 위해 피부타입 분석을 먼저 해주세요 🧬\n\n마이페이지 → AI 피부 분석 → 피부타입 분석\n\n8가지 질문으로 바우만 피부타입을 진단해드려요!\n진단 완료 후 오시면 훨씬 정확한 맞춤 시술을 추천해드릴게요 ✨`;
  }

  // 16. 비교
  if (has(msg, ['비교', '차이', '어떻게 다르', '뭐가 나아', '어떤 게 좋아', '어느 게 좋아'])) {
    return `시술 비교 상담이시군요! ⚖️\n\n자주 비교되는 조합:\n• 울쎄라 vs 써마지 (리프팅)\n• 보톡스 vs 필러 (볼륨·주름)\n• 피코레이저 vs 레이저 토닝 (색소)\n• 프락셀 vs 아그네스RF (모공·흉터)\n• HIFU vs 슈링크 (가성비 리프팅)\n\n비교하고 싶은 시술을 구체적으로 말씀해주시면 상세히 비교해드릴게요 😊`;
  }

  // 17. 건성 피부 특화
  if (has(msg, ['건성', '피부 건조', '건조한 피부', '수분 부족', '당기는'])) {
    return `건성 피부 관리 방법이에요 💧\n\n추천 시술:\n1. 스킨부스터 (리쥬란·쥬베룩·물광): 피부 속 수분 직접 공급\n2. 수분 보톡스 (물광보톡스): 모공 수축 + 수분 동시\n3. LED 마스크: 장벽 강화·진정\n\n홈케어:\n• 세라마이드·히알루론산 보습제\n• 오일 클렌징 (계면활성제 최소화)\n• 수분 미스트 상시 사용\n\n💡 건성 피부는 세정 후 3분 내 보습이 핵심이에요!`;
  }

  // 18. 지성 피부 특화
  if (has(msg, ['지성', '기름진', '피지 많은', '번들거리는', '피지 과다'])) {
    return `지성 피부 관리 방법이에요 🌿\n\n추천 시술:\n1. 레이저 토닝: 피지선 크기 축소·모공 관리\n2. 아그네스 RF: 피지선 직접 파괴\n3. 고주파 RF: 피지 조절\n\n홈케어:\n• BHA(살리실산) 함유 토너·세럼\n• 나이아신아마이드 (모공+피지)\n• 가벼운 젤 타입 보습제\n• 과도한 세안 금지 (오히려 피지 ↑)\n\n💡 지성이라도 보습은 필수예요! 수분이 부족하면 피지 분비가 더 많아져요.`;
  }

  // 19. 민감성 피부 특화
  if (has(msg, ['민감성', '민감한 피부', '예민한', '자극에 민감', '피부가 예민'])) {
    return `민감성 피부 관리 방법이에요 🌸\n\n추천 시술:\n1. LED 마스크: 진정·장벽 강화 (가장 저자극)\n2. 저출력 레이저 토닝: 에너지 낮게 시작\n3. 리쥬란 스킨부스터: 피부 장벽 재생\n\n피해야 할 것:\n• 강한 레이저 (프락셀 등) 처음부터 X\n• 고에너지 HIFU 주의\n• 스크럽·필링 과도한 사용\n\n홈케어:\n• 무향·무알코올 제품 선택\n• 세라마이드·판테놀 장벽 강화\n\n💡 민감성 피부는 시술 전 패치 테스트를 꼭 요청하세요!`;
  }

  // Default
  const personalized = skinType || faceShape
    ? `\n\n${skinType ? `${skinType} 피부` : ''}${skinType && faceShape ? ' · ' : ''}${faceShape ? `${faceShape} 얼굴형` : ''} 기반 맞춤 상담 가능해요!`
    : '';

  return `안녕하세요! 픽디 AI 상담사예요 ✨${personalized}\n\n아래 내용을 물어보세요:\n\n• 내 피부타입에 맞는 시술 추천\n• 리프팅 시술 비교 (울쎄라 vs 써마지)\n• 홈케어 기기 추천\n• 시술 통증·비용·회복기간\n• 보톡스 / 필러 / 레이저 정보\n• 얼굴형별 시술 추천\n• 피부 고민(여드름·색소·주름) 해결법\n\n궁금한 점을 편하게 물어보세요 😊`;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: '인증이 필요합니다' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: '인증 실패' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { messages, profile, compareItems } = await req.json() as {
      messages: { role: 'user' | 'assistant'; content: string }[];
      profile?: Profile;
      compareItems?: { name: string; type: string }[];
    };

    if (!messages || messages.length === 0) {
      return new Response(JSON.stringify({ error: '메시지가 없습니다' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const reply = getRuleBasedResponse(messages, profile, compareItems);

    return new Response(JSON.stringify({ reply }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('ai-chat error:', e);
    return new Response(JSON.stringify({ error: '서버 오류가 발생했어요' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
