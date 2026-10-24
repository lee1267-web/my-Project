// Firebase 설정(.env)이 비어 있을 때 보여주는 안내 화면
import { h, setTitle } from '../utils/dom.js';
import { missingConfigKeys } from '../services/config.js';

export function render(container) {
  setTitle('Firebase 설정 필요');
  container.append(
    h('section', { class: 'state-page container', 'data-error-kind': 'config' },
      h('div', { class: 'state-icon', 'aria-hidden': 'true' }, '⚙️'),
      h('h1', { class: 'state-title' }, 'Firebase 설정이 필요해요'),
      h('p', { class: 'state-message' }, '사이트가 데이터베이스(Firebase)에 연결할 설정값을 찾지 못했어요. 사이트 관리자라면 아래 항목을 확인해 주세요.'),
      h('div', { class: 'card config-help' },
        h('h2', {}, '비어 있는 설정'),
        h('ul', { class: 'code-list' }, missingConfigKeys.map((k) => h('li', {}, h('code', {}, k)))),
        h('ol', {},
          h('li', {}, 'quiz-platform 폴더의 ', h('code', {}, '.env.example'), ' 을 복사해 ', h('code', {}, '.env'), ' 파일을 만드세요.'),
          h('li', {}, 'Firebase 콘솔 > 프로젝트 설정 > 내 앱 에서 값을 복사해 붙여넣으세요.'),
          h('li', {}, '개발 서버를 껐다가 다시 켜세요. (', h('code', {}, 'npm run dev'), ')'),
        ),
        h('p', { class: 'muted' }, 'Firebase 없이 화면만 체험하려면 ', h('code', {}, 'npm run dev:demo'), ' 로 데모 모드를 실행하세요. (데모 모드 데이터는 이 브라우저에만 저장됩니다)'),
      ),
    ),
  );
  return null;
}
