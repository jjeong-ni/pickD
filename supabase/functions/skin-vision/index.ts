import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const GOOGLE_VISION_API_KEY = Deno.env.get('GOOGLE_VISION_API_KEY') ?? '';
const ALLOWED_ORIGIN = Deno.env.get('ALLOWED_ORIGIN') ?? 'https://pick-d.vercel.app';

const corsHeaders = {
  'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization') ?? '';
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { imageBase64 } = await req.json();
    if (!imageBase64) {
      return new Response(JSON.stringify({ error: 'Missing imageBase64' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const visionRes = await fetch(
      `https://vision.googleapis.com/v1/images:annotate?key=${GOOGLE_VISION_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requests: [{
            image: { content: imageBase64 },
            features: [
              { type: 'FACE_DETECTION', maxResults: 1 },
              { type: 'LABEL_DETECTION', maxResults: 30 },
              { type: 'IMAGE_PROPERTIES' },
            ],
          }],
        }),
      },
    );

    const visionData = await visionRes.json();
    const annotation = visionData.responses?.[0];
    if (!annotation || annotation.error) {
      throw new Error(annotation?.error?.message ?? 'Vision API error');
    }

    return new Response(JSON.stringify(parseSkinAnalysis(annotation)), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message ?? 'Unknown error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

// ── 분석 파싱 ──────────────────────────────────────────────

function likelihoodScore(l: string): number {
  return ({ VERY_UNLIKELY: 0.05, UNLIKELY: 0.2, POSSIBLE: 0.5, LIKELY: 0.75, VERY_LIKELY: 0.95 } as Record<string, number>)[l] ?? 0.5;
}

function rgbToHex(r: number, g: number, b: number) {
  return '#' + [r, g, b].map(x => Math.round(x).toString(16).padStart(2, '0')).join('');
}

function analyzeSkinTone(colors: any[]) {
  if (!colors.length) return { label: '분석 불가', desc: '색상 정보를 추출할 수 없어요', hex: '#f5d0a9', warmth: 'neutral' };

  const top = [...colors].sort((a, b) => b.pixelFraction - a.pixelFraction).slice(0, 5);
  let r = 0, g = 0, b = 0, w = 0;
  for (const c of top) {
    const pf = c.pixelFraction ?? 0.01;
    r += (c.color?.red ?? 128) * pf;
    g += (c.color?.green ?? 100) * pf;
    b += (c.color?.blue ?? 80) * pf;
    w += pf;
  }
  if (w > 0) { r /= w; g /= w; b /= w; }

  const brightness = (r + g + b) / 3;
  const warmth = r - b;
  const hex = rgbToHex(r, g, b);

  let label: string;
  let desc: string;
  let warmthLabel: string;

  if (warmth > 25) {
    warmthLabel = 'warm';
    if (brightness > 180) { label = '밝은 웜 톤'; desc = '복숭아·황금빛이 감도는 밝은 피부예요'; }
    else if (brightness > 120) { label = '미디엄 웜 톤'; desc = '따뜻한 황금빛 올리브 피부예요'; }
    else { label = '다크 웜 톤'; desc = '따뜻한 갈색 구릿빛 피부예요'; }
  } else if (warmth < -10) {
    warmthLabel = 'cool';
    if (brightness > 180) { label = '밝은 쿨 톤'; desc = '핑크·장밋빛이 감도는 밝은 피부예요'; }
    else if (brightness > 120) { label = '미디엄 쿨 톤'; desc = '차가운 올리브·뉴트럴 피부예요'; }
    else { label = '다크 쿨 톤'; desc = '딥하고 쿨한 피부예요'; }
  } else {
    warmthLabel = 'neutral';
    if (brightness > 180) { label = '밝은 뉴트럴 톤'; desc = '따뜻하지도 차갑지도 않은 밝은 피부예요'; }
    else if (brightness > 120) { label = '미디엄 뉴트럴 톤'; desc = '균형 잡힌 중간 피부 톤이에요'; }
    else { label = '다크 뉴트럴 톤'; desc = '깊고 균형 잡힌 피부 톤이에요'; }
  }

  return { label, desc, hex, warmth: warmthLabel, brightness: Math.round(brightness) };
}

function detectConcerns(labels: { description: string; score: number }[]): { label: string; score: number }[] {
  const map: [string, string][] = [
    ['acne', '여드름·트러블'],
    ['wrinkle', '주름'],
    ['pore', '모공'],
    ['redness', '홍조'],
    ['oily', '과잉 피지'],
    ['dry', '건조함'],
    ['pigment', '색소침착'],
    ['dark spot', '다크스팟'],
    ['blemish', '잡티'],
    ['freckle', '주근깨'],
    ['sebaceous', '피지선 과활성'],
    ['scar', '흉터 자국'],
  ];
  const found: { label: string; score: number }[] = [];
  for (const [key, korean] of map) {
    const match = labels.find(l => l.description.toLowerCase().includes(key));
    if (match) found.push({ label: korean, score: Math.round(match.score * 100) });
  }
  return found;
}

function parseSkinAnalysis(annotation: any) {
  const faces = annotation.faceAnnotations ?? [];
  const labels = (annotation.labelAnnotations ?? [])
    .map((l: any) => ({ description: l.description as string, score: l.score as number }));
  const colors = annotation.imagePropertiesAnnotation?.dominantColors?.colors ?? [];

  const hasFace = faces.length > 0;
  const face = faces[0] ?? null;

  const imageQuality = face ? {
    blurred: likelihoodScore(face.blurredLikelihood) > 0.6,
    underExposed: likelihoodScore(face.underExposedLikelihood) > 0.6,
    confidence: Math.round((face.detectionConfidence ?? 0) * 100),
  } : null;

  const skinTone = analyzeSkinTone(colors);
  const concerns = detectConcerns(labels);
  const topLabels = labels.filter((l: any) => l.score > 0.75).slice(0, 8).map((l: any) => l.description);

  return { hasFace, imageQuality, skinTone, concerns, topLabels };
}
