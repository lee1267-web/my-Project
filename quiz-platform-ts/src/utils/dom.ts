// DOM 을 만들 때 쓰는 작은 도우미입니다.
// innerHTML 에 사용자 입력을 직접 넣으면 XSS(스크립트 삽입) 위험이 있으므로
// 사용자 데이터는 항상 textContent 로 넣는 h() 를 사용합니다.

// 자식으로 넣을 수 있는 값: 요소, 글자, 숫자, 그리고 배열. null·undefined·false 는 건너뜁니다.
export type Child = Node | string | number | null | undefined | false | Child[];
export type Attrs = Record<string, unknown>;

// h('button', { class: 'btn', onclick: fn }, '텍스트', 자식요소...)
export function h<K extends keyof HTMLElementTagNameMap>(tag: K, attrs?: Attrs | null, ...children: Child[]): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs || {})) {
    if (value === undefined || value === null || value === false) continue;
    if (key.startsWith('on') && typeof value === 'function') {
      el.addEventListener(key.slice(2).toLowerCase(), value as EventListener);
    } else if (key === 'class') {
      el.className = String(value);
    } else if (key === 'dataset') {
      Object.assign(el.dataset, value);
    } else if (key === 'value' && 'value' in el) {
      (el as HTMLInputElement).value = String(value);
    } else if ((key === 'checked' || key === 'disabled' || key === 'selected') && key in el) {
      (el as unknown as Record<string, boolean>)[key] = Boolean(value);
    } else if (value === true) {
      el.setAttribute(key, '');
    } else {
      el.setAttribute(key, String(value));
    }
  }
  appendChildren(el, children);
  return el;
}

export function appendChildren<E extends Element>(el: E, children: Child[]): E {
  for (const child of (children as unknown[]).flat(Infinity) as Child[]) {
    if (child === null || child === undefined || child === false) continue;
    el.append(child instanceof Node ? child : document.createTextNode(String(child)));
  }
  return el;
}

export function clear<E extends Element>(el: E): E {
  while (el.firstChild) el.removeChild(el.firstChild);
  return el;
}

export function formatDate(value: Date | string | null | undefined): string {
  if (!value) return '';
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('ko-KR', { year: 'numeric', month: 'short', day: 'numeric' });
}

export function setTitle(text: string): void {
  document.title = text ? `${text} · 퀴즈공방` : '퀴즈공방 - 직접 만들고 함께 푸는 퀴즈';
}
