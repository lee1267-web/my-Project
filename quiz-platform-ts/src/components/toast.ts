// 화면 아래에 잠깐 나타나는 알림 메시지 (스크린리더에도 읽힘)
let region: HTMLDivElement | undefined;

function getRegion(): HTMLDivElement {
  if (!region) {
    const el = document.createElement('div');
    el.className = 'toast-region';
    el.setAttribute('role', 'status');
    el.setAttribute('aria-live', 'polite');
    document.body.appendChild(el);
    region = el;
  }
  return region;
}

export function showToast(message: string, type: 'info' | 'success' | 'error' = 'info', duration = 3000): void {
  const el = document.createElement('div');
  el.className = `toast toast-${type}`;
  el.textContent = message;
  getRegion().appendChild(el);
  setTimeout(() => {
    el.classList.add('toast-hide');
    setTimeout(() => el.remove(), 300);
  }, duration);
}
