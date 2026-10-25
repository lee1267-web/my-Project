import { h } from '../utils/dom.ts';

// 확인 대화상자. <dialog> 를 사용해 키보드(Esc)·포커스 처리를 브라우저에 맡깁니다.
// 사용: if (await confirmDialog({ title, message, confirmText, danger: true })) { ... }
export interface ConfirmOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  danger?: boolean;
}

export function confirmDialog({ title, message, confirmText = '확인', cancelText = '취소', danger = false }: ConfirmOptions): Promise<boolean> {
  return new Promise((resolve) => {
    const cancelBtn = h('button', { type: 'button', class: 'btn btn-ghost', value: 'cancel' }, cancelText);
    const okBtn = h('button', { type: 'button', class: `btn ${danger ? 'btn-danger' : 'btn-primary'}`, value: 'ok' }, confirmText);
    const dialog = h(
      'dialog',
      { class: 'dialog', 'aria-labelledby': 'dialog-title' },
      h('h2', { id: 'dialog-title', class: 'dialog-title' }, title),
      h('p', { class: 'dialog-message' }, message),
      h('div', { class: 'dialog-actions' }, cancelBtn, okBtn),
    );
    let result = false;
    cancelBtn.addEventListener('click', () => dialog.close());
    okBtn.addEventListener('click', () => {
      result = true;
      dialog.close();
    });
    dialog.addEventListener('close', () => {
      dialog.remove();
      resolve(result);
    });
    document.body.appendChild(dialog);
    if (typeof dialog.showModal === 'function') {
      dialog.showModal();
      cancelBtn.focus();
    } else {
      // 아주 오래된 브라우저 대비
      dialog.remove();
      resolve(window.confirm(`${title}\n\n${message}`));
    }
  });
}
