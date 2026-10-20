// 채점 로직 — 규칙 기반이라 LLM 판정 비용이 0 이고, 같은 답이면 항상 같은 점수가 나온다.
// 한계: 의미는 맞는데 표기가 다르면(예: "일주일 정도" vs "3~7일") 오답 처리된다.
// 그래서 grade.mjs 리포트에 오답 문항의 실제 답변을 같이 찍는다 — 금기형·추천형은 눈으로 한 번 볼 것.

// ── 정규화 ──────────────────────────────────────────────────────────────
export function norm(s) {
  return String(s ?? '')
    .normalize('NFKC')
    .replace(/[〜∼～–—-]/g, '~')       // 물결표·대시 표기 통일
    .replace(/\s*~\s*/g, '~')
    .replace(/\s+/g, ' ')
    .toLowerCase();
}
const squash = s => norm(s).replace(/\s+/g, '');

// ── 금액 추출: "50만원", "50만 원", "500,000원", "1,200,000원", "5~15만원", "120만~200만원" ──
export function extractAmounts(text) {
  let t = norm(text).replace(/(\d),(?=\d{3})/g, '$1');
  const out = [];
  const take = (re, f) => {
    t = t.replace(re, (...m) => { out.push(...f(m)); return ' '; });
  };
  const N = s => Number(s);
  // "64만 9천원" → 649000
  take(/(\d+(?:\.\d+)?)\s*만\s*(\d)\s*천\s*원?/g, m => [Math.round(N(m[1]) * 10000 + N(m[2]) * 1000)]);
  // 범위 "5~15만원" — 앞 숫자에도 만 단위를 붙인다
  take(/(\d+(?:\.\d+)?)~(\d+(?:\.\d+)?)\s*만(?:\s*원)?/g, m => [Math.round(N(m[1]) * 10000), Math.round(N(m[2]) * 10000)]);
  // "50만원", "50만 원", "50만~" (뒤에 한글이 바로 붙는 "만족" 같은 경우는 제외)
  take(/(\d+(?:\.\d+)?)\s*만(?:\s*원|(?![가-힣]))/g, m => [Math.round(N(m[1]) * 10000)]);
  // "500000원"
  take(/(\d{4,})\s*원/g, m => [N(m[1])]);
  return [...new Set(out)];
}

// ── 거절(모른다) 감지 ───────────────────────────────────────────────────
const ABSTAIN_RE = /(확인이\s*어렵|확인하기\s*어렵|확인되지\s*않|정보가\s*없|정보는\s*없|등록되어\s*있지\s*않|등록된\s*정보로는|등록되지\s*않|나와\s*있지\s*않|포함되어\s*있지\s*않|알\s*수\s*없|알기\s*어렵|안내해\s*드리기\s*어렵|안내가\s*어렵|답변드리기\s*어렵|제공하지\s*않|모르겠|파악하기\s*어렵)/;
export function isAbstention(text) {
  return ABSTAIN_RE.test(norm(text));
}

// ── 한 문항 채점 ────────────────────────────────────────────────────────
// result: { reply, sources: [{id}] }   (reply 는 "근거:" 줄을 뗀 사용자용 답변)
export function gradeItem(item, result, allPrices) {
  const reply = result?.reply ?? '';
  const n = squash(reply);
  const abstained = isAbstention(reply);
  const amounts = extractAmounts(reply);
  const checks = [];

  if (item.check.abstain) {
    checks.push({ name: 'abstain', pass: abstained });
  } else {
    checks.push({ name: 'no_false_refusal', pass: !abstained || item.type === 'contra' });
  }
  if (item.check.amounts) {
    const missing = item.check.amounts.filter(a => !amounts.includes(a));
    checks.push({ name: 'amounts', pass: missing.length === 0, detail: missing.length ? `빠짐: ${missing.join(', ')}` : '' });
  }
  for (const [gi, group] of (item.check.groups ?? []).entries()) {
    const hit = group.find(g => n.includes(squash(g)));
    checks.push({ name: `group${gi + 1}`, pass: !!hit, detail: hit ? '' : `없음: ${group.slice(0, 4).join(' | ')}${group.length > 4 ? ' …' : ''}` });
  }

  // 환각: DB 어디에도 없는 금액을 말했는가 (함정형에서 특히 중요)
  const invented = amounts.filter(a => !allPrices.has(a));
  // 인용: 기대 아이템 중 하나라도 근거로 댔는가 / 존재하지 않는 코드를 댔는가
  const cited = new Set((result?.sources ?? []).map(s => s.id));
  const citationHit = item.items.length === 0 ? null : item.items.some(id => cited.has(id));

  const correct = checks.every(c => c.pass);
  return {
    id: item.id,
    type: item.type,
    correct,
    abstained,
    hallucinated: invented.length > 0,
    invented_amounts: invented,
    citation_hit: citationHit,
    unknown_refs: result?.unknownRefs ?? [],
    checks,
  };
}

export function allCatalogPrices(snap) {
  const s = new Set();
  for (const t of snap.treatments) { if (t.price_min != null) s.add(t.price_min); if (t.price_max != null) s.add(t.price_max); }
  for (const d of snap.devices) if (d.price != null) s.add(d.price);
  return s;
}

// ── 집계 ────────────────────────────────────────────────────────────────
const pct = (a, b) => (b === 0 ? '-' : `${((a / b) * 100).toFixed(1)}%`);

export function summarize(graded) {
  const by = type => graded.filter(g => g.type === type);
  const traps = by('trap');
  const nonTraps = graded.filter(g => g.type !== 'trap');
  const withCite = graded.filter(g => g.citation_hit !== null);
  const types = ['fact', 'contra', 'recommend', 'compare', 'trap'];
  return {
    total: graded.length,
    accuracy: pct(graded.filter(g => g.correct).length, graded.length),
    by_type: Object.fromEntries(types.map(t => [t, `${by(t).filter(g => g.correct).length}/${by(t).length}`])),
    // RAG_PLAN 지표
    groundedness: pct(nonTraps.filter(g => !g.hallucinated).length, nonTraps.length), // 지어낸 금액 없이 답한 비율
    abstention: pct(traps.filter(g => g.abstained).length, traps.length),              // 함정에서 모른다고 한 비율
    false_refusal: pct(nonTraps.filter(g => g.abstained && g.type !== 'contra').length, nonTraps.filter(g => g.type !== 'contra').length),
    hallucination_any: pct(graded.filter(g => g.hallucinated).length, graded.length),
    citation_recall: pct(withCite.filter(g => g.citation_hit).length, withCite.length),
    invalid_citations: graded.reduce((s, g) => s + g.unknown_refs.length, 0),
  };
}
