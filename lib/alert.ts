import { Alert as RNAlert, Platform, type AlertButton, type AlertOptions } from 'react-native';
import { notify } from './mutate';

/**
 * `react-native` 의 Alert 를 그대로 대신하는 모듈. 호출 모양이 똑같다.
 *
 *   import { Alert } from '../lib/alert';
 *   Alert.alert('제목', '내용', [{ text: '취소', style: 'cancel' }, { text: '삭제', onPress }]);
 *
 * 왜: react-native-web@0.21.2 의 Alert 는 `static alert() {}` — 빈 함수다.
 * 웹 배포본에서는 안내도, "삭제할까요?" 확인창도, 버튼 콜백도 전부 조용히 사라진다.
 * (삭제 확인창 뒤에 걸린 삭제는 웹에서 아예 실행되지 않았다.)
 *
 * 네이티브: 원래 Alert 를 그대로 부른다. 동작 변화 없음.
 * 웹:
 *   - 버튼 0~1개 → 토스트(lib/mutate 의 같은 통로) + 그 버튼 콜백을 바로 실행
 *   - 버튼 2개 이상 → window.confirm. [확인] = 취소가 아닌 첫 버튼, [취소] = cancel 버튼
 *     브라우저 확인창은 버튼 글자를 바꿀 수 없어서, 글자가 "확인/취소"와 다르면
 *     본문 끝에 어떤 버튼이 무엇인지 적어준다.
 */
function webAlert(title: string, message?: string, buttons?: AlertButton[]) {
  const list = buttons ?? [];

  if (list.length <= 1) {
    // Alert.alert('', '내용') 처럼 제목이 비어 있으면 내용을 제목 자리에 올린다.
    if (title) notify(title, message ?? '');
    else notify(message ?? '', '');
    const only = list[0];
    if (only?.onPress) setTimeout(() => only.onPress?.(), 0);
    return;
  }

  // RN 규칙: style 'cancel' 이 취소 버튼. 없으면 첫 버튼을 취소로 본다(안드로이드 순서).
  const cancelIdx = Math.max(0, list.findIndex((b) => b.style === 'cancel'));
  const cancel = list[cancelIdx];
  const primary = list.find((_, i) => i !== cancelIdx) ?? list[0];

  const hints: string[] = [];
  if (primary.text && !['확인', 'OK'].includes(primary.text)) hints.push(`[확인] ${primary.text}`);
  if (cancel.text && !['취소', '닫기', 'Cancel'].includes(cancel.text)) hints.push(`[취소] ${cancel.text}`);

  const body = [title, message, hints.length ? hints.join('   ') : '']
    .filter(Boolean)
    .join('\n\n');

  // window.confirm 이 없는 환경(SSR·미리보기)에서는 안내만 하고 아무것도 실행하지 않는다.
  if (typeof window === 'undefined' || typeof window.confirm !== 'function') {
    notify(title, message ?? '');
    return;
  }
  const ok = window.confirm(body);
  const chosen = ok ? primary : cancel;
  if (chosen?.onPress) setTimeout(() => chosen.onPress?.(), 0);
}

export const Alert = {
  alert(title: string, message?: string, buttons?: AlertButton[], options?: AlertOptions) {
    if (Platform.OS === 'web') webAlert(title, message, buttons);
    else RNAlert.alert(title, message, buttons, options);
  },
};
