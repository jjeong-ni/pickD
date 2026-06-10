import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const GOOGLE_VISION_API_KEY = Deno.env.get('GOOGLE_VISION_API_KEY') ?? '';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Fallback responses when Google Vision API key is not configured
const FALLBACK_SKIN_TONE = {
  label: '분석 준비 중',
  desc: '피부 톤 분석 서비스가 준비 중이에요',
  hex: '#f5d0a9',
  warmth: 'neutral',
  brightness: 180,
};

const FALLBACK_ANALYSIS = {
  hasFace: false,
  imageQuality: null,
  skinTone: FALLBACK_SKIN_TONE,
  faceShape: null,
  concerns: [],
  topLabels: [],
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

    const body = await req.json();
    const { imageBase64, feature } = body;
    if (!imageBase64) {
      return new Response(JSON.stringify({ error: 'Missing imageBase64' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // API 키가 없으면 폴백 응답 반환
    if (!GOOGLE_VISION_API_KEY) {
      if (feature === 'text') {
        return new Response(JSON.stringify({ text: '' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      return new Response(JSON.stringify(FALLBACK_ANALYSIS), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // TEXT_DETECTION mode for ingredient analysis
    if (feature === 'text') {
      const visionRes = await fetch(
        `https://vision.googleapis.com/v1/images:annotate?key=${GOOGLE_VISION_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            requests: [{
              image: { content: imageBase64 },
              features: [{ type: 'TEXT_DETECTION', maxResults: 1 }],
            }],
          }),
        },
      );
      const visionData = await visionRes.json();
      const annotation = visionData.responses?.[0];
      if (!annotation || annotation.error) throw new Error(annotation?.error?.message ?? 'Vision API error');
      const fullText = annotation.textAnnotations?.[0]?.description ?? '';
      return new Response(JSON.stringify({ text: fullText }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
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

// ── 헬퍼 ────────────────────────────────────────────────────

function likelihoodScore(l: string): number {
  return ({ VERY_UNLIKELY: 0.05, UNLIKELY: 0.2, POSSIBLE: 0.5, LIKELY: 0.75, VERY_LIKELY: 0.95 } as Record<string, number>)[l] ?? 0.5;
}

function rgbToHex(r: number, g: number, b: number) {
  return '#' + [r, g, b].map(x => Math.round(x).toString(16).padStart(2, '0')).join('');
}

function dist(a: any, b: any): number {
  if (!a || !b) return 0;
  const dx = (a.x ?? 0) - (b.x ?? 0);
  const dy = (a.y ?? 0) - (b.y ?? 0);
  return Math.sqrt(dx * dx + dy * dy);
}

// ── 피부 톤 분석 ─────────────────────────────────────────────

function analyzeSkinTone(colors: any[]) {
  if (!colors.length) return { label: '분석 불가', desc: '색상 정보를 추출할 수 없어요', hex: '#f5d0a9', warmth: 'neutral', brightness: 128 };

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
    label = brightness > 180 ? '밝은 웜 톤' : brightness > 120 ? '미디엄 웜 톤' : '다크 웜 톤';
    desc = brightness > 180 ? '복숭아·황금빛이 감도는 밝은 피부예요' : brightness > 120 ? '따뜻한 황금빛 올리브 피부예요' : '따뜻한 갈색 구릿빛 피부예요';
  } else if (warmth < -10) {
    warmthLabel = 'cool';
    label = brightness > 180 ? '밝은 쿨 톤' : brightness > 120 ? '미디엄 쿨 톤' : '다크 쿨 톤';
    desc = brightness > 180 ? '핑크·장밋빛이 감도는 밝은 피부예요' : brightness > 120 ? '차가운 올리브·뉴트럴 피부예요' : '딥하고 쿨한 피부예요';
  } else {
    warmthLabel = 'neutral';
    label = brightness > 180 ? '밝은 뉴트럴 톤' : brightness > 120 ? '미디엄 뉴트럴 톤' : '다크 뉴트럴 톤';
    desc = brightness > 180 ? '따뜻하지도 차갑지도 않은 밝은 피부예요' : brightness > 120 ? '균형 잡힌 중간 피부 톤이에요' : '깊고 균형 잡힌 피부 톤이에요';
  }

  return { label, desc, hex, warmth: warmthLabel, brightness: Math.round(brightness) };
}

// ── 얼굴형 분석 (Vision API 랜드마크 기반) ───────────────────

function getLandmark(landmarks: any[], type: string) {
  return landmarks?.find((l: any) => l.type === type)?.position ?? null;
}

function analyzeFaceShape(face: any): { shape: string; desc: string; confidence: number } {
  const lm = face?.landmarks ?? [];
  if (!lm.length) return { shape: '분석 불가', desc: '얼굴 랜드마크를 감지하지 못했어요', confidence: 0 };

  const leftEar    = getLandmark(lm, 'LEFT_EAR_TRAGION');
  const rightEar   = getLandmark(lm, 'RIGHT_EAR_TRAGION');
  const forehead   = getLandmark(lm, 'FOREHEAD_GLABELLA');
  const chin       = getLandmark(lm, 'CHIN_GNATHION');
  const leftBrow   = getLandmark(lm, 'LEFT_OF_LEFT_EYEBROW');
  const rightBrow  = getLandmark(lm, 'RIGHT_OF_RIGHT_EYEBROW');
  const leftGonion = getLandmark(lm, 'CHIN_LEFT_GONION');
  const rightGonion= getLandmark(lm, 'CHIN_RIGHT_GONION');

  const faceWidth    = dist(leftEar, rightEar);
  const faceHeight   = dist(forehead, chin);
  const foreheadW    = dist(leftBrow, rightBrow) * 1.25;
  const jawW         = dist(leftGonion, rightGonion);

  if (!faceWidth || !faceHeight) return { shape: '분석 불가', desc: '측정에 필요한 특징점을 찾지 못했어요', confidence: 40 };

  const ratio = faceHeight / faceWidth;
  const fwRatio = foreheadW / faceWidth;
  const jwRatio = jawW / faceWidth;

  let shape: string;
  let desc: string;

  if (ratio > 1.45) {
    shape = '긴형';
    desc = '세로가 가로보다 길어요. 볼·광대 볼륨으로 가로 너비감을 보완해보세요.';
  } else if (ratio < 1.05 && jwRatio > 0.8) {
    shape = '사각형';
    desc = '가로세로 비율이 비슷하고 턱선이 각진 형태예요. 교근 보톡스가 효과적이에요.';
  } else if (ratio < 1.1) {
    shape = '둥근형';
    desc = '얼굴이 둥글고 볼이 풍성한 형태예요. 세로 길이감을 살려주는 시술이 잘 맞아요.';
  } else if (fwRatio > 0.85 && jwRatio < 0.6) {
    shape = '하트형';
    desc = '이마가 넓고 턱으로 갈수록 V자형으로 좁아지는 형태예요. 하안면 볼륨 보충이 포인트예요.';
  } else if (fwRatio < 0.72 && jawW > 0) {
    shape = '다이아몬드형';
    desc = '이마와 턱이 좁고 광대가 가장 넓게 도드라지는 형태예요. 이마 볼륨 보충이 핵심이에요.';
  } else {
    shape = '계란형';
    desc = '상·중·하안 비율이 균형 잡힌 이상적인 얼굴형이에요. 노화 예방 관리가 핵심이에요.';
  }

  const confidence = Math.round((face.detectionConfidence ?? 0.8) * 100);
  return { shape, desc, confidence };
}

// ── 피부 고민 감지 ─────────────────────────────────────────

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

// ── 메인 파서 ─────────────────────────────────────────────

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
  const faceShape = hasFace ? analyzeFaceShape(face) : null;
  const concerns = detectConcerns(labels);
  const topLabels = labels.filter((l: any) => l.score > 0.75).slice(0, 8).map((l: any) => l.description);

  return { hasFace, imageQuality, skinTone, faceShape, concerns, topLabels };
}
