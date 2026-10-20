// RAG 버전 B·C 의 인터페이스 — 아직 구현하지 않았다 (임베딩 API 키가 필요).
//
// 버전 A (구현됨):  카탈로그 74개 전체를 시스템 프롬프트에 넣고 캐싱 → _shared/catalog.ts
// 버전 B (TODO):    질문을 임베딩 → match_chunks(top-k) → 관련 아이템만 넣기
// 버전 C (TODO):    B + 리뷰(reviews.body) 벡터 검색 → "실제 이용자 후기" 인용
//
// 키를 넣고 이어갈 순서는 RAG_PLAN.md 맨 아래 "버전 B·C 이어가기" 체크리스트에 있다.
// 이 파일도 런타임 의존 0 (Deno·Node 공용). Supabase 클라이언트는 인자로 받는다.

// ── 임베딩 ────────────────────────────────────────────────────────────────
// 1순위 Voyage(voyage-3.5 계열, 1024차원) — 024_pgvector_rag.sql 이 vector(1024) 기준.
// OpenAI text-embedding-3-small(1536차원)을 고르면 마이그레이션의 1024 를 전부 1536 으로.
// ⚠️ 가입 시점에 모델명·차원을 다시 확인할 것 (RAG_PLAN.md §2).

export interface EmbeddingProvider {
  readonly model: string;
  readonly dimensions: number;
  // 문서(청크)와 질문은 input_type 을 다르게 줘야 검색 품질이 오른다 (Voyage: 'document' | 'query').
  embed(texts: string[], inputType: 'document' | 'query'): Promise<number[][]>;
}

// TODO(B): EMBEDDING_API_KEY 가 생기면 구현.
//   POST https://api.voyageai.com/v1/embeddings
//   body: { model, input: texts, input_type }  → data[i].embedding
//   배치 상한·요청 형식은 가입 시 문서로 확인. 키는 Edge Function secret 과 로컬 env 에만.
export function createVoyageProvider(_apiKey: string, model = 'voyage-3.5'): EmbeddingProvider {
  return {
    model,
    dimensions: 1024,
    embed() {
      return Promise.reject(new Error('TODO(B): Voyage 임베딩 미구현 — RAG_PLAN.md "버전 B·C 이어가기" 참고'));
    },
  };
}

// ── 청크 ─────────────────────────────────────────────────────────────────
// rag_chunks 테이블 한 행. 아이템 1개 = 청크 1개(자르지 않는다, RAG_PLAN.md 1-1).
// content 는 catalog.ts 의 catalogChunks() 가 만든 **같은 텍스트**를 쓴다 —
// 그래야 A 와 B 의 차이가 "무엇을 넣었나"가 아니라 "몇 개를 넣었나"로만 남아 비교가 공정하다.
export type ChunkSourceType = 'treatment' | 'device' | 'review' | 'post';

export interface RagChunk {
  source_type: ChunkSourceType;
  source_id: string;
  content: string;
  metadata: Record<string, unknown>;
}

export interface RetrievedChunk extends RagChunk {
  similarity: number;
}

// ── 검색기 ───────────────────────────────────────────────────────────────
export interface RetrieveOptions {
  k: number;                          // 버전 B 기본 5
  sourceType?: ChunkSourceType;       // null 이면 전체
  minSimilarity?: number;             // 무관한 결과 컷오프 (평가로 정한다)
}

export interface Retriever {
  readonly name: string;              // 평가 리포트에 찍히는 이름 (예: 'B:voyage-3.5:k5')
  retrieve(query: string, opts: RetrieveOptions): Promise<RetrievedChunk[]>;
}

// 최소한의 RPC 호출 형태만 요구한다 (supabase-js 클라이언트가 그대로 맞는다).
export interface RpcClient {
  rpc(fn: string, args: Record<string, unknown>): PromiseLike<{ data: unknown; error: unknown }>;
}

// TODO(B): 024_pgvector_rag.sql 의 match_chunks 호출. 구현은 아래 정도면 된다.
//   const [vec] = await embedder.embed([query], 'query');
//   const { data, error } = await db.rpc('match_chunks', {
//     query_embedding: vec, match_count: opts.k,
//     filter_source_type: opts.sourceType ?? null, min_similarity: opts.minSimilarity ?? 0,
//   });
export function createPgvectorRetriever(_db: RpcClient, embedder: EmbeddingProvider): Retriever {
  return {
    name: `B:${embedder.model}`,
    retrieve() {
      return Promise.reject(new Error('TODO(B): pgvector 검색 미구현 — 024 마이그레이션 적용 + 임베딩 후'));
    },
  };
}

// TODO(C): 경험·후기성 질문("아팠어?", "효과 있었어?")일 때만 리뷰 top-3 를 추가 검색.
//   - reviews.body 를 source_type='review' 로 rag_chunks 에 적재 (metadata 에 item_id·rating)
//   - 리뷰는 서로 모순된다("하나도 안 아팠어요" vs "너무 아팠어요") → 한쪽만 고르지 말고
//     "후기가 갈린다"고 양쪽을 인용하는 규칙을 프롬프트에 추가
//   - 평가셋에 후기형 문항을 따로 만들 것 (eval/golden.json 은 현재 카탈로그 문항만)
export function isExperienceQuestion(q: string): boolean {
  return /(아팠|아프던|후기|효과\s*(있었|봤)|해\s*본\s*사람|받아\s*본|써\s*본|실제로)/.test(q);
}

// 검색 결과 → 시스템 프롬프트 블록. 버전 B 는 catalog.ts 의 formatCatalog 자리에 이 텍스트를 넣는다.
// 주의: 검색 결과는 질문마다 바뀌므로 캐시 지점 **뒤**에 둬야 한다(지시문만 캐시).
export function formatRetrieved(chunks: RetrievedChunk[]): string {
  if (chunks.length === 0) return '[참고자료] 관련 아이템을 찾지 못했습니다.';
  return ['[참고자료]', ...chunks.map(c => c.content)].join('\n\n');
}
