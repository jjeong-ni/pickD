// 채점 + 리포트.
//
//   node eval/grade.mjs eval/results/<파일>.json           # 한 번의 실행 채점 → 같은 이름의 .md 리포트
//   node eval/grade.mjs a.json b.json                       # 여러 실행을 나란히 비교 (A vs B, 모델 비교)
//   node eval/grade.mjs --selftest                          # 채점기 자체 점검 (API 호출 없음)
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { allCatalogPrices, extractAmounts, gradeItem, isAbstention, summarize } from './grader.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const golden = JSON.parse(readFileSync(path.join(here, 'golden.json'), 'utf8'));
const snap = JSON.parse(readFileSync(path.join(here, 'catalog.snapshot.json'), 'utf8'));
const prices = allCatalogPrices(snap);
const byId = new Map(golden.items.map(i => [i.id, i]));

function selftest() {
  const eq = (name, got, want) => {
    const ok = JSON.stringify(got) === JSON.stringify(want);
    console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}${ok ? '' : ` → got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`}`);
    if (!ok) process.exitCode = 1;
  };
  eq('금액: 만원 범위', extractAmounts('70~200만원 정도예요').sort(), [2000000, 700000]);
  eq('금액: 원 단위', extractAmounts('700,000원 ~ 2,000,000원').sort(), [2000000, 700000]);
  eq('금액: 만 천', extractAmounts('64만 9천원이에요'), [649000]);
  eq('금액: 만족 무시', extractAmounts('만족도가 높아요 3만'), [30000]);
  eq('거절 감지', isAbstention('픽디에 등록된 정보로는 확인이 어려워요'), true);
  eq('거절 아님', isAbstention('울쎄라는 70만~200만원이에요'), false);

  const f01 = byId.get('F01');
  const good = gradeItem(f01, { reply: '울쎄라는 70만~200만 원이에요.', sources: [{ id: f01.items[0] }] }, prices);
  eq('F01 정답', [good.correct, good.hallucinated, good.citation_hit], [true, false, true]);
  const bad = gradeItem(f01, { reply: '울쎄라는 60만~150만원 정도예요.', sources: [] }, prices);
  eq('F01 환각', [bad.correct, bad.hallucinated], [false, true]);
  const x01 = byId.get('X01');
  const trapOk = gradeItem(x01, { reply: '패키지 가격은 픽디에 등록된 정보로는 확인이 어려워요. 1회 가격은 28만~40만원이에요.', sources: [] }, prices);
  eq('X01 거절+DB 금액', [trapOk.correct, trapOk.hallucinated], [true, false]);
  const trapBad = gradeItem(x01, { reply: '10회 패키지는 보통 250만원 정도예요.', sources: [] }, prices);
  eq('X01 지어냄', [trapBad.correct, trapBad.hallucinated], [false, true]);
  const c01 = byId.get('C01');
  eq('C01 경고', gradeItem(c01, { reply: '써마지 FLX는 임신 중에는 금기예요. 출산 후 전문의와 상담하세요.', sources: [] }, prices).correct, true);
  eq('C01 경고 없음', gradeItem(c01, { reply: '써마지 FLX는 통증이 중간 정도예요.', sources: [] }, prices).correct, false);
}

function gradeRun(file) {
  const run = JSON.parse(readFileSync(file, 'utf8'));
  const graded = run.results.map(r => {
    const item = byId.get(r.id);
    if (!item) throw new Error(`golden 에 없는 문항: ${r.id} — golden.json 이 바뀌었으면 다시 실행할 것`);
    if (r.error) return { id: r.id, type: item.type, correct: false, abstained: false, hallucinated: false, invented_amounts: [], citation_hit: item.items.length ? false : null, unknown_refs: [], checks: [{ name: 'error', pass: false, detail: r.error }] };
    return gradeItem(item, r, prices);
  });
  // Hit@5 — 버전 B/C 에서 run.mjs 가 retrieved(검색된 source_id 배열)를 남기면 계산된다
  const withRetrieval = run.results.filter(r => Array.isArray(r.retrieved));
  const hitAt5 = withRetrieval.length
    ? `${((withRetrieval.filter(r => byId.get(r.id).items.some(id => r.retrieved.slice(0, 5).includes(id))).length
      / withRetrieval.filter(r => byId.get(r.id).items.length).length) * 100).toFixed(1)}%`
    : '- (버전 A 는 검색 없음)';
  const lat = run.results.filter(r => r.latency_ms).map(r => r.latency_ms).sort((a, b) => a - b);
  return {
    file, run, graded,
    summary: {
      ...summarize(graded),
      hit_at_5: hitAt5,
      latency_p50_ms: lat.length ? lat[Math.floor(lat.length / 2)] : '-',
      tokens: run.usage,
    },
  };
}

function report(g) {
  const s = g.summary;
  const lines = [
    `# 평가 리포트 — 버전 ${g.run.version} · ${g.run.model} (effort ${g.run.effort})`,
    '',
    `실행: ${g.run.run_at} · 정답지: ${g.run.snapshot_source}`,
    '',
    '| 지표 | 값 | 뜻 |',
    '|---|---|---|',
    `| 정답률 | ${s.accuracy} | 전 문항 기준 |`,
    `| Groundedness | ${s.groundedness} | 함정 외 문항에서 DB 에 없는 금액을 지어내지 않은 비율 |`,
    `| Abstention | ${s.abstention} | 함정 문항에서 "확인이 어렵다"고 한 비율 |`,
    `| 오거절 | ${s.false_refusal} | 답이 DB 에 있는데 모른다고 한 비율 (낮을수록 좋음) |`,
    `| 인용 재현율 | ${s.citation_recall} | 정답 아이템을 "근거:" 에 댄 비율 |`,
    `| 잘못된 인용 | ${s.invalid_citations}건 | 존재하지 않는 참조 코드 |`,
    `| Hit@5 | ${s.hit_at_5} | 정답 아이템이 검색 top-5 에 든 비율 |`,
    `| 지연 p50 | ${s.latency_p50_ms}ms | |`,
    '',
    `유형별: ${Object.entries(s.by_type).map(([k, v]) => `${k} ${v}`).join(' · ')}`,
    '',
    `토큰: ${JSON.stringify(s.tokens)}`,
    '',
    '## 틀린 문항 (눈으로 확인할 것)',
    '',
  ];
  const results = new Map(g.run.results.map(r => [r.id, r]));
  for (const x of g.graded.filter(x => !x.correct || x.hallucinated)) {
    const item = byId.get(x.id);
    const r = results.get(x.id);
    lines.push(`### ${x.id} (${x.type}) ${item.question}`);
    lines.push(`- 실패: ${x.checks.filter(c => !c.pass).map(c => `${c.name}${c.detail ? ` (${c.detail})` : ''}`).join(', ') || '-'}`);
    if (x.hallucinated) lines.push(`- 지어낸 금액: ${x.invented_amounts.join(', ')}`);
    lines.push('', '```', (r?.reply ?? r?.error ?? '').trim(), '```', '');
  }
  return lines.join('\n');
}

const files = process.argv.slice(2).filter(a => !a.startsWith('--'));
if (process.argv.includes('--selftest')) {
  selftest();
} else if (files.length === 0) {
  console.error('사용법: node eval/grade.mjs eval/results/<파일>.json [다른 파일 ...]   |   --selftest');
  process.exit(1);
} else {
  const runs = files.map(gradeRun);
  for (const g of runs) {
    const md = g.file.replace(/\.json$/, '.md');
    writeFileSync(md, report(g) + '\n');
    console.log(`리포트 → ${md}`);
  }
  console.table(Object.fromEntries(runs.map(g => [`${g.run.version}·${g.run.model}`, (({ tokens, by_type, ...rest }) => ({ ...rest, ...by_type }))(g.summary)])));
}
