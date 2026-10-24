// 아주 작은 History API 라우터입니다.
// 주소 예: /, /create, /edit/:id, /quiz/:id, /quiz/:id/result, /my

// "/quiz/:id" 같은 패턴을 정규식으로 바꿉니다.
export function compilePattern(pattern) {
  const keys = [];
  const source = pattern
    .replace(/\/+$/, '')
    .replace(/:([A-Za-z]+)/g, (_, key) => {
      keys.push(key);
      return '([^/]+)';
    });
  return { regex: new RegExp(`^${source || ''}/?$`), keys };
}

export function matchRoute(routes, pathname) {
  for (const route of routes) {
    const { regex, keys } = route._compiled || (route._compiled = compilePattern(route.path));
    const m = pathname.match(regex);
    if (m) {
      const params = {};
      keys.forEach((k, i) => {
        try {
          params[k] = decodeURIComponent(m[i + 1]);
        } catch {
          params[k] = m[i + 1];
        }
      });
      return { route, params };
    }
  }
  return null;
}

export function createRouter({ routes, notFound, onRender }) {
  let cleanup = null;
  let leaveGuard = null; // 작성 중인 내용이 있을 때 떠나기 전에 확인
  let currentPath = location.pathname + location.search;
  let renderToken = 0;

  async function render() {
    const token = ++renderToken;
    if (typeof cleanup === 'function') {
      try { cleanup(); } catch (e) { console.error(e); }
    }
    cleanup = null;
    leaveGuard = null;
    const found = matchRoute(routes, location.pathname);
    const route = found ? found.route : notFound;
    const params = found ? found.params : {};
    const query = Object.fromEntries(new URLSearchParams(location.search));
    const result = await onRender(route, params, query, () => token !== renderToken);
    if (token === renderToken) cleanup = result;
  }

  function navigate(to, { replace = false } = {}) {
    if (leaveGuard && !leaveGuard()) return false;
    if (replace) history.replaceState(null, '', to);
    else history.pushState(null, '', to);
    currentPath = location.pathname + location.search;
    window.scrollTo(0, 0);
    render();
    return true;
  }

  window.addEventListener('popstate', () => {
    if (leaveGuard && !leaveGuard()) {
      // 뒤로가기 취소: 원래 주소로 되돌립니다.
      history.pushState(null, '', currentPath);
      return;
    }
    currentPath = location.pathname + location.search;
    render();
  });

  // 같은 사이트 안의 <a href="/..."> 클릭은 새로고침 없이 이동
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href]');
    if (!a || a.target || a.hasAttribute('download') || e.defaultPrevented) return;
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const url = new URL(a.href, location.href);
    if (url.origin !== location.origin) return;
    // 같은 페이지 안의 #이동은 브라우저 기본 동작(스크롤)에 맡깁니다.
    if (url.hash && url.pathname === location.pathname && url.search === location.search) return;
    e.preventDefault();
    if (url.pathname + url.search === location.pathname + location.search && !url.hash) {
      render();
      return;
    }
    navigate(url.pathname + url.search);
  });

  return {
    start: render,
    navigate,
    reload: render,
    setLeaveGuard(fn) { leaveGuard = fn; },
  };
}
