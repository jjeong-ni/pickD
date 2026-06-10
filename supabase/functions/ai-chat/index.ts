import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY') ?? '';
const ALLOWED_ORIGIN = Deno.env.get('ALLOWED_ORIGIN') ?? 'https://pick-d.vercel.app';

const corsHeaders = {
  'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SYSTEM_PROMPT = `당신은 픽디(Pick D) 앱의 AI 피부·시술 상담사입니다.
사용자의 피부 프로필(피부타입, 얼굴형, 피부 고민)과 관심 시술·기기 정보를 바탕으로
전문적이고 친근하게 상담합니다.

상담 원칙:
- 한국어로 친근하고 전문적인 어투 사용
- 의학적 확정 진단은 피하고 "전문의 상담을 권장한다"는 안내 포함
- 시술 비용, 통증, 회복기간 등 실용적인 정보 제공
- 사용자 프로필에 맞춤화된 답변
- 답변은 200자 이내로 간결하게 (긴 설명이 필요할 때만 더 길게)
- 이모지를 적절히 활용해 가독성 향상`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // JWT 인증
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: '인증이 필요합니다' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: '인증 실패' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { messages, profile, compareItems } = await req.json() as {
      messages: { role: 'user' | 'assistant'; content: string }[];
      profile?: {
        skin_type?: string;
        baumann_code?: string;
        face_shape?: string;
        concerns?: string[];
        age_group?: string;
      };
      compareItems?: { name: string; type: string }[];
    };

    if (!messages || messages.length === 0) {
      return new Response(JSON.stringify({ error: '메시지가 없습니다' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 사용자 프로필 컨텍스트 빌드
    const profileContext = profile ? [
      profile.skin_type && `피부타입: ${profile.skin_type}${profile.baumann_code ? `(${profile.baumann_code})` : ''}`,
      profile.face_shape && `얼굴형: ${profile.face_shape}`,
      profile.concerns?.length && `피부고민: ${profile.concerns.join(', ')}`,
      profile.age_group && `연령대: ${profile.age_group}`,
    ].filter(Boolean).join(' / ') : null;

    const compareContext = compareItems?.length
      ? `현재 비교 중인 항목: ${compareItems.map((i) => `${i.name}(${i.type})`).join(', ')}`
      : null;

    const contextBlock = [profileContext, compareContext].filter(Boolean).join('\n');
    const systemWithContext = contextBlock
      ? `${SYSTEM_PROMPT}\n\n[사용자 프로필]\n${contextBlock}`
      : SYSTEM_PROMPT;

    const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 512,
        system: systemWithContext,
        messages: messages.slice(-10), // 최근 10개 메시지만 전송
      }),
    });

    if (!anthropicRes.ok) {
      const errText = await anthropicRes.text();
      console.error('Anthropic API error:', errText);
      return new Response(JSON.stringify({ error: 'AI 응답 생성 실패' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const data = await anthropicRes.json();
    const reply = data.content?.[0]?.text ?? '죄송해요, 잠시 후 다시 시도해주세요.';

    return new Response(JSON.stringify({ reply }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('ai-chat error:', e);
    return new Response(JSON.stringify({ error: '서버 오류가 발생했어요' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
