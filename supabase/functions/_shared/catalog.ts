// 픽디 카탈로그 → Claude 시스템 프롬프트 (RAG 진행안의 버전 A: 전체 stuffing + prompt caching)
//
// 이 파일은 런타임 의존이 0이다. 같은 파일을 두 곳에서 쓴다.
//   - Edge Function (Deno):  supabase/functions/ai-chat/index.ts
//   - 평가 러너 (Node 24):   eval/run.mjs  — Node 의 type stripping 으로 바로 import
// 그래서 enum·namespace·parameter property 처럼 "타입 지우기"로 안 되는 문법은 쓰지 않는다.
//
// 캐시 규칙: 캐시는 prefix 일치다. 카탈로그 텍스트가 요청마다 한 글자라도 달라지면
// 매번 캐시를 새로 쓴다(1.25배 과금). 그래서 정렬(id 순)·포맷이 결정적이어야 하고,
// 날짜·사용자 정보 같은 변하는 값은 캐시 지점 **뒤** 블록에만 넣는다.

export interface TreatmentRow {
  id: string;
  name: string;
  category: string;
  description: string | null;
  price_min: number | null;
  price_max: number | null;
  duration_min: number | null;
  duration_max: number | null;
  tags: string[] | null;
  rating: number | null;
  review_count: number | null;
  pain_level: string | null;
  downtime: string | null;
  duration: string | null;
  sessions: string | null;
  side_effects: string | null;
  contraindications: string | null;
}

export interface DeviceRow {
  id: string;
  name: string;
  brand: string;
  category: string;
  description: string | null;
  price: number | null;
  tags: string[] | null;
  rating: number | null;
  review_count: number | null;
  usage_frequency: string | null;
  results_timeline: string | null;
  side_effects: string | null;
  contraindications: string | null;
}

export interface Catalog {
  treatments: TreatmentRow[];
  devices: DeviceRow[];
}

export interface Profile {
  skin_type?: string;
  baumann_code?: string;
  face_shape?: string;
  concerns?: string[];
  age_group?: string;
}

export interface CompareItem {
  name: string;
  type: string;
}

export interface CatalogEntry {
  ref: string;          // 프롬프트·인용용 짧은 코드 (예: T-0007)
  id: string;           // DB uuid
  type: 'treatment' | 'device';
  name: string;
}

export interface SystemBlock {
  type: 'text';
  text: string;
  cache_control?: { type: 'ephemeral' };
}

// DB 에서 가져올 컬럼. Edge Function 과 스냅샷 스크립트가 같은 목록을 쓴다.
export const TREATMENT_COLUMNS =
  'id,name,category,description,price_min,price_max,duration_min,duration_max,tags,rating,review_count,pain_level,downtime,duration,sessions,side_effects,contraindications';
export const DEVICE_COLUMNS =
  'id,name,brand,category,description,price,tags,rating,review_count,usage_frequency,results_timeline,side_effects,contraindications';

const UNKNOWN = '정보 없음';

function won(n: number | null): string {
  return n == null ? UNKNOWN : `${n.toLocaleString('en-US')}원`;
}

function val(v: string | null | undefined): string {
  return v && v.trim() ? v.trim() : UNKNOWN;
}

function byId<T extends { id: string }>(rows: T[]): T[] {
  return [...rows].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
}

// uuid 를 그대로 인용시키면 작은 모델이 틀리게 베낀다. id 뒷자리로 짧은 코드를 만들되,
// 같은 타입 안에서 겹치면 겹치지 않을 때까지 늘린다. id 집합이 같으면 결과도 같다(결정적).
function shortRefs(prefix: string, ids: string[]): Map<string, string> {
  const hex = ids.map(id => id.replace(/-/g, ''));
  let len = 4;
  while (len < 32 && new Set(hex.map(h => h.slice(-len))).size !== hex.length) len++;
  return new Map(ids.map((id, i) => [id, `${prefix}-${hex[i].slice(-len)}`]));
}

export function buildCatalogIndex(catalog: Catalog): CatalogEntry[] {
  const ts = byId(catalog.treatments);
  const ds = byId(catalog.devices);
  const tRef = shortRefs('T', ts.map(t => t.id));
  const dRef = shortRefs('D', ds.map(d => d.id));
  return [
    ...ts.map(t => ({ ref: tRef.get(t.id)!, id: t.id, type: 'treatment' as const, name: t.name })),
    ...ds.map(d => ({ ref: dRef.get(d.id)!, id: d.id, type: 'device' as const, name: d.name })),
  ];
}

function formatTreatment(t: TreatmentRow, ref: string): string {
  const minutes = t.duration_min && t.duration_max ? `${t.duration_min}~${t.duration_max}분` : UNKNOWN;
  return [
    `[${ref}] ${t.name} (시술 · ${t.category})`,
    `설명: ${val(t.description)}`,
    `가격: ${t.price_min == null && t.price_max == null ? UNKNOWN : `${won(t.price_min)} ~ ${won(t.price_max)}`}`,
    `통증: ${val(t.pain_level)} / 회복기간(다운타임): ${val(t.downtime)} / 효과 지속: ${val(t.duration)} / 권장 횟수: ${val(t.sessions)} / 1회 시술 시간: ${minutes}`,
    `부작용: ${val(t.side_effects)}`,
    `금기: ${val(t.contraindications)}`,
    `태그: ${t.tags?.length ? t.tags.join(', ') : UNKNOWN}`,
    `평점: ${t.rating ?? UNKNOWN} (리뷰 ${t.review_count ?? 0}건)`,
  ].join('\n');
}

function formatDevice(d: DeviceRow, ref: string): string {
  return [
    `[${ref}] ${d.name} (홈케어 기기 · ${d.brand} · ${d.category})`,
    `설명: ${val(d.description)}`,
    `가격: ${won(d.price)}`,
    `사용 빈도: ${val(d.usage_frequency)} / 효과 체감: ${val(d.results_timeline)}`,
    `부작용: ${val(d.side_effects)}`,
    `금기: ${val(d.contraindications)}`,
    `태그: ${d.tags?.length ? d.tags.join(', ') : UNKNOWN}`,
    `평점: ${d.rating ?? UNKNOWN} (리뷰 ${d.review_count ?? 0}건)`,
  ].join('\n');
}

// 아이템 1개 = 텍스트 1덩어리. 버전 A 는 전부 이어 붙이고(formatCatalog),
// 버전 B 는 같은 텍스트를 rag_chunks.content 로 임베딩한다(_shared/retrieval.ts).
export function catalogChunks(
  catalog: Catalog,
): { source_type: 'treatment' | 'device'; source_id: string; ref: string; name: string; content: string }[] {
  const index = new Map(buildCatalogIndex(catalog).map(e => [e.id, e.ref]));
  return [
    ...byId(catalog.treatments).map(t => ({
      source_type: 'treatment' as const, source_id: t.id, ref: index.get(t.id)!, name: t.name,
      content: formatTreatment(t, index.get(t.id)!),
    })),
    ...byId(catalog.devices).map(d => ({
      source_type: 'device' as const, source_id: d.id, ref: index.get(d.id)!, name: d.name,
      content: formatDevice(d, index.get(d.id)!),
    })),
  ];
}

export function formatCatalog(catalog: Catalog): string {
  const chunks = catalogChunks(catalog);
  const ts = chunks.filter(c => c.source_type === 'treatment').map(c => c.content);
  const ds = chunks.filter(c => c.source_type === 'device').map(c => c.content);
  return [
    `[픽디 카탈로그] 시술 ${ts.length}개 · 홈케어 기기 ${ds.length}개. 가격 단위는 원(KRW).`,
    '',
    '## 시술',
    ts.join('\n\n'),
    '',
    '## 홈케어 기기',
    ds.join('\n\n'),
  ].join('\n');
}

// 고정 지시문. 바꾸면 캐시가 한 번 새로 써질 뿐 기능상 문제는 없다.
export const BASE_INSTRUCTIONS = `당신은 시술·홈케어 기기 비교 앱 "픽디"의 AI 상담사입니다.
한국어로, 친절하고 간결하게(핵심 위주, 300자 안팎) 답합니다.

[답변 규칙 — 반드시 지킨다]
1. 가격·통증·회복기간·지속기간·권장 횟수·부작용·금기 같은 구체적 정보는 아래 [픽디 카탈로그]에 적힌 값만 쓴다.
   값을 바꾸거나, 여러 값을 섞어 새 범위를 만들거나, 일반 상식으로 채우지 않는다.
   가격은 "500,000원"을 "50만원"처럼 단위만 바꿔 말해도 되지만 금액은 같아야 한다.
2. 카탈로그에 없는 시술·기기, 또는 카탈로그에 없는 항목(패키지·이벤트 가격, 특정 병원·의사, 부위별 가격,
   카탈로그에 "정보 없음"으로 적힌 값 등)은 지어내지 말고 "픽디에 등록된 정보로는 확인이 어려워요"라고 분명히 말한 뒤,
   카탈로그 안에서 도움이 될 만한 대안이 있으면 그것만 안내한다.
3. 답에 쓴 시술·기기는 이름을 그대로 적는다.
4. 임신·수유·복용 약·질환처럼 금기에 걸릴 수 있는 질문이면, 해당 아이템의 "금기" 값을 근거로 먼저 경고한다.
5. 의료 자문이 아니므로, 시술 여부 판단은 전문의 상담을 권한다. 효과를 과장하지 않는다.
6. 답변 맨 마지막 줄에 근거로 쓴 아이템의 참조 코드를 "근거: T-0007, D-0031" 형식으로 적는다.
   카탈로그 아이템을 쓰지 않았으면 "근거: 없음". 이 줄은 앱이 지우므로 사용자에게 보이지 않는다.`;

export function buildDynamicContext(profile?: Profile, compareItems?: CompareItem[]): string {
  const profileNote = [
    profile?.skin_type ? `피부타입: ${profile.skin_type}` : '',
    profile?.baumann_code ? `바우만코드: ${profile.baumann_code}` : '',
    profile?.face_shape ? `얼굴형: ${profile.face_shape}` : '',
    profile?.concerns?.length ? `고민: ${profile.concerns.join(', ')}` : '',
    profile?.age_group ? `연령대: ${profile.age_group}` : '',
  ].filter(Boolean).join(' | ');
  const compareNote = compareItems?.length
    ? compareItems.map(i => `${i.name}(${i.type === 'device' ? '기기' : '시술'})`).join(', ')
    : '';
  return [
    profileNote ? `[사용자 프로필] ${profileNote}` : '',
    compareNote ? `[사용자 비교함] ${compareNote} — 비교 질문이면 이 아이템들을 카탈로그 값으로 비교한다.` : '',
  ].filter(Boolean).join('\n');
}

// 시스템 블록 순서 = 캐시 prefix 순서. [지시문][카탈로그 ← 캐시 지점][사용자별 컨텍스트]
export function buildSystemBlocks(
  catalogText: string,
  profile?: Profile,
  compareItems?: CompareItem[],
): SystemBlock[] {
  const blocks: SystemBlock[] = [
    { type: 'text', text: BASE_INSTRUCTIONS },
    { type: 'text', text: catalogText, cache_control: { type: 'ephemeral' } },
  ];
  const dynamic = buildDynamicContext(profile, compareItems);
  if (dynamic) blocks.push({ type: 'text', text: dynamic });
  return blocks;
}

// 답변 끝의 "근거: ..." 줄을 떼어내 출처 목록으로 바꾼다.
// 모델이 줄을 빠뜨리거나 없는 코드를 적어도 답변은 그대로 살린다(출처만 비어 있음).
export function extractCitations(
  text: string,
  index: CatalogEntry[],
): { reply: string; sources: CatalogEntry[]; unknownRefs: string[] } {
  const lines = text.trimEnd().split('\n');
  let cut = -1;
  for (let i = lines.length - 1; i >= Math.max(0, lines.length - 3); i--) {
    if (/^\s*\**\s*근거\s*[:：]/.test(lines[i])) { cut = i; break; }
  }
  if (cut < 0) return { reply: text.trim(), sources: [], unknownRefs: [] };
  const refs = lines[cut].match(/[TD]-[0-9a-fA-F]{4,32}/g) ?? [];
  const byRef = new Map(index.map(e => [e.ref.toLowerCase(), e]));
  const sources: CatalogEntry[] = [];
  const unknownRefs: string[] = [];
  for (const r of refs) {
    const hit = byRef.get(r.toLowerCase());
    if (hit && !sources.includes(hit)) sources.push(hit);
    else if (!hit) unknownRefs.push(r);
  }
  return { reply: lines.slice(0, cut).join('\n').trim(), sources, unknownRefs };
}
