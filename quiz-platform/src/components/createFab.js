import { h } from '../utils/dom.js';

// 화면 오른쪽 아래에 떠 있는 "직접 만들기" 버튼
// 홈에서 카테고리·세부 분류를 보고 있었다면 그 분류를 만들기 화면에 미리 채웁니다.
let fab;

export function renderCreateFab(parent) {
  fab = h('a', { href: '/create', class: 'fab', 'aria-label': '퀴즈 직접 만들기' },
    h('span', { class: 'fab-icon', 'aria-hidden': 'true' }, '+'),
    h('span', { class: 'fab-text' }, '직접 만들기'),
  );
  // 라우터(document 클릭)보다 먼저 실행되어 이동할 주소를 정합니다.
  fab.addEventListener('click', () => {
    const now = new URLSearchParams(location.search);
    const p = new URLSearchParams();
    if (location.pathname === '/' && now.get('cat')) {
      p.set('cat', now.get('cat'));
      if (now.get('sub')) p.set('sub', now.get('sub'));
    }
    const qs = p.toString();
    fab.setAttribute('href', qs ? `/create?${qs}` : '/create');
  });
  parent.append(fab);
}

// 만들기·수정·풀기 화면에서는 입력이나 버튼을 가리지 않도록 숨깁니다.
export function setCreateFabVisible(visible) {
  if (!fab) return;
  fab.hidden = !visible;
  document.body.classList.toggle('has-fab', visible);
}
