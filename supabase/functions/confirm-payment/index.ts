import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// 토스페이먼츠 시크릿 키 (서버 전용 — 절대 앱에 노출하지 말 것)
const TOSS_SECRET_KEY = 'test_sk_zXLkKEypNArWmo50nX3lmeaxYG5R';
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
    const { paymentKey, orderId, amount, userId, orderName } = await req.json();

    if (!paymentKey || !orderId || !amount || !userId) {
      return new Response(JSON.stringify({ error: '필수 파라미터 누락' }), {
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
