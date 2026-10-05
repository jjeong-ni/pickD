import { Alert, Platform } from 'react-native';

/**
 * 낙관적 쓰기 규칙.
 *
 * 규칙은 세 줄이다.
 *   1. 화면을 **먼저** 바꾼다. 서버를 기다리지 않는다.
 *   2. 서버가 실패하면 **원래대로 되돌린다.**
 *   3. 되돌렸다는 사실을 **사용자에게 말한다.**
 *
 * 3번이 빠지면 사용자 눈에는 "방금 지운 게 혼자 되살아났다"로 보인다.
 * 되돌리기만 있고 알리지 않는 건 버그를 조용히 숨기는 것과 같다.
 *
 * 왜 이 파일이 생겼나:
 *   비교함(useCompare)에서 remove/clear 는 낙관적 쓰기 + 롤백이 있었는데
 *   add 는 서버를 기다렸고, 셋 다 실패를 아무에게도 알리지 않았다.
 *   같은 성격의 일이 서로 다른 방식으로 처리되고 있었다는 뜻이다.
 *   규칙을 한 군데 적어두고 전부 그리로 통과시킨다.
 *
 * 참고: Expensify/App 의 낙관적 업데이트 구조 (깃허브 스터디 2026-10-04, 배치 35).
 *   코드를 가져오지 않았다. 규칙만 가져왔다.
 */

/** 실패를 사용자에게 알리는 통로. 기본은 Alert. */
export type MutationReporter = (title: string, message: string) => void;

/**
 * ★ `Alert.alert` 은 **react-native-web 에서 빈 함수다.**
 *
 *   react-native-web@0.21.2 의 구현 전체:
 *       class Alert { static alert() {} }
 *
 *   즉 웹(Netlify 배포본)에서는 Alert 이 아무것도 하지 않는다. 호출해도 조용하다.
 *   "되돌렸다는 사실을 사용자에게 말한다"는 규칙이 웹에서만 통째로 증발하는 것이다.
 *   되돌리기는 되는데 아무 말이 없으니, 사용자 눈에는 '혼자 되살아난 버그'로 보인다.
 *
 *   그래서 웹에서는 직접 띄운다. `window.alert` 은 스레드를 막고 보기도 나빠서
 *   의존성 없는 최소 토스트를 DOM 으로 만든다. (sonner-native 는 reanimated·
 *   gesture-handler 를 요구해서 지금 들일 수 없다 — 그 자리를 이게 메운다.)
 */
function webToast(title: string, message: string) {
  if (typeof document === 'undefined' || !document.body) return;

  const ID = 'pickdi-toast-root';
  let root = document.getElementById(ID);
  if (!root) {
    root = document.createElement('div');
    root.id = ID;
    root.setAttribute('aria-live', 'polite');
    Object.assign(root.style, {
      position: 'fixed',
      left: '50%',
      // 하단 탭바와 주요 CTA 버튼을 가리지 않는 높이. safe-area 까지 피한다.
      bottom: 'calc(88px + env(safe-area-inset-bottom, 0px))',
      transform: 'translateX(-50%)',
      zIndex: '99999',
      display: 'flex',
      flexDirection: 'column',
      gap: '8px',
      alignItems: 'center',
      pointerEvents: 'none',
      maxWidth: 'min(92vw, 420px)',
    } as Partial<CSSStyleDeclaration>);
    document.body.appendChild(root);
  }

  const el = document.createElement('div');
  Object.assign(el.style, {
    background: 'rgba(17,17,17,0.94)',
    color: '#fff',
    padding: '12px 16px',
    borderRadius: '12px',
    font: '500 14px/1.45 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    boxShadow: '0 6px 24px rgba(0,0,0,0.22)',
    opacity: '0',
    transition: 'opacity 160ms ease, transform 160ms ease',
    transform: 'translateY(6px)',
    pointerEvents: 'auto',
    textAlign: 'center',
    wordBreak: 'keep-all',
  } as Partial<CSSStyleDeclaration>);
  // textContent 로만 넣는다 — 서버 오류 문구가 그대로 들어오므로 HTML 로 해석시키지 않는다.
  const strong = document.createElement('div');
  strong.textContent = title;
  strong.style.fontWeight = '700';
  el.appendChild(strong);
  if (message) {
    const sub = document.createElement('div');
    sub.textContent = message;
    sub.style.opacity = '0.85';
    sub.style.marginTop = '2px';
    el.appendChild(sub);
  }
  root.appendChild(el);

  requestAnimationFrame(() => {
    el.style.opacity = '1';
    el.style.transform = 'translateY(0)';
  });
  const remove = () => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(6px)';
    setTimeout(() => el.remove(), 200);
  };
  el.addEventListener('click', remove);
  setTimeout(remove, 4000);
}

const defaultReporter: MutationReporter = (title, message) => {
  if (Platform.OS === 'web') webToast(title, message);
  else Alert.alert(title, message);
};

let reporter: MutationReporter = defaultReporter;

/**
 * 알림 수단을 통째로 갈아끼운다.
 *
 * 지금은 Alert 를 쓴다. 토스트(sonner-native 등)는 reanimated·gesture-handler 를
 * 요구하는데 둘 다 아직 의존성에 없고, react-native-web 으로 웹도 같이 내보내기
 * 때문에 지금 들일 수 없다. 나중에 dev build 로 넘어가면 **이 함수 한 번 호출로**
 * 전체가 토스트로 바뀐다. 호출부는 하나도 고치지 않는다.
 *
 * (플랫폼/구현 차이를 하나의 API 뒤에 숨기는 방식 — zeego 에서 가져온 패턴)
 */
export function setMutationReporter(fn: MutationReporter | null) {
  reporter = fn ?? defaultReporter;
}

/** 롤백 없이 실패만 알릴 때. */
export function reportMutationError(what: string, detail?: string) {
  reporter(`${what} 실패`, detail?.trim() || '잠시 후 다시 시도해주세요.');
}

function messageOf(error: unknown): string | undefined {
  if (!error) return undefined;
  if (typeof error === 'string') return error;
  if (typeof error === 'object' && 'message' in error) {
    const m = (error as { message?: unknown }).message;
    if (typeof m === 'string') return m;
  }
  return undefined;
}

export interface OptimisticOptions<T> {
  /** 사용자에게 보일 행위 이름. 예: '비교함에 추가' */
  what: string;
  /** 화면을 먼저 바꾼다. */
  apply: () => void;
  /** 실패하면 되돌린다. apply 전 상태를 그대로 복원해야 한다. */
  rollback: () => void;
  /**
   * 서버 호출. supabase 응답 모양({ data, error })을 그대로 받는다.
   * supabase 쿼리 빌더는 Promise 가 아니라 PromiseLike 라서 반환형을 그렇게 잡아야
   * `commit: () => supabase.from(...).delete().eq(...)` 를 그대로 넘길 수 있다.
   */
  commit: () => PromiseLike<{ data?: T | null; error: unknown }>;
  /**
   * 서버가 성공하고 **값을 돌려줬을 때** 호출된다.
   * 임시로 끼워둔 행을 진짜 행으로 바꿔 끼우는 자리다.
   * 이걸 빠뜨리면 임시 id 가 화면에 남아 다음 삭제가 서버에서 조용히 실패한다.
   */
  reconcile?: (data: T) => void;
  /** true 면 실패해도 알리지 않는다. 배경 동기화처럼 사용자가 시킨 일이 아닐 때만. */
  silent?: boolean;
}

/** 성공하면 true. 실패하면 되돌리고 알린 뒤 false. */
export async function optimistic<T>(opts: OptimisticOptions<T>): Promise<boolean> {
  opts.apply();
  try {
    const { data, error } = await opts.commit();
    if (error) {
      opts.rollback();
      if (!opts.silent) reportMutationError(opts.what, messageOf(error));
      return false;
    }
    if (data != null && opts.reconcile) opts.reconcile(data);
    return true;
  } catch (e) {
    // 네트워크가 끊기면 supabase 클라이언트가 throw 한다. error 필드로 안 온다.
    // 이 catch 가 없으면 화면만 바뀐 채로 예외가 위로 튀어 롤백이 영영 안 일어난다.
    opts.rollback();
    if (!opts.silent) reportMutationError(opts.what, messageOf(e));
    return false;
  }
}
