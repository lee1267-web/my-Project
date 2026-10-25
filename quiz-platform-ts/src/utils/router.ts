// 아주 작은 History API 라우터입니다.
// 주소 예: /, /create, /edit/:id, /quiz/:id, /quiz/:id/result, /my

export type Params = Record<string, string>;
export type Query = Record<string, string>;
// 페이지가 돌려주는 정리 함수 (다른 페이지로 갈 때 호출)
export type Cleanup = (() => void) | null | undefined | void;

// 각 페이지의 render(container, ctx) 가 받는 도구 모음
export interface PageContext {
  params: Params;
  query: Query;
  navigate: (to: string, opts?: { replace?: boolean }) => boolean;
  reload: () => Promise<void>;
  setLeaveGuard: (fn: (() => boolean) | null) => void;
  isStale: () => boolean; // 그 사이 다른 페이지로 이동했으면 true
}

export interface PageModule {
  render(container: HTMLElement, ctx: PageContext): Cleanup | Promise<Cleanup>;
}

export interface RouteDef {
  path: string;
}

interface Compiled {
  regex: RegExp;
  keys: string[];
}

// "/quiz/:id" 같은 패턴을 정규식으로 바꿉니다.
export function compilePattern(pattern: string): Compiled {
  const keys: string[] = [];
  const source = pattern
    .replace(/\/+$/, '')
    .replace(/:([A-Za-z]+)/g, (_, key: string) => {
      keys.push(key);
      return '([^/]+)';
    });
  return { regex: new RegExp(`^${source || ''}/?$`), keys };
}

const compiled = new WeakMap<RouteDef, Compiled>();

export function matchRoute<R extends RouteDef>(routes: R[], pathname: string): { route: R; params: Params } | null {
  for (const route of routes) {
    let c = compiled.get(route);
    if (!c) {
      c = compilePattern(route.path);
      compiled.set(route, c);
    }
    const m = pathname.match(c.regex);
    if (m) {
      const params: Params = {};
      c.keys.forEach((k, i) => {
        const value = m[i + 1] ?? '';
        try {
          params[k] = decodeURIComponent(value);
        } catch {
          params[k] = value;
        }
      });
      return { route, params };
    }
  }
  return null;
}

export interface RouterOptions<R extends RouteDef> {
  routes: R[];
  notFound: R;
  onRender: (route: R, params: Params, query: Query, isStale: () => boolean) => Promise<Cleanup>;
}

export function createRouter<R extends RouteDef>({ routes, notFound, onRender }: RouterOptions<R>) {
  let cleanup: Cleanup = null;
  let leaveGuard: (() => boolean) | null = null; // 작성 중인 내용이 있을 때 떠나기 전에 확인
  let currentPath = location.pathname + location.search;
  let renderToken = 0;

  async function render(): Promise<void> {
    const token = ++renderToken;
    if (typeof cleanup === 'function') {
      try { cleanup(); } catch (e) { console.error(e); }
    }
    cleanup = null;
    leaveGuard = null;
    const found = matchRoute(routes, location.pathname);
    const route = found ? found.route : notFound;
    const params: Params = found ? found.params : {};
    const query = Object.fromEntries(new URLSearchParams(location.search));
    const result = await onRender(route, params, query, () => token !== renderToken);
    if (token === renderToken) cleanup = result;
  }

  function navigate(to: string, { replace = false }: { replace?: boolean } = {}): boolean {
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
    const a = (e.target as Element | null)?.closest?.('a[href]') as HTMLAnchorElement | null;
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
    setLeaveGuard(fn: (() => boolean) | null) { leaveGuard = fn; },
  };
}
