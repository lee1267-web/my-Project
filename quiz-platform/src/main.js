// 앱 시작점: 헤더를 그리고, 주소에 맞는 페이지를 보여줍니다.
import './styles/main.css';
import { createRouter } from './utils/router.js';
import { renderHeader, updateActiveNav } from './components/header.js';
import { renderModeBanner } from './components/modeBanner.js';
import { renderErrorView } from './components/errorView.js';
import { renderCreateFab, setCreateFabVisible } from './components/createFab.js';
import { clear, setTitle } from './utils/dom.js';
import { IS_CONFIG_OK } from './services/config.js';
import { toAppError } from './utils/errors.js';

import * as homePage from './pages/home.js';
import * as editorPage from './pages/editor.js';
import * as playPage from './pages/play.js';
import * as resultPage from './pages/result.js';
import * as myQuizzesPage from './pages/myQuizzes.js';
import * as notFoundPage from './pages/notFound.js';
import * as configErrorPage from './pages/configError.js';

const routes = [
  { path: '/', page: homePage, nav: 'home' },
  { path: '/create', page: editorPage, nav: 'create', fab: false },
  { path: '/edit/:id', page: editorPage, nav: 'my', fab: false },
  { path: '/quiz/:id', page: playPage, nav: 'home', fab: false },
  { path: '/quiz/:id/result', page: resultPage, nav: 'home' },
  { path: '/my', page: myQuizzesPage, nav: 'my' },
];
const notFound = { path: '*', page: notFoundPage };

const main = document.getElementById('main');
renderHeader(document.getElementById('site-header'));
renderModeBanner(document.getElementById('mode-banner'));
if (IS_CONFIG_OK) renderCreateFab(document.getElementById('app'));

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
    const ctx = {
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
