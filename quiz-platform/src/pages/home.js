// 홈: 서비스 소개 + 공개 퀴즈 둘러보기(검색 / 카테고리 / 정렬 / 더 보기)
import { h, clear, setTitle } from '../utils/dom.js';
import { CATEGORIES, CATEGORY_KEYS } from '../utils/constants.js';
import { listPublicQuizzes } from '../services/quizService.js';
import { quizCard, skeletonCards } from '../components/quizCard.js';
import { toAppError } from '../utils/errors.js';

export async function render(container, { query }) {
  setTitle('');
  const state = {
    search: (query.q || '').slice(0, 50),
    category: CATEGORY_KEYS.includes(query.cat) ? query.cat : '',
    sort: query.sort === 'popular' ? 'popular' : 'latest',
    cursor: null,
    loading: false,
    requestId: 0,
  };

  // ── 소개 영역 ──
  const hero = h('section', { class: 'hero' },
    h('div', { class: 'container hero-inner' },
      h('div', { class: 'hero-text' },
        h('h1', { class: 'hero-title' }, '퀴즈를 만들고,', h('br'), '링크 하나로 함께 풀어요'),
        h('p', { class: 'hero-sub' }, '회원가입 없이 바로 퀴즈를 만들 수 있어요. 완성된 퀴즈의 링크를 친구에게 보내면 누구나 휴대폰이나 컴퓨터에서 바로 풀 수 있습니다.'),
        h('div', { class: 'hero-actions' },
          h('a', { href: '/create', class: 'btn btn-primary btn-lg' }, '퀴즈 만들기'),
          h('a', { href: '#explore', class: 'btn btn-ghost btn-lg' }, '퀴즈 둘러보기'),
        ),
      ),
      h('ol', { class: 'steps', 'aria-label': '이용 방법' },
        step('1', '만들기', '제목과 카테고리를 정하고 주관식·객관식 문제를 추가해요.'),
        step('2', '공유하기', '저장하면 퀴즈마다 고유 링크가 생겨요. 링크를 복사해 보내세요.'),
        step('3', '함께 풀기', '링크를 받은 사람은 바로 풀고 점수와 정답을 확인해요.'),
      ),
    ),
  );

  // ── 검색/필터 영역 ──
  const searchInput = h('input', {
    type: 'search', id: 'search', class: 'input', placeholder: '퀴즈 제목으로 검색 (예: 한국사)', value: state.search,
    maxlength: '50', autocomplete: 'off', enterkeyhint: 'search',
  });
  const searchForm = h('form', { class: 'search-form', role: 'search' },
    h('label', { for: 'search', class: 'sr-only' }, '퀴즈 검색'),
    searchInput,
    h('button', { type: 'submit', class: 'btn btn-primary' }, '검색'),
  );
  searchForm.addEventListener('submit', (e) => {
    e.preventDefault();
    state.search = searchInput.value.trim();
    reload();
  });

  const chipList = h('div', { class: 'chips', role: 'group', 'aria-label': '카테고리' });
  const makeChip = (key, label) => {
    const chip = h('button', { type: 'button', class: 'chip', 'aria-pressed': String(state.category === key), dataset: { key } }, label);
    chip.addEventListener('click', () => {
      state.category = key;
      chipList.querySelectorAll('.chip').forEach((c) => c.setAttribute('aria-pressed', String(c.dataset.key === key)));
      reload();
    });
    return chip;
  };
  chipList.append(makeChip('', '전체'), ...CATEGORIES.map((c) => makeChip(c.key, `${c.emoji} ${c.label}`)));

  const sortSelect = h('select', { id: 'sort', class: 'select' },
    h('option', { value: 'latest', selected: state.sort === 'latest' }, '최신순'),
    h('option', { value: 'popular', selected: state.sort === 'popular' }, '인기순 (플레이 수)'),
  );
  sortSelect.addEventListener('change', () => {
    state.sort = sortSelect.value;
    reload();
  });

  const summary = h('p', { class: 'list-summary', 'aria-live': 'polite' });
  const grid = h('ul', { class: 'quiz-grid', 'aria-busy': 'false' });
  const moreBtn = h('button', { type: 'button', class: 'btn btn-ghost btn-block more-btn', hidden: true }, '더 보기');
  moreBtn.addEventListener('click', () => load(false));
  const stateBox = h('div', { class: 'list-state' });

  const explore = h('section', { id: 'explore', class: 'container explore', 'aria-labelledby': 'explore-title' },
    h('div', { class: 'explore-head' },
      h('h2', { id: 'explore-title', class: 'section-title' }, '공개 퀴즈 둘러보기'),
      h('div', { class: 'sort-box' }, h('label', { for: 'sort', class: 'sr-only' }, '정렬'), sortSelect),
    ),
    searchForm,
    chipList,
    summary,
    grid,
    stateBox,
    moreBtn,
  );

  container.append(hero, explore);

  function syncUrl() {
    const params = new URLSearchParams();
    if (state.search) params.set('q', state.search);
    if (state.category) params.set('cat', state.category);
    if (state.sort !== 'latest') params.set('sort', state.sort);
    const qs = params.toString();
    history.replaceState(null, '', qs ? `/?${qs}` : '/');
  }

  function reload() {
    syncUrl();
    load(true);
  }

  async function load(reset) {
    const id = ++state.requestId;
    if (reset) {
      state.cursor = null;
      clear(grid).append(...skeletonCards());
      clear(stateBox);
      summary.textContent = '퀴즈를 불러오는 중...';
    }
    moreBtn.disabled = true;
    moreBtn.textContent = '불러오는 중...';
    grid.setAttribute('aria-busy', 'true');
    try {
      const res = await listPublicQuizzes({ category: state.category, search: state.search, sort: state.sort, cursor: state.cursor });
      if (id !== state.requestId) return; // 더 최근 요청이 있으면 무시
      if (reset) clear(grid);
      grid.append(...res.items.map(quizCard));
      state.cursor = res.cursor;
      moreBtn.hidden = !res.hasMore;
      const count = grid.children.length;
      summary.textContent = count ? `퀴즈 ${count}개${res.hasMore ? ' 이상' : ''}` : '';
      if (count === 0) showEmpty();
    } catch (err) {
      if (id !== state.requestId) return;
      if (reset) clear(grid);
      summary.textContent = '';
      showError(toAppError(err));
    } finally {
      if (id === state.requestId) {
        grid.setAttribute('aria-busy', 'false');
        moreBtn.disabled = false;
        moreBtn.textContent = '더 보기';
      }
    }
  }

  function showEmpty() {
    const filtered = state.search || state.category;
    clear(stateBox).append(
      h('div', { class: 'empty-state' },
        h('div', { class: 'state-icon', 'aria-hidden': 'true' }, filtered ? '🔎' : '📝'),
        h('h3', {}, filtered ? '조건에 맞는 퀴즈가 없어요' : '아직 공개된 퀴즈가 없어요'),
        h('p', {}, filtered
          ? '검색어나 카테고리를 바꿔 보세요. 검색은 제목 단어의 앞부분으로 찾습니다. (예: "한국사" → "한국" O, "국사" X)'
          : '첫 번째 퀴즈를 만들어 친구들과 공유해 보세요!'),
        filtered
          ? h('button', { type: 'button', class: 'btn btn-ghost', onclick: resetFilters }, '검색 조건 초기화')
          : h('a', { href: '/create', class: 'btn btn-primary' }, '퀴즈 만들기'),
      ),
    );
  }

  function showError(err) {
    clear(stateBox).append(
      h('div', { class: 'empty-state error-state', role: 'alert' },
        h('div', { class: 'state-icon', 'aria-hidden': 'true' }, '⚠️'),
        h('h3', {}, '퀴즈 목록을 불러오지 못했어요'),
        h('p', {}, err.message),
        h('button', { type: 'button', class: 'btn btn-primary', onclick: () => load(true) }, '다시 시도'),
      ),
    );
  }

  function resetFilters() {
    state.search = '';
    state.category = '';
    searchInput.value = '';
    chipList.querySelectorAll('.chip').forEach((c) => c.setAttribute('aria-pressed', String(c.dataset.key === '')));
    reload();
  }

  load(true);
}

function step(num, title, text) {
  return h('li', { class: 'step' },
    h('span', { class: 'step-num', 'aria-hidden': 'true' }, num),
    h('div', {}, h('strong', {}, title), h('p', {}, text)),
  );
}
