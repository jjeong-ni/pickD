// 토스페이먼츠 클라이언트 키 (앱 노출용 — 서버 시크릿 키와 다름)
// test_ck_... 키를 .env에 EXPO_PUBLIC_TOSS_CLIENT_KEY로 설정
export const TOSS_CLIENT_KEY = process.env.EXPO_PUBLIC_TOSS_CLIENT_KEY!;

export interface TossPaymentParams {
  orderId: string;
  orderName: string;
  amount: number;
  customerName: string;
  successUrl: string;
  failUrl: string;
}

export function buildTossPaymentUrl(params: TossPaymentParams): string {
  const base = 'https://pay.toss.im/paymentv2/v1/payment';
  const query = new URLSearchParams({
    clientKey: TOSS_CLIENT_KEY,
    method: 'card',
    orderId: params.orderId,
    orderName: params.orderName,
    amount: String(params.amount),
    customerName: params.customerName,
    successUrl: params.successUrl,
    failUrl: params.failUrl,
  });
  return `${base}?${query.toString()}`;
}
