// 평가 러너 — golden.json 의 질문을 버전별 파이프라인에 넣고 답을 저장한다.
//
//   $env:ANTHROPIC_API_KEY="sk-ant-..."            (PowerShell, 세션에만. 파일에 쓰지 말 것)
//   node eval/run.mjs                               # 버전 A, 전 문항
//   node eval/run.mjs --version A --limit 5         # 앞 5문항만 (연결 확인용)
//   node eval/run.mjs --dry                         # API 호출 없이 프롬프트 크기·문항 수만 확인
//   node eval/run.mjs --model claude-haiku-4-5      # 모델 비교 (모델별 결과 파일이 따로 생긴다)
//
// 결과: eval/results/<시각>-<버전>-<모델>.json  → node eval/grade.mjs <그 파일>
//
// Edge Function 을 거치지 않고 Anthropic API 를 직접 부른다. 대신 프롬프트 조립은
// Edge Function 과 **같은 모듈**(supabase/functions/_shared/catalog.ts)을 import 해서
// 평가한 것과 배포되는 것이 어긋나지 않게 했다. 요청 파라미터(model·effort·max_tokens)도 맞춰 둘 것.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import {
  buildCatalogIndex,
  buildSystemBlocks,
  extractCitations,
  formatCatalog,
} from '../supabase/functions/_shared/catalog.ts';

const here = path.dirname(fileURLToPath(import.meta.url));

const args = Object.fromEntries(
  process.argv.slice(2).reduce((acc, a, i, all) => {
    if (a.startsWith('--')) acc.push([a.slice(2), all[i + 1] && !all[i + 1].startsWith('--') ? all[i + 1] : true]);
    return acc;
  }, []),
);
const VERSION = String(args.version ?? 'A').toUpperCase();
const MODEL = String(args.model ?? 'claude-haiku-5-5');   // ai-chat/index.ts 기본값과 같게
const EFFORT = String(args.effort ?? 'low');
const LIMIT = args.limit ? Number(args.limit) : Infinity;
const CONCURRENCY = args.concurrency ? Number(args.concurrency) : 4;

const golden = JSON.parse(readFileSync(path.join(here, 'golden.json'), 'utf8'));
const snap = JSON.parse(readFileSync(path.join(here, 'catalog.snapshot.json'), 'utf8'));
const questions = golden.items.slice(0, LIMIT);

// ── 버전별 파이프라인: 질문 → { system, retrieved } ─────────────────────
const pipelines = {
  A: () => {
    const text = formatCatalog(snap);
    const index = buildCatalogIndex(snap);
    return {
      index,
      catalogChars: text.length,
      prepare: q => ({ system: buildSystemBlocks(text, undefined, q.compareItems), retrieved: null }),
    };
  },
  // TODO(B): supabase/functions/_shared/retrieval.ts 의 createPgvectorRetriever 로 top-k 검색 →
  //   formatRetrieved(chunks) 를 카탈로그 자리에 넣는다(캐시 지점은 지시문 뒤로).
  //   retrieved 에 검색된 source_id 목록을 담으면 grade.mjs 가 Hit@5 를 계산한다.
  B: () => { throw new Error('버전 B 는 아직 없음 — 임베딩 키 필요. RAG_PLAN.md "버전 B·C 이어가기" 참고'); },
  // TODO(C): B + isExperienceQuestion(q) 일 때 리뷰 top-3 추가.
  C: () => { throw new Error('버전 C 는 아직 없음 — 버전 B 이후. RAG_PLAN.md "버전 B·C 이어가기" 참고'); },
};
if (!pipelines[VERSION]) throw new Error(`알 수 없는 버전: ${VERSION} (A|B|C)`);
const pipe = pipelines[VERSION]();

if (args.dry) {
  console.log(`버전 ${VERSION} · 모델 ${MODEL} · ${questions.length}문항`);
  console.log(`카탈로그 ${pipe.catalogChars.toLocaleString()}자 (한국어 기준 대략 ${Math.round(pipe.catalogChars / 1.6).toLocaleString()} 토큰 추정)`);
  console.log('첫 문항 system 블록:', pipe.prepare(questions[0]).system.map(b => ({ chars: b.text.length, cache: !!b.cache_control })));
  process.exit(0);
}

const KEY = process.env.ANTHROPIC_API_KEY;
if (!KEY) {
  console.error('ANTHROPIC_API_KEY 가 없습니다. PowerShell: $env:ANTHROPIC_API_KEY="sk-ant-..." 후 다시 실행');
  process.exit(1);
}

async function ask(q) {
  const { system, retrieved } = pipe.prepare(q);
  const started = Date.now();
  for (let attempt = 0; ; attempt++) {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': KEY, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 2048,
        output_config: { effort: EFFORT },
        system,
        messages: [{ role: 'user', content: q.question }],
      }),
    });
    const data = await res.json();
    if ((res.status === 429 || res.status >= 500) && attempt < 4) {
      await new Promise(r => setTimeout(r, 2000 * 2 ** attempt));
      continue;
    }
    if (!res.ok) return { id: q.id, error: `${res.status} ${JSON.stringify(data?.error ?? data)}` };
    const raw = (data.content ?? []).filter(b => b.type === 'text').map(b => b.text).join('');
    const { reply, sources, unknownRefs } = extractCitations(raw, pipe.index);
    return {
      id: q.id,
      question: q.question,
      raw,
      reply,
      sources: sources.map(s => ({ ref: s.ref, id: s.id, name: s.name })),
      unknownRefs,
      retrieved,
      stop_reason: data.stop_reason,
      usage: data.usage,
      latency_ms: Date.now() - started,
    };
  }
}

// 첫 문항은 혼자 보내 캐시를 쓰고, 나머지는 병렬로 (동시에 보내면 전부 캐시 미스가 난다)
const results = [await ask(questions[0])];
process.stdout.write(`1/${questions.length}\r`);
for (let i = 1; i < questions.length; i += CONCURRENCY) {
  results.push(...await Promise.all(questions.slice(i, i + CONCURRENCY).map(ask)));
  process.stdout.write(`${results.length}/${questions.length}\r`);
}

const usage = results.reduce((s, r) => {
  const u = r.usage ?? {};
  s.input += u.input_tokens ?? 0;
  s.cache_read += u.cache_read_input_tokens ?? 0;
  s.cache_write += u.cache_creation_input_tokens ?? 0;
  s.output += u.output_tokens ?? 0;
  return s;
}, { input: 0, cache_read: 0, cache_write: 0, output: 0 });

const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
mkdirSync(path.join(here, 'results'), { recursive: true });
const file = path.join(here, 'results', `${stamp}-${VERSION}-${MODEL}.json`);
writeFileSync(file, JSON.stringify({
  version: VERSION, model: MODEL, effort: EFFORT, snapshot_source: snap.source,
  run_at: new Date().toISOString(), usage, results,
}, null, 2) + '\n');

const errors = results.filter(r => r.error);
console.log(`\n${results.length - errors.length}/${results.length} 성공 → ${path.relative(path.resolve(here, '..'), file)}`);
console.log('토큰 합계', usage, '— cache_read 가 0 이면 캐시가 안 걸린 것');
if (errors.length) console.log('실패:', errors.map(e => `${e.id}: ${e.error}`).join('\n'));
console.log(`채점: node eval/grade.mjs "${path.relative(path.resolve(here, '..'), file)}"`);
