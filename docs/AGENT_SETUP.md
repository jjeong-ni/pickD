# 픽디 에이전트 시스템 설정 가이드

자율 AI 에이전트 시스템 구성 방법을 설명합니다.

## 필수 환경변수

### Supabase Edge Function Secrets

Supabase 대시보드 → Settings → Edge Functions → Secrets에 추가:

| 변수명 | 설명 | 예시 |
|--------|------|------|
| `ANTHROPIC_API_KEY` | Claude API 키 | `sk-ant-...` |
| `AGENT_SECRET` | 크론 호출 인증 시크릿 (임의 생성) | `your-random-secret-32chars` |
| `GITHUB_TOKEN` | GitHub 이슈 생성용 Personal Access Token | `ghp_...` |

### GitHub Repository Secrets

GitHub 저장소 → Settings → Secrets and variables → Actions에 추가:

| 변수명 | 설명 |
|--------|------|
| `SUPABASE_FUNCTION_URL` | Supabase Edge Function 베이스 URL (예: `https://xxx.supabase.co/functions/v1`) |
| `AGENT_SECRET` | 위 AGENT_SECRET과 동일한 값 |

## Edge Functions 배포

```bash
# Supabase CLI 설치
npm install -g supabase

# 로그인
supabase login

# Edge Function 배포
supabase functions deploy ai-chat --project-ref YOUR_PROJECT_REF
supabase functions deploy agent-analyze --project-ref YOUR_PROJECT_REF
```

## 데이터베이스 마이그레이션

```bash
supabase db push --project-ref YOUR_PROJECT_REF
```

또는 Supabase SQL Editor에서 `supabase/migrations/025_agent_system.sql` 실행.

## GitHub Personal Access Token 권한

`GITHUB_TOKEN`은 다음 권한이 필요합니다:
- `repo` → Issues: Write

[GitHub Settings → Developer settings → Personal access tokens](https://github.com/settings/tokens)에서 생성.

## 에이전트 동작 방식

```
매일 KST 03:00
  └── GitHub Actions 크론
        └── agent-analyze Edge Function 호출
              ├── 어제 chat_logs 조회 (최대 50건)
              ├── Claude Haiku로 패턴 분석
              ├── 개선 제안 최대 3건 추출
              └── 각 제안에 대해:
                    ├── 🔒 보안 리뷰어 검토
                    ├── 🏥 의학 정확성 리뷰어 검토
                    ├── 💬 UX 리뷰어 검토
                    └── 3인 모두 승인 시 → GitHub 이슈 자동 생성
```

## 비용 추정

Claude Haiku 4.5 기준 (2025년):
- Input: $0.80/MTok, Output: $4.00/MTok
- 일일 분석 1회: ~₩300~500/회
- 월 예상: **₩9,000~15,000**

## 모니터링

Supabase 대시보드 → Table Editor:
- `agent_runs`: 에이전트 실행 이력
- `agent_proposals`: 생성된 개선 제안
- `chat_logs`: AI 대화 로그
