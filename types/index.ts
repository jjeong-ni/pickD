export type SkinType = '건성' | '지성' | '복합성' | '민감성' | '중성';
export type FaceShape = '타원형' | '둥근형' | '각진형' | '하트형' | '긴형';
export type ItemType = 'treatment' | 'device';

export interface SkinMetrics {
  모공: number;
  주름: number;
  색소침착: number;
  UV색소침착: number;
  탄력: number;
  피부톤: number;
}

export interface Profile {
  id: string;
  user_id: string;
  nickname: string;
  skin_type: SkinType | null;
  face_shape: FaceShape | null;
  concerns: string[];
  age_group: string | null;
  gender: string | null;
  points: number;
  skin_age: number | null;
  moisture_score: number | null;
  oil_score: number | null;
  // Baumann 분석 결과 (skin-analysis.tsx)
  baumann_code: string | null;       // e.g. "DRNT"
  skin_metrics: SkinMetrics | null;  // 6대 피부 지표 (0~100)
  skin_dehydration: boolean | null;  // 속건조 여부
  created_at: string;
}

export interface Treatment {
  id: string;
  name: string;
  category: string;
  description: string;
  price_min: number;
  price_max: number;
  duration_min: number;
  duration_max: number;
  tags: string[];
  image_url: string | null;
  images: string[];           // 갤러리 이미지 배열
  video_url: string | null;   // YouTube URL
  rating: number;
  review_count: number;
  pain_level: string | null;
  downtime: string | null;
  duration: string | null;
  sessions: string | null;
  side_effects: string | null;
  contraindications: string | null;
}

export interface Device {
  id: string;
  name: string;
  brand: string;
  category: string;
  description: string;
  price: number;
  tags: string[];
  image_url: string | null;
  images: string[];           // 갤러리 이미지 배열
  video_url: string | null;   // YouTube URL
  coupang_url: string | null; // 쿠팡파트너스 URL
  rating: number;
  review_count: number;
  usage_frequency: string | null;
  results_timeline: string | null;
  side_effects: string | null;
  contraindications: string | null;
}

export interface Review {
  id: string;
  user_id: string;
  item_id: string;
  item_type: ItemType;
  rating: number;
  body: string;
  image_url: string | null;
  created_at: string;
  profile?: Pick<Profile, 'nickname'>;
}

export interface CompareItem {
  id: string;
  user_id: string;
  item_id: string;
  item_type: ItemType;
  created_at: string;
}

export interface Post {
  id: string;
  user_id: string;
  title: string;
  body: string;
  category: string;
  likes: number;
  comment_count: number;
  created_at: string;
  profile?: Pick<Profile, 'nickname'>;
}

export interface Payment {
  id: string;
  user_id: string;
  order_id: string;
  order_name: string;
  amount: number;
  status: 'pending' | 'done' | 'failed' | 'canceled';
  toss_payment_key: string | null;
  created_at: string;
}
