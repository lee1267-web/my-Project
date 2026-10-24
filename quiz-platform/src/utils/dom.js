// DOM 을 만들 때 쓰는 작은 도우미입니다.
// innerHTML 에 사용자 입력을 직접 넣으면 XSS(스크립트 삽입) 위험이 있으므로
// 사용자 데이터는 항상 textContent 로 넣는 h() 를 사용합니다.

// h('button', { class: 'btn', onclick: fn }, '텍스트', 자식요소...)
export function h(tag, attrs = {}, ...children) {
  const el = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs || {})) {
    if (value === undefined || value === null || value === false) continue;
    if (key.startsWith('on') && typeof value === 'function') {
      el.addEventListener(key.slice(2).toLowerCase(), value);
    } else if (key === 'class') {
      el.className = value;
    } else if (key === 'dataset') {
      Object.assign(el.dataset, value);
    } else if (key === 'value') {
      el.value = value;
    } else if (key === 'checked' || key === 'disabled' || key === 'selected') {
      el[key] = Boolean(value);
    } else if (value === true) {
      el.setAttribute(key, '');
    } else {
      el.setAttribute(key, String(value));
    }
  }
  appendChildren(el, children);
  return el;
}

export function appendChildren(el, children) {
  for (const child of children.flat(Infinity)) {
    if (child === null || child === undefined || child === false) continue;
    el.append(child instanceof Node ? child : document.createTextNode(String(child)));
  }
  return el;
}

export function clear(el) {
  while (el.firstChild) el.removeChild(el.firstChild);
  return el;
}

export function formatDate(value) {
  if (!value) return '';
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('ko-KR', { year: 'numeric', month: 'short', day: 'numeric' });
}

export function setTitle(text) {
  document.title = text ? `${text} · 퀴즈공방` : '퀴즈공방 - 직접 만들고 함께 푸는 퀴즈';
}
