-- ============================================================
-- Migration 024: pgvector 기반 RAG (Business Knowledge Agent)
-- Supabase SQL Editor에서 실행하세요.
--
-- ⚠️ vector(1024)는 Voyage voyage-3.5 계열 기준입니다.
--    OpenAI text-embedding-3-small을 쓰면 1536으로 전부 바꾸세요.
-- ============================================================

-- ── 1. 확장 ──────────────────────────────────────────────────
create extension if not exists vector;

-- ── 2. 청크 테이블 ───────────────────────────────────────────
create table if not exists rag_chunks (
  id           uuid primary key default gen_random_uuid(),
  source_type  text not null check (source_type in ('treatment', 'device', 'review', 'post')),
  source_id    uuid not null,
  content      text not null,              -- 임베딩한 원문 (그대로 프롬프트에 들어감)
  metadata     jsonb not null default '{}',-- 이름, 카테고리, 가격 등 필터·표시용
  embedding    vector(1024),
  updated_at   timestamptz default now(),
  created_at   timestamptz default now(),
  unique (source_type, source_id)
);

-- ── 3. 인덱스 ────────────────────────────────────────────────
-- HNSW + 코사인 거리. 50~수천 건 규모에서 충분히 빠름.
create index if not exists rag_chunks_embedding_idx
  on rag_chunks using hnsw (embedding vector_cosine_ops);

create index if not exists rag_chunks_source_type_idx
  on rag_chunks (source_type);

-- ── 4. RLS: 읽기는 공개, 쓰기는 service_role만 ───────────────
alter table rag_chunks enable row level security;

drop policy if exists "rag_chunks_read_all" on rag_chunks;
create policy "rag_chunks_read_all"
  on rag_chunks for select
  using (true);
-- insert/update/delete 정책 없음 = anon/authenticated는 쓰기 불가.
-- service_role은 RLS를 우회하므로 embed 스크립트만 쓸 수 있다.

-- ── 5. 유사도 검색 함수 ──────────────────────────────────────
create or replace function match_chunks(
  query_embedding    vector(1024),
  match_count        int   default 5,
  filter_source_type text  default null,   -- 'treatment' | 'device' | 'review' | null(전체)
  min_similarity     float default 0.0     -- 무관한 결과 컷오프
)
returns table (
  id          uuid,
  source_type text,
  source_id   uuid,
  content     text,
  metadata    jsonb,
  similarity  float
)
language sql
stable
as $$
  select
    c.id,
    c.source_type,
    c.source_id,
    c.content,
    c.metadata,
    1 - (c.embedding <=> query_embedding) as similarity
  from rag_chunks c
  where c.embedding is not null
    and (filter_source_type is null or c.source_type = filter_source_type)
    and 1 - (c.embedding <=> query_embedding) >= min_similarity
  order by c.embedding <=> query_embedding
  limit match_count;
$$;

-- anon도 호출 가능해야 Edge Function에서 쓸 수 있음
grant execute on function match_chunks(vector, int, text, float) to anon, authenticated, service_role;

-- ── 6. 확인 ──────────────────────────────────────────────────
select
  (select count(*) from rag_chunks)                            as total_chunks,
  (select count(*) from rag_chunks where embedding is not null) as embedded_chunks;
