import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const TOSS_SECRET_KEY = Deno.env.get('TOSS_SECRET_KEY') ?? '';
const TOSS_CONFIRM_URL = 'https://api.tosspayments.com/v1/payments/confirm';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // JWT로 요청자 신원 검증
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: '인증이 필요합니다' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseVerify = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user: authUser }, error: authError } = await supabaseVerify.auth.getUser();
    if (authError || !authUser) {
      return new Response(JSON.stringify({ error: '유효하지 않은 인증입니다' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!TOSS_SECRET_KEY) {
      return new Response(JSON.stringify({ error: '결제 서비스가 아직 준비 중이에요.' }), {
        status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { paymentKey, orderId, amount, orderName } = await req.json();
    const userId = authUser.id; // 클라이언트 제공값 무시, JWT에서 추출

    if (!paymentKey || !orderId || !amount) {
      return new Response(JSON.stringify({ error: '필수 파라미터 누락' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (typeof amount !== 'number' || amount <= 0 || amount > 1000000) {
      return new Response(JSON.stringify({ error: '유효하지 않은 결제 금액입니다' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 토스페이먼츠 결제 승인 요청
    const tossRes = await fetch(TOSS_CONFIRM_URL, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${btoa(TOSS_SECRET_KEY + ':')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ paymentKey, orderId, amount }),
    });

    const tossData = await tossRes.json();

    if (!tossRes.ok) {
      return new Response(JSON.stringify({ error: tossData.message }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Supabase에 결제 내역 저장
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    await supabase.from('payments').upsert({
      user_id: userId,
      order_id: orderId,
      order_name: orderName ?? '',
      amount,
      status: 'done',
      toss_payment_key: paymentKey,
    });

    // 포인트 적립 (결제금액의 1%)
    const points = Math.floor(amount / 100);
    await supabase.rpc('increment_points', { user_id_param: userId, points_param: points });

    return new Response(JSON.stringify({ success: true, points }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
