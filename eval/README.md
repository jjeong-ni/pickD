# eval — 픽디 상담 RAG 평가

`RAG_PLAN.md` 1-3 의 채점표. **RAG 코드보다 먼저** 만든 것.
의존성 0 (Node 24 내장 기능만). `package.json` 을 건드리지 않는다.

| 파일 | 역할 |
|---|---|
| `build-snapshot.mjs` | 시술·기기 카탈로그 → `catalog.snapshot.json` (정답지 원본) |
| `catalog.snapshot.json` | DB 값 스냅샷. 지금은 마이그레이션 016 + 024 파싱본 |
| `make-golden.mjs` | 질문 템플릿 + 스냅샷 값 → `golden.json` |
| `golden.json` | 46문항 (사실 14 · 금기 10 · 추천 6 · 비교 6 · 함정 10). **손으로 고치지 말 것** |
| `run.mjs` | 버전별 파이프라인으로 답 생성 → `results/*.json` |
| `grader.mjs` / `grade.mjs` | 규칙 기반 채점 → `results/*.md` 리포트 |

## 돌리는 순서 (PowerShell)

```powershell
# 0) 채점기 자체 점검 (API 호출 없음)
node eval/grade.mjs --selftest

# 1) 프롬프트 크기 확인 (API 호출 없음)
node eval/run.mjs --dry

# 2) 실행 — 키는 이 창에서만. 파일에 저장하지 말 것
$env:ANTHROPIC_API_KEY = "sk-ant-..."
node eval/run.mjs --limit 3          # 연결 확인
node eval/run.mjs                    # 전 문항 (Haiku 5.5 기준 약 1~2센트)

# 3) 채점
node eval/grade.mjs (Get-ChildItem eval/results/*.json | Sort-Object LastWriteTime | Select-Object -Last 1).FullName
```

`MODULE_TYPELESS_PACKAGE_JSON` 경고가 한 줄 뜨는 건 정상이다(Node 가 `.ts` 를 ESM 으로 재해석한다는 안내).
보기 싫으면 `node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON eval/run.mjs`.

모델 비교: `node eval/run.mjs --model claude-haiku-4-5` 후 `node eval/grade.mjs <a.json> <b.json>` — 표로 나란히 나온다.

## 지표

| 지표 | 계산 |
|---|---|
| Groundedness | 함정 외 문항에서, 답에 나온 금액이 전부 DB 금액인 비율 |
| Abstention | 함정 문항에서 "확인이 어렵다" 류로 답한 비율 |
| 오거절 | DB 에 답이 있는데 모른다고 한 비율 — Abstention 만 올리는 "다 모른다고 하기" 꼼수를 잡는다 |
| 인용 재현율 | 정답 아이템을 답 끝 `근거:` 줄에 댄 비율 |
| Hit@5 | (버전 B·C) 정답 아이템이 검색 top-5 에 든 비율. `run.mjs` 가 `retrieved` 를 남기면 자동 계산 |

채점은 문자열 규칙이라 **표현이 다르면 오답이 될 수 있다**("일주일 정도" ≠ "3~7일").
리포트의 "틀린 문항"에 실제 답이 찍히니 금기형·추천형은 눈으로 한 번 확인한다.

## DB 가 바뀌면

```powershell
node eval/build-snapshot.mjs --diff   # 라이브 DB 와 스냅샷 비교 (Supabase 프로젝트가 켜져 있어야 함)
node eval/build-snapshot.mjs --live   # 라이브 DB 로 스냅샷 갱신 (anon 키, 읽기 전용)
node eval/make-golden.mjs             # 정답지 재생성 — 아이템 이름이 바뀌었으면 여기서 에러로 알려준다
```
