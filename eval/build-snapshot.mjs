// 시술·기기 카탈로그 스냅샷 만들기 — 평가셋의 "정답지" 원본.
//
//   node eval/build-snapshot.mjs            # 마이그레이션 SQL(016 + 024)에서 파싱 → eval/catalog.snapshot.json
//   node eval/build-snapshot.mjs --live     # 라이브 DB(REST, anon 키, 읽기 전용)에서 가져와 같은 파일로 저장
//   node eval/build-snapshot.mjs --diff     # SQL 파싱본과 라이브 DB를 비교만 (파일 안 씀)
//
// 왜 두 경로인가: 2026-10-21 작업 시점에 Supabase 프로젝트가 일시정지(INACTIVE)라
// DB를 직접 못 읽었다. 016 이 시술·기기를 전부 지우고 다시 넣고, 024 가 신제품을
// 추가하므로 "016 + 024" 가 마이그레이션 기준 DB 상태다. 프로젝트를 깨운 뒤
// --diff 로 실제 DB 와 어긋난 곳이 없는지 확인하고, 어긋나면 --live 로 덮어쓴다.
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const OUT = path.join(here, 'catalog.snapshot.json');
const SOURCES = [
  'supabase/migrations/016_update_products.sql',
  'supabase/migrations/024_add_website_url_and_new_products.sql',
];

const TREATMENT_COLS = ['id', 'name', 'category', 'description', 'price_min', 'price_max',
  'duration_min', 'duration_max', 'tags', 'rating', 'review_count', 'pain_level', 'downtime',
  'duration', 'sessions', 'side_effects', 'contraindications'];
const DEVICE_COLS = ['id', 'name', 'brand', 'category', 'description', 'price', 'tags', 'rating',
  'review_count', 'usage_frequency', 'results_timeline', 'side_effects', 'contraindications'];

// ── SQL VALUES 파서 (이 저장소의 시드 형식만 처리: '문자열', 숫자, NULL, ARRAY['..']) ──
function stripComments(sql) {
  let out = '';
  let inStr = false;
  for (let i = 0; i < sql.length; i++) {
    const c = sql[i];
    if (inStr) {
      out += c;
      if (c === "'" && sql[i + 1] === "'") { out += "'"; i++; }
      else if (c === "'") inStr = false;
    } else if (c === "'") { inStr = true; out += c; }
    else if (c === '-' && sql[i + 1] === '-') { while (i < sql.length && sql[i] !== '\n') i++; out += '\n'; }
    else out += c;
  }
  return out;
}

function parseValue(src, i) {
  while (/\s/.test(src[i])) i++;
  if (src[i] === "'") {
    let s = '';
    i++;
    for (;;) {
      if (src[i] === "'" && src[i + 1] === "'") { s += "'"; i += 2; }
      else if (src[i] === "'") { i++; break; }
      else s += src[i++];
    }
    return [s, i];
  }
  if (src.startsWith('ARRAY[', i)) {
    i += 6;
    const arr = [];
    for (;;) {
      while (/\s|,/.test(src[i])) i++;
      if (src[i] === ']') { i++; break; }
      const [v, j] = parseValue(src, i);
      arr.push(v);
      i = j;
    }
    return [arr, i];
  }
  const m = /^(NULL|null|true|false|-?\d+(?:\.\d+)?)/.exec(src.slice(i));
  if (!m) throw new Error(`알 수 없는 값: ${src.slice(i, i + 40)}`);
  const raw = m[1];
  const v = /^null$/i.test(raw) ? null : raw === 'true' ? true : raw === 'false' ? false : Number(raw);
  return [v, i + raw.length];
}

function parseInserts(sql, table) {
  const rows = [];
  const re = new RegExp(`INSERT INTO ${table}\\s*\\(([^)]*)\\)\\s*VALUES`, 'gi');
  let m;
  while ((m = re.exec(sql))) {
    const cols = m[1].split(',').map(s => s.trim());
    let i = re.lastIndex;
    for (;;) {
      while (/\s|,/.test(sql[i])) i++;
      if (sql[i] !== '(') break; // ON CONFLICT ... 또는 ; 에 도달
      i++;
      const vals = [];
      for (;;) {
        const [v, j] = parseValue(sql, i);
        vals.push(v);
        i = j;
        while (/\s/.test(sql[i])) i++;
        if (sql[i] === ',') { i++; continue; }
        if (sql[i] === ')') { i++; break; }
        throw new Error(`튜플 파싱 실패 @${i}: ${sql.slice(i, i + 40)}`);
      }
      if (vals.length !== cols.length) throw new Error(`${table}: 컬럼 ${cols.length}개, 값 ${vals.length}개`);
      rows.push(Object.fromEntries(cols.map((c, k) => [c, vals[k]])));
    }
  }
  return rows;
}

function pick(row, cols) {
  return Object.fromEntries(cols.map(c => [c, row[c] ?? null]));
}

function fromSql() {
  const byId = { treatments: new Map(), devices: new Map() };
  for (const rel of SOURCES) {
    const sql = stripComments(readFileSync(path.join(root, rel), 'utf8'));
    // 016 은 DELETE 후 INSERT, 024 는 ON CONFLICT DO NOTHING → 먼저 들어간 행이 이긴다.
    for (const t of ['treatments', 'devices']) {
      for (const r of parseInserts(sql, t)) if (!byId[t].has(r.id)) byId[t].set(r.id, r);
    }
  }
  return {
    treatments: [...byId.treatments.values()].map(r => pick(r, TREATMENT_COLS)),
    devices: [...byId.devices.values()].map(r => pick(r, DEVICE_COLS)),
  };
}

function loadEnv() {
  // 원본 체크아웃의 .env 도 찾아본다 (worktree 에는 .env 가 없을 수 있음)
  const candidates = [path.join(root, '.env'), path.resolve(root, '../../../.env')];
  for (const f of candidates) {
    try {
      for (const line of readFileSync(f, 'utf8').split(/\r?\n/)) {
        const m = /^([A-Z0-9_]+)\s*=\s*(.*)$/.exec(line);
        if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
      }
    } catch { /* 없으면 다음 후보 */ }
  }
}

async function fromLive() {
  loadEnv();
  const url = process.env.SUPABASE_URL ?? process.env.EXPO_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY ?? process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error('SUPABASE_URL / SUPABASE_ANON_KEY (또는 EXPO_PUBLIC_*) 가 필요합니다');
  const get = async (table, cols) => {
    const res = await fetch(`${url}/rest/v1/${table}?select=${cols.join(',')}&order=id`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
    });
    if (!res.ok) throw new Error(`${table}: HTTP ${res.status} ${await res.text()}`);
    return res.json();
  };
  return {
    treatments: await get('treatments', TREATMENT_COLS),
    devices: await get('devices', DEVICE_COLS),
  };
}

function sortById(c) {
  return {
    treatments: [...c.treatments].sort((a, b) => a.id.localeCompare(b.id)),
    devices: [...c.devices].sort((a, b) => a.id.localeCompare(b.id)),
  };
}

function diff(a, b) {
  const lines = [];
  for (const t of ['treatments', 'devices']) {
    const bm = new Map(b[t].map(r => [r.id, r]));
    for (const ra of a[t]) {
      const rb = bm.get(ra.id);
      if (!rb) { lines.push(`- ${t} ${ra.id} ${ra.name}: 라이브에 없음`); continue; }
      for (const k of Object.keys(ra)) {
        if (JSON.stringify(ra[k]) !== JSON.stringify(rb[k])) {
          lines.push(`~ ${t} ${ra.id} ${ra.name}.${k}: SQL=${JSON.stringify(ra[k])} / 라이브=${JSON.stringify(rb[k])}`);
        }
      }
      bm.delete(ra.id);
    }
    for (const rb of bm.values()) lines.push(`+ ${t} ${rb.id} ${rb.name}: 라이브에만 있음`);
  }
  return lines;
}

const mode = process.argv[2] ?? '';
if (mode === '--diff') {
  const lines = diff(sortById(fromSql()), sortById(await fromLive()));
  console.log(lines.length ? lines.join('\n') : '차이 없음 — SQL 파싱본 = 라이브 DB');
  process.exit(lines.length ? 1 : 0);
}
const catalog = sortById(mode === '--live' ? await fromLive() : fromSql());
const out = {
  source: mode === '--live' ? 'live-db' : SOURCES.join(' + '),
  generated_at: new Date().toISOString(),
  ...catalog,
};
writeFileSync(OUT, JSON.stringify(out, null, 2) + '\n');
console.log(`시술 ${catalog.treatments.length}개 · 기기 ${catalog.devices.length}개 → ${path.relative(root, OUT)}`);
