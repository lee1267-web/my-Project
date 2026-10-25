// 앱 시작점: 헤더를 그리고, 주소에 맞는 페이지를 보여줍니다.
import './styles/main.css';
import { createRouter, type PageContext, type PageModule, type RouteDef } from './utils/router.ts';
import { renderHeader, updateActiveNav } from './components/header.ts';
import { renderModeBanner } from './components/modeBanner.ts';
import { renderErrorView } from './components/errorView.ts';
import { renderCreateFab, setCreateFabVisible } from './components/createFab.ts';
import { clear, setTitle } from './utils/dom.ts';
import { IS_CONFIG_OK } from './services/config.ts';
import { toAppError } from './utils/errors.ts';

import * as homePage from './pages/home.ts';
import * as editorPage from './pages/editor.ts';
import * as playPage from './pages/play.ts';
import * as resultPage from './pages/result.ts';
import * as myQuizzesPage from './pages/myQuizzes.ts';
import * as notFoundPage from './pages/notFound.ts';
import * as configErrorPage from './pages/configError.ts';

interface AppRoute extends RouteDef {
  page: PageModule;
  nav?: string; // 위쪽 메뉴에서 강조할 항목
  fab?: boolean; // false 면 "직접 만들기" 버튼을 숨김
}

const routes: AppRoute[] = [
  { path: '/', page: homePage, nav: 'home' },
  { path: '/create', page: editorPage, nav: 'create', fab: false },
  { path: '/edit/:id', page: editorPage, nav: 'my', fab: false },
  { path: '/quiz/:id', page: playPage, nav: 'home', fab: false },
  { path: '/quiz/:id/result', page: resultPage, nav: 'home' },
  { path: '/my', page: myQuizzesPage, nav: 'my' },
];
const notFound: AppRoute = { path: '*', page: notFoundPage };

// index.html 에 반드시 있는 요소들
function byId(id: string): HTMLElement {
  const el = document.getElementById(id);
  if (!el) throw new Error(`#${id} 요소가 index.html 에 없습니다.`);
  return el;
}

const main = byId('main');
renderHeader(byId('site-header'));
renderModeBanner(byId('mode-banner'));
if (IS_CONFIG_OK) renderCreateFab(byId('app'));

const router = createRouter({
  routes,
  notFound,
  async onRender(route, params, query, isStale) {
    clear(main);
    setTitle('');
    updateActiveNav(route.nav);
    setCreateFabVisible(route.fab !== false);
    // Firebase 설정이 비어 있으면 모든 페이지 대신 설정 안내를 보여줍니다.
    const page = IS_CONFIG_OK ? route.page : configErrorPage;
    const ctx: PageContext = {
      params,
      query,
      navigate: router.navigate,
      reload: router.reload,
      setLeaveGuard: router.setLeaveGuard,
      isStale,
    };
    try {
      const cleanup = await page.render(main, ctx);
      if (!isStale()) focusHeading();
      return cleanup;
    } catch (err) {
      if (isStale()) return null;
      clear(main);
      renderErrorView(main, toAppError(err), { onRetry: router.reload });
      return null;
    }
  },
});

// 페이지가 바뀌면 화면 읽기 프로그램이 새 제목을 읽도록 포커스를 옮깁니다.
function focusHeading() {
  const heading = main.querySelector('h1');
  if (heading) {
    heading.setAttribute('tabindex', '-1');
    heading.focus({ preventScroll: true });
  }
}

// 예상하지 못한 오류도 콘솔에만 남지 않도록 알림을 보여줍니다.
window.addEventListener('unhandledrejection', (e) => {
  console.error(e.reason);
});

router.start();
