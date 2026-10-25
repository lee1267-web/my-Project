import { h } from '../utils/dom.ts';
import { copyText } from '../utils/clipboard.ts';
import { showToast } from './toast.ts';
import { IS_DEMO } from '../services/config.ts';
import type { Quiz } from '../types.ts';

export function shareUrlFor(quizId: string): string {
  return `${location.origin}/quiz/${quizId}`;
}

// 공유 링크 + 복사 버튼 (+ 휴대폰 공유하기 버튼)
export function shareBox(quiz: Pick<Quiz, 'id' | 'title' | 'isPublic'>, { title = '친구에게 공유하기' }: { title?: string } = {}): HTMLElement {
  const url = shareUrlFor(quiz.id);
  const input = h('input', { type: 'text', class: 'input share-input', value: url, readonly: true, 'aria-label': '공유 링크' });
  input.addEventListener('focus', () => input.select());
  const status = h('p', { class: 'share-status', role: 'status', 'aria-live': 'polite' });

  const copyBtn = h('button', {
    type: 'button',
    class: 'btn btn-primary',
    async onclick() {
      const ok = await copyText(url);
      if (ok) {
        status.textContent = '링크를 복사했어요! 메신저에 붙여넣어 공유하세요.';
        status.className = 'share-status ok';
        showToast('링크를 복사했어요', 'success');
      } else {
        status.textContent = '자동 복사에 실패했어요. 위 링크를 길게 누르거나 선택해서 직접 복사해 주세요.';
        status.className = 'share-status fail';
        showToast('복사하지 못했어요. 링크를 직접 복사해 주세요.', 'error');
        input.focus();
        input.select();
      }
    },
  }, '링크 복사');

  const buttons = [copyBtn];
  if (typeof navigator.share === 'function') {
    buttons.push(h('button', {
      type: 'button',
      class: 'btn btn-ghost',
      async onclick() {
        try {
          await navigator.share({ title: quiz.title, text: `"${quiz.title}" 퀴즈 풀어볼래?`, url });
        } catch (e) {
          if ((e as Error | null)?.name !== 'AbortError') showToast('공유하지 못했어요. 링크 복사를 이용해 주세요.', 'error');
        }
      },
    }, '공유하기'));
  }

  const notes = [];
  if (!quiz.isPublic) notes.push('🔒 비공개 퀴즈라서 다른 사람은 이 링크로 열 수 없어요. 공유하려면 퀴즈를 공개로 바꿔 주세요.');
  if (IS_DEMO) notes.push('데모 모드에서는 이 링크가 지금 사용하는 브라우저에서만 열립니다.');

  return h('section', { class: 'share-box', 'aria-label': title },
    h('h2', { class: 'share-title' }, title),
    h('div', { class: 'share-row' }, input, h('div', { class: 'share-buttons' }, buttons)),
    status,
    notes.map((n) => h('p', { class: 'share-note' }, n)),
  );
}
