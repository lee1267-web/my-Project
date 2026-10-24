import { h, clear } from '../utils/dom.js';

let links = {};

export function renderHeader(container) {
  clear(container);
  container.className = 'site-header';
  links = {
    home: h('a', { href: '/', class: 'nav-link' }, '둘러보기'),
    my: h('a', { href: '/my', class: 'nav-link' }, '내 퀴즈'),
    create: h('a', { href: '/create', class: 'btn btn-primary btn-sm nav-cta' }, '+ 퀴즈 만들기'),
  };
  container.append(
    h('div', { class: 'container header-inner' },
      h('a', { href: '/', class: 'logo', 'aria-label': '퀴즈공방 홈' },
        h('span', { class: 'logo-mark', 'aria-hidden': 'true' }, '?'),
        h('span', { class: 'logo-text' }, '퀴즈공방'),
      ),
      h('nav', { class: 'nav', 'aria-label': '주요 메뉴' }, links.home, links.my, links.create),
    ),
  );
}

export function updateActiveNav(key) {
  for (const [k, el] of Object.entries(links)) {
    if (k === key) el.setAttribute('aria-current', 'page');
    else el.removeAttribute('aria-current');
  }
}
