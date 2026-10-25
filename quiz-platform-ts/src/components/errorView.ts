import { h, setTitle } from '../utils/dom.ts';
import type { AppError, ErrorKind } from '../utils/errors.ts';

const VIEWS: Record<ErrorKind, { icon: string; title: string; code: string }> = {
  'not-found': { icon: '🔍', title: '퀴즈를 찾을 수 없어요', code: '404' },
  deleted: { icon: '🗑️', title: '삭제된 퀴즈예요', code: '410' },
  forbidden: { icon: '🔒', title: '볼 수 없는 퀴즈예요', code: '403' },
  network: { icon: '📡', title: '네트워크 오류', code: '' },
  config: { icon: '⚙️', title: 'Firebase 설정 오류', code: '' },
  unknown: { icon: '⚠️', title: '문제가 발생했어요', code: '' },
  auth: { icon: '⚠️', title: '문제가 발생했어요', code: '' }, // 지금은 쓰이지 않음 (unknown 과 같게)
};

// 오류 종류에 맞는 안내 화면. 빈 화면이 남지 않도록 모든 오류에 사용합니다.
export function renderErrorView(container: HTMLElement, error: AppError, { onRetry }: { onRetry?: () => void } = {}): void {
  const view = VIEWS[error.kind] || VIEWS.unknown;
  setTitle(view.title);
  const message = error.kind === 'forbidden'
    ? '비공개 퀴즈이거나 본인이 만든 퀴즈가 아니에요. 제작자에게 공개 설정을 확인해 달라고 요청해 보세요.'
    : error.message;
  const actions: HTMLElement[] = [h('a', { href: '/', class: 'btn btn-primary' }, '홈으로 가기')];
  if (onRetry && (error.kind === 'network' || error.kind === 'unknown')) {
    actions.unshift(h('button', { type: 'button', class: 'btn btn-ghost', onclick: onRetry }, '다시 시도'));
  }
  container.append(
    h('section', { class: 'state-page container', 'data-error-kind': error.kind },
      h('div', { class: 'state-icon', 'aria-hidden': 'true' }, view.icon),
      view.code ? h('p', { class: 'state-code' }, view.code) : null,
      h('h1', { class: 'state-title' }, view.title),
      h('p', { class: 'state-message' }, message),
      h('div', { class: 'state-actions' }, actions),
    ),
  );
}
