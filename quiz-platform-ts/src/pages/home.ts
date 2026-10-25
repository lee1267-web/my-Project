// 홈: 서비스 소개 + 공개 퀴즈 둘러보기(검색 / 카테고리 / 정렬 / 더 보기)
import { h, clear, setTitle } from '../utils/dom.ts';
import { CATEGORIES, CATEGORY_KEYS, getCategory, getSubcategory } from '../utils/constants.ts';
import { listPublicQuizzes } from '../services/quizService.ts';
import { findCategoryForTerm } from '../utils/search.ts';
import { quizCard, skeletonCards } from '../components/quizCard.ts';
import { toAppError, type AppError } from '../utils/errors.ts';
import type { PageContext } from '../utils/router.ts';
import type { SortKey } from '../types.ts';

export async function render(container: HTMLElement, { query }: PageContext): Promise<void> {
  setTitle('');
  const cat = query.cat ?? '';
  const state = {
    search: (query.q || '').slice(0, 50),
    category: CATEGORY_KEYS.includes(cat) ? cat : '',
    sub: '',
    sort: (query.sort === 'popular' ? 'popular' : 'latest') as SortKey,
    cursor: null as unknown,
    loading: false,
    requestId: 0,
  };

  if (getSubcategory(state.category, query.sub)) state.sub = query.sub;

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
    type: 'search', id: 'search', class: 'input', placeholder: '제목·장르·태그로 검색 (예: 발라드, 게임, 노래)', value: state.search,
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

  // 추천 검색어: 누르면 바로 검색 (분류 이름·별칭으로도 찾을 수 있다는 것을 알려 줌)
  const SUGGESTIONS = ['노래', '발라드', '게임', '아이돌', '한국사', '축구', '애니', '영어'];
  const suggestBox = h('p', { class: 'suggest' },
    h('span', { class: 'muted' }, '추천 검색어 '),
    SUGGESTIONS.map((word) => h('button', {
      type: 'button', class: 'suggest-chip',
      onclick: () => {
        searchInput.value = word;
        state.search = word;
        reload();
      },
    }, `#${word}`)),
  );

  const chipList = h('div', { class: 'chips', role: 'group', 'aria-label': '카테고리' });
  const subList = h('div', { class: 'chips chips-sub', role: 'group', 'aria-label': '세부 분류' });
  const makeChip = (key: string, label: string) => {
    const chip = h('button', { type: 'button', class: 'chip', 'aria-pressed': String(state.category === key), dataset: { key } }, label);
    chip.addEventListener('click', () => {
      state.category = key;
      state.sub = '';
      chipList.querySelectorAll<HTMLElement>('.chip').forEach((c) => c.setAttribute('aria-pressed', String(c.dataset.key === key)));
      renderSubChips();
      reload();
    });
    return chip;
  };
  chipList.append(makeChip('', '전체'), ...CATEGORIES.map((c) => makeChip(c.key, `${c.emoji} ${c.label}`)));

  // 카테고리를 고르면 그 아래 세부 분류(예: 음악 > 발라드) 버튼을 보여줍니다.
  function renderSubChips() {
    clear(subList);
    subList.hidden = !state.category;
    if (!state.category) return;
    const cat = getCategory(state.category);
    const makeSub = (key: string, label: string) => {
      const chip = h('button', { type: 'button', class: 'chip chip-sm', 'aria-pressed': String(state.sub === key), dataset: { sub: key } }, label);
      chip.addEventListener('click', () => {
        state.sub = key;
        subList.querySelectorAll<HTMLElement>('.chip').forEach((c) => c.setAttribute('aria-pressed', String(c.dataset.sub === key)));
        reload();
      });
      return chip;
    };
    subList.append(makeSub('', `${cat.label} 전체`), ...cat.subs.map((x) => makeSub(x.key, x.label)));
  }
  renderSubChips();

  const sortSelect = h('select', { id: 'sort', class: 'select' },
    h('option', { value: 'latest', selected: state.sort === 'latest' }, '최신순'),
    h('option', { value: 'popular', selected: state.sort === 'popular' }, '인기순 (플레이 수)'),
  );
  sortSelect.addEventListener('change', () => {
    state.sort = sortSelect.value === 'popular' ? 'popular' : 'latest';
    reload();
  });

  const summary = h('p', { class: 'list-summary', 'aria-live': 'polite' });
  // "게임"처럼 분류 이름으로 검색했을 때: 제목에 그 단어만 들어간 다른 분류 퀴즈도 나오므로
  // 정확히 그 분류만 보는 버튼을 제공합니다.
  const categoryHint = h('div', { class: 'category-hint', hidden: true });
  function renderCategoryHint() {
    clear(categoryHint);
    const found = state.search ? findCategoryForTerm(state.search) : null;
    const already = found && state.category === found.category && (state.sub || '') === found.subcategory;
    categoryHint.hidden = !found || Boolean(already);
    if (!found || already) return;
    categoryHint.append(
      h('span', {}, `"${state.search}" 분류의 퀴즈만 볼까요?`),
      h('button', {
        type: 'button', class: 'btn btn-primary btn-sm',
        onclick: () => {
          state.category = found.category;
          state.sub = found.subcategory;
          state.search = '';
          searchInput.value = '';
          chipList.querySelectorAll<HTMLElement>('.chip').forEach((c) => c.setAttribute('aria-pressed', String(c.dataset.key === found.category)));
          renderSubChips();
          reload();
        },
      }, `${found.label}만 보기`),
    );
  }
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
    suggestBox,
    chipList,
    subList,
    categoryHint,
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
    if (state.sub) params.set('sub', state.sub);
    if (state.sort !== 'latest') params.set('sort', state.sort);
    const qs = params.toString();
    history.replaceState(null, '', qs ? `/?${qs}` : '/');
  }

  function reload() {
    syncUrl();
    renderCategoryHint();
    load(true);
  }

  async function load(reset: boolean): Promise<void> {
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
      const res = await listPublicQuizzes({ category: state.category, subcategory: state.sub, search: state.search, sort: state.sort, cursor: state.cursor });
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
    const where = [state.category && getCategory(state.category).label, getSubcategory(state.category, state.sub)?.label, state.search && `"${state.search}"`].filter(Boolean).join(' · ');
    clear(stateBox).append(
      h('div', { class: 'empty-state' },
        h('div', { class: 'state-icon', 'aria-hidden': 'true' }, filtered ? '🔎' : '📝'),
        h('h3', {}, filtered ? `${where} 퀴즈가 아직 없어요` : '아직 공개된 퀴즈가 없어요'),
        h('p', {}, filtered
          ? '첫 번째로 만들어 보는 건 어때요? 검색은 제목·분류·태그 단어의 앞부분으로 찾습니다. (예: "한국사" → "한국" O, "국사" X)'
          : '첫 번째 퀴즈를 만들어 친구들과 공유해 보세요!'),
        h('div', { class: 'state-actions' },
          h('a', { href: createLink(), class: 'btn btn-primary' }, '퀴즈 만들기'),
          filtered ? h('button', { type: 'button', class: 'btn btn-ghost', onclick: resetFilters }, '검색 조건 초기화') : null,
        ),
      ),
    );
  }

  function showError(err: AppError): void {
    clear(stateBox).append(
      h('div', { class: 'empty-state error-state', role: 'alert' },
        h('div', { class: 'state-icon', 'aria-hidden': 'true' }, '⚠️'),
        h('h3', {}, '퀴즈 목록을 불러오지 못했어요'),
        h('p', {}, err.message),
        h('button', { type: 'button', class: 'btn btn-primary', onclick: () => load(true) }, '다시 시도'),
      ),
    );
  }

  // 보고 있던 분류를 만들기 화면에 미리 채워 줍니다. (예: 음악 > 발라드)
  function createLink() {
    const p = new URLSearchParams();
    if (state.category) p.set('cat', state.category);
    if (state.sub) p.set('sub', state.sub);
    const qs = p.toString();
    return qs ? `/create?${qs}` : '/create';
  }

  function resetFilters() {
    state.search = '';
    state.category = '';
    state.sub = '';
    renderSubChips();
    searchInput.value = '';
    chipList.querySelectorAll<HTMLElement>('.chip').forEach((c) => c.setAttribute('aria-pressed', String(c.dataset.key === '')));
    reload();
  }

  renderCategoryHint();
  load(true);
}

function step(num: string, title: string, text: string): HTMLLIElement {
  return h('li', { class: 'step' },
    h('span', { class: 'step-num', 'aria-hidden': 'true' }, num),
    h('div', {}, h('strong', {}, title), h('p', {}, text)),
  );
}
