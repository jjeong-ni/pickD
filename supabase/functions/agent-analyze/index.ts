import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-agent-secret',
};

const ANTHROPIC_API_KEY = () => Deno.env.get('ANTHROPIC_API_KEY') ?? '';
const CLAUDE_MODEL = 'claude-haiku-4-5-20251001';
const GITHUB_TOKEN = () => Deno.env.get('GITHUB_TOKEN') ?? '';
const REPO = 'jjeong-ni/pickD';
const OWNER_EMAIL = 'blackwhitejocker@gmail.com';

// ── 3인 리뷰어 시스템 프롬프트 ──────────────────────────────────────
const REVIEWER_PROMPTS = {
  security: `당신은 보안 전문가입니다. 다음 AI 응답 개선 제안을 검토하세요.
확인 항목:
- 사용자 PII(개인정보) 노출 위험
- 악의적 사용 가능성 (예: 약물 오남용 조장)
- 인증 우회나 권한 문제
- 민감 데이터 처리 방식
반드시 JSON만 반환하세요: {"approved": true, "reason": "한 문장"}`,

  medical: `당신은 의료 정확성 전문가입니다. 다음 뷰티/시술 AI 응답 개선 제안을 검토하세요.
확인 항목:
- 시술 효과 과장 또는 허위 정보
- 위험한 자가 처치 조언 포함 여부
- 중요한 금기사항(임신, 특정 질환 등) 누락
- 비과학적 주장
반드시 JSON만 반환하세요: {"approved": true, "reason": "한 문장"}`,

  ux: `당신은 한국 뷰티 앱 UX 전문가입니다. 다음 AI 응답 개선 제안을 검토하세요.
확인 항목:
- 한국 사용자에게 자연스럽지 않은 표현
- 혼란을 야기하는 설명
- 과도한 경고/면책으로 신뢰 손상
- 응답 길이가 너무 길거나 짧은 경우
반드시 JSON만 반환하세요: {"approved": true, "reason": "한 문장"}`,
};

async function callClaude(messages: { role: string; content: string }[], system: string, maxTokens = 1200): Promise<string> {
  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY(),
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({ model: CLAUDE_MODEL, max_tokens: maxTokens, system, messages }),
    });
    const data = await res.json();
    return data.content?.[0]?.text ?? '';
  } catch {
    return '';
  }
}

async function reviewWithPersona(content: string, personaKey: keyof typeof REVIEWER_PROMPTS): Promise<{ approved: boolean; reason: string }> {
  const text = await callClaude(
    [{ role: 'user', content }],
    REVIEWER_PROMPTS[personaKey],
    200,
  );
  try {
    const match = text.match(/\{[\s\S]*?\}/);
    if (match) return JSON.parse(match[0]);
  } catch { /* empty */ }
  return { approved: false, reason: '검토 중 오류 발생' };
}

async function createGithubIssue(title: string, body: string): Promise<string | null> {
  try {
    const res = await fetch(`https://api.github.com/repos/${REPO}/issues`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GITHUB_TOKEN()}`,
        'Content-Type': 'application/json',
        'Accept': 'application/vnd.github.v3+json',
      },
      body: JSON.stringify({ title, body, labels: ['agent-proposal', '🤖 auto'] }),
    });
    const data = await res.json();
    return data.html_url ?? null;
  } catch {
    return null;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  // 크론 호출 보안: x-agent-secret 헤더 검증
  const agentSecret = Deno.env.get('AGENT_SECRET');
  const reqSecret = req.headers.get('x-agent-secret');
  if (agentSecret && reqSecret !== agentSecret) {
    return new Response(JSON.stringify({ error: '인증 실패' }), {
      status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  // 실행 로그 시작
  const { data: runRecord } = await supabase
    .from('agent_runs')
    .insert({ run_type: 'analyze', status: 'running' })
    .select()
    .single();

  try {
    // 1. 어제 대화 로그 조회
    const since = new Date();
    since.setDate(since.getDate() - 1);
    const { data: logs } = await supabase
      .from('chat_logs')
      .select('role, content, category, used_claude')
      .gte('created_at', since.toISOString())
      .order('created_at', { ascending: true });

    if (!logs || logs.length === 0) {
      await supabase.from('agent_runs').update({
        status: 'completed', summary: '분석할 로그 없음', completed_at: new Date().toISOString(),
      }).eq('id', runRecord?.id);
      return new Response(JSON.stringify({ message: '분석할 로그 없음' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 2. 사용자 질문만 추출해 패턴 분석
    const userQuestions = logs
      .filter((l) => l.role === 'user')
      .map((l) => l.content)
      .slice(0, 50)  // 최대 50개
      .join('\n---\n');

    const analysisPrompt = `다음은 픽디 뷰티 앱의 어제 사용자 질문 목록입니다.

${userQuestions}

분석 요청:
1. AI가 잘 답하지 못한 질문 패턴 (빈 응답, 기본 응답 비율 높은 것)
2. 새로 등장한 트렌드 질문
3. AI 응답을 개선해야 할 최우선 영역 3가지

다음 JSON 형태로만 반환하세요:
{
  "unanswered_patterns": ["패턴1", "패턴2"],
  "new_trends": ["트렌드1", "트렌드2"],
  "improvements": [
    {
      "type": "ai_response",
      "title": "개선 제목 (30자 이내)",
      "description": "구체적으로 어떤 응답을 어떻게 개선해야 하는지 (100자 이내)",
      "keywords": ["관련 키워드1", "키워드2"],
      "suggested_response_snippet": "개선된 응답 예시 첫 줄"
    }
  ]
}`;

    const analysisResult = await callClaude(
      [{ role: 'user', content: analysisPrompt }],
      '당신은 픽디 앱 AI 품질 개선 전문가입니다. 대화 로그를 분석해 구체적인 개선안을 JSON으로만 제시합니다.',
      1500,
    );

    let improvements: any[] = [];
    try {
      const match = analysisResult.match(/\{[\s\S]*\}/);
      if (match) {
        const parsed = JSON.parse(match[0]);
        improvements = parsed.improvements ?? [];
      }
    } catch { /* empty */ }

    let proposalsCreated = 0;
    let issuesCreated = 0;

    // 3. 각 개선 제안을 3인 리뷰어로 검토
    for (const improvement of improvements.slice(0, 3)) {
      const reviewContent = `제안 제목: ${improvement.title}
설명: ${improvement.description}
응답 예시: ${improvement.suggested_response_snippet ?? 'N/A'}
관련 키워드: ${(improvement.keywords ?? []).join(', ')}`;

      const [securityReview, medicalReview, uxReview] = await Promise.all([
        reviewWithPersona(reviewContent, 'security'),
        reviewWithPersona(reviewContent, 'medical'),
        reviewWithPersona(reviewContent, 'ux'),
      ]);

      const allApproved = securityReview.approved && medicalReview.approved && uxReview.approved;

      const { data: proposal } = await supabase
        .from('agent_proposals')
        .insert({
          proposal_type: improvement.type ?? 'ai_response',
          title: improvement.title,
          description: improvement.description,
          diff_content: improvement.suggested_response_snippet,
          reviewer_security: securityReview,
          reviewer_medical: medicalReview,
          reviewer_ux: uxReview,
          all_approved: allApproved,
        })
        .select()
        .single();

      proposalsCreated++;

      // 4. 3인 모두 승인 시 GitHub 이슈 생성
      if (allApproved && proposal) {
        const issueBody = `## 🤖 픽디 에이전트 자동 개선 제안

**제안 타입:** AI 응답 개선
**제안 ID:** \`${proposal.id}\`

### 개선 내용
${improvement.description}

### 개선 응답 예시
\`\`\`
${improvement.suggested_response_snippet ?? ''}
\`\`\`

### 관련 키워드
${(improvement.keywords ?? []).join(', ')}

---
### 3인 리뷰어 검토 결과

| 리뷰어 | 결과 | 의견 |
|--------|------|------|
| 🔒 보안 감시자 | ✅ 승인 | ${securityReview.reason} |
| 🏥 의학 정확성 | ✅ 승인 | ${medicalReview.reason} |
| 💬 UX 감시자 | ✅ 승인 | ${uxReview.reason} |

---
> ⚠️ 이 이슈는 픽디 에이전트가 자동 생성했습니다.
> **적용 전 반드시 검토 후 머지 승인해주세요.**`;

        const issueUrl = await createGithubIssue(
          `[에이전트] ${improvement.title}`,
          issueBody,
        );

        if (issueUrl) {
          await supabase
            .from('agent_proposals')
            .update({ github_issue_url: issueUrl, notification_sent: true })
            .eq('id', proposal.id);
          issuesCreated++;
        }
      }
    }

    // 5. 실행 완료 기록
    await supabase.from('agent_runs').update({
      status: 'completed',
      summary: `로그 ${logs.length}건 분석 → 제안 ${proposalsCreated}건 생성, 이슈 ${issuesCreated}건 생성`,
      proposals_created: proposalsCreated,
      issues_created: issuesCreated,
      completed_at: new Date().toISOString(),
    }).eq('id', runRecord?.id);

    return new Response(JSON.stringify({
      analyzed: logs.length,
      proposals_created: proposalsCreated,
      issues_created: issuesCreated,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (e) {
    console.error('agent-analyze error:', e);
    await supabase.from('agent_runs').update({
      status: 'failed',
      summary: String(e),
      completed_at: new Date().toISOString(),
    }).eq('id', runRecord?.id);

    return new Response(JSON.stringify({ error: '에이전트 분석 오류' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
