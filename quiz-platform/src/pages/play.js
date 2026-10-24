// 퀴즈 풀기 화면 (/quiz/:id) — 공유 링크로 들어오는 곳입니다.
// 주소의 ID 로 DB 에서 퀴즈를 직접 조회하므로, 다른 브라우저·기기에서도 같은 퀴즈가 열립니다.
import { h, clear, setTitle, formatDate, appendChildren } from '../utils/dom.js';
import { categoryLabel } from '../utils/constants.js';
import { getPlayableQuiz, recordPlay } from '../services/quizService.js';
import { getCurrentUid } from '../services/auth.js';
import { isCorrect, SKIPPED } from '../utils/grading.js';
import { thumbnail } from '../components/thumbnail.js';
import { shareBox } from '../components/shareBox.js';
import { showToast } from '../components/toast.js';
import { savePlayState, loadPlayState, clearPlayState, saveResult, quizVersion } from '../utils/playStorage.js';

export async function render(container, ctx) {
  const id = ctx.params.id;
  container.append(h('div', { class: 'container page-loading' }, h('p', { class: 'loading-text' }, '퀴즈를 불러오는 중...')));
  const quiz = await getPlayableQuiz(id);
  const uid = await getCurrentUid();
  if (ctx.isStale()) return null;
  clear(container);
  setTitle(quiz.title);

  const isOwner = Boolean(uid && uid === quiz.ownerUid);
  const version = quizVersion(quiz);
  const total = quiz.questions.length;
  const root = h('div', { class: 'container play' });
  container.append(root);

  // 진행 상태: answers[i] = 사용자의 답 (건너뜀 = null), checked = 현재 문제 채점 여부
  let state = null;

  // 저장된 진행 상태 불러오기 (퀴즈가 수정됐으면 버림)
  const saved = loadPlayState(id);
  const resumable = saved && saved.version === version && saved.index < total;
  if (saved && !resumable) {
    clearPlayState(id);
    if (saved.version !== version) showToast('퀴즈가 수정되어 처음부터 다시 시작합니다.');
  }

  if (ctx.query.start === '1') {
    history.replaceState(null, '', `/quiz/${id}`);
    start(null);
  } else {
    renderIntro();
  }

  function renderIntro() {
    clear(root);
      appendChildren(root, [
      h('article', { class: 'card intro-card' },
        thumbnail(quiz, 'intro-thumb'),
        h('div', { class: 'intro-body' },
          h('div', { class: 'badges' },
            h('span', { class: 'badge badge-category' }, categoryLabel(quiz.category, quiz.subcategory)),
            quiz.isPublic ? null : h('span', { class: 'badge badge-private' }, '🔒 비공개'),
            isOwner ? h('span', { class: 'badge badge-owner' }, '내 퀴즈') : null,
          ),
          h('h1', { class: 'intro-title' }, quiz.title),
          quiz.description ? h('p', { class: 'intro-desc' }, quiz.description) : null,
          // 태그를 누르면 그 태그로 검색
          quiz.tags.length ? h('p', { class: 'tag-list' }, quiz.tags.map((t) => h('a', { class: 'tag', href: `/?q=${encodeURIComponent(t)}` }, `#${t}`))) : null,
          h('p', { class: 'card-meta' },
            h('span', {}, `문제 ${total}개`),
            h('span', {}, `플레이 ${quiz.playCount.toLocaleString('ko-KR')}회`),
            quiz.updatedAt ? h('span', {}, `${formatDate(quiz.updatedAt)} 업데이트`) : null,
          ),
          h('div', { class: 'intro-actions' },
            resumable
              ? [
                h('button', { type: 'button', class: 'btn btn-primary btn-lg', onclick: () => start(saved) }, `이어서 풀기 (${saved.index + 1}/${total})`),
                h('button', { type: 'button', class: 'btn btn-ghost btn-lg', onclick: () => start(null) }, '처음부터'),
              ]
              : h('button', { type: 'button', class: 'btn btn-primary btn-lg', onclick: () => start(null) }, '퀴즈 시작하기'),
            isOwner ? h('a', { href: `/edit/${quiz.id}`, class: 'btn btn-ghost btn-lg' }, '수정하기') : null,
          ),
        ),
      ),
      ctx.query.saved === '1'
        ? h('div', { class: 'notice notice-success', role: 'status' }, '✅ 저장 완료! 아래 링크를 복사해서 친구에게 보내 보세요.')
        : null,
      shareBox(quiz),
    ]);
    if (ctx.query.saved === '1') history.replaceState(null, '', `/quiz/${id}`);
  }

  function start(fromSaved) {
    state = fromSaved
      ? { index: fromSaved.index, answers: fromSaved.answers, checked: fromSaved.checked }
      : { index: 0, answers: [], checked: false };
    if (!fromSaved) clearPlayState(id);
    renderQuestion();
  }

  function persist() {
    savePlayState(id, { version, index: state.index, answers: state.answers, checked: state.checked });
  }

  function renderQuestion() {
    clear(root);
    const i = state.index;
    const q = quiz.questions[i];
    const answered = state.checked;
    const percent = Math.round(((i + (answered ? 1 : 0)) / total) * 100);

    const progress = h('div', { class: 'progress-wrap' },
      h('div', { class: 'progress-top' },
        h('span', { class: 'progress-label' }, `${i + 1} / ${total}`),
        h('span', { class: 'muted' }, quiz.title),
      ),
      h('div', { class: 'progress', role: 'progressbar', 'aria-label': '진행률', 'aria-valuemin': '0', 'aria-valuemax': '100', 'aria-valuenow': String(percent) },
        h('div', { class: 'progress-bar', style: `width:${percent}%` }),
      ),
    );

    const feedback = h('div', { class: 'feedback', 'aria-live': 'assertive' });
    let getAnswer;
    let inputArea;

    if (q.type === 'choice') {
      const name = `opt-${i}`;
      inputArea = h('fieldset', { class: 'choices' }, h('legend', { class: 'sr-only' }, '보기 선택'));
      q.options.forEach((opt, oi) => {
        const radio = h('input', { type: 'radio', name, value: opt, id: `${name}-${oi}`, class: 'choice-radio', disabled: answered });
        if (answered && state.answers[i] === opt) radio.checked = true;
        const label = h('label', { for: radio.id, class: 'choice' }, radio, h('span', { class: 'choice-key', 'aria-hidden': 'true' }, String(oi + 1)), h('span', { class: 'choice-text' }, opt));
        if (answered) {
          if (opt === q.answer) label.classList.add('is-correct');
          else if (state.answers[i] === opt) label.classList.add('is-wrong');
        }
        inputArea.append(label);
      });
      getAnswer = () => inputArea.querySelector('input:checked')?.value ?? '';
    } else {
      const input = h('input', {
        type: 'text', class: 'input input-lg', id: `answer-${i}`, placeholder: '정답을 입력하세요', autocomplete: 'off',
        autocapitalize: 'off', spellcheck: 'false', enterkeyhint: 'done', maxlength: '120', disabled: answered,
      });
      if (answered && state.answers[i] !== SKIPPED) input.value = state.answers[i];
      inputArea = h('div', { class: 'text-answer' }, h('label', { for: input.id, class: 'sr-only' }, '정답 입력'), input);
      getAnswer = () => input.value;
    }

    const checkBtn = h('button', { type: 'submit', class: 'btn btn-primary btn-lg' }, '정답 확인');
    const skipBtn = h('button', { type: 'button', class: 'btn btn-ghost btn-lg', onclick: () => grade(SKIPPED) }, '건너뛰기');
    const isLast = i === total - 1;
    const nextBtn = h('button', { type: 'button', class: 'btn btn-primary btn-lg', onclick: next }, isLast ? '결과 보기' : '다음 문제 →');

    const formEl = h('form', { class: 'card question-play', novalidate: true },
      h('p', { class: 'eyebrow' }, `문제 ${i + 1}`),
      h('h1', { class: 'play-question', tabindex: '-1' }, q.question),
      q.imageUrl ? h('img', { src: q.imageUrl, alt: `${i + 1}번 문제 이미지`, class: 'play-image' }) : null,
      inputArea,
      feedback,
      h('div', { class: 'play-actions' }, answered ? nextBtn : [skipBtn, checkBtn]),
    );
    formEl.addEventListener('submit', (e) => {
      e.preventDefault();
      if (state.checked) return next();
      const value = getAnswer();
      if (!String(value).trim()) {
        feedback.className = 'feedback feedback-warn';
        feedback.textContent = q.type === 'choice' ? '보기를 하나 골라 주세요. 모르면 "건너뛰기"를 누르세요.' : '답을 입력해 주세요. 모르면 "건너뛰기"를 누르세요.';
        return;
      }
      grade(String(value).trim());
    });

    root.append(progress, formEl);
    if (answered) {
      showFeedback(feedback, q, state.answers[i]);
      nextBtn.focus();
    } else {
      // 휴대폰에서 키보드가 갑자기 뜨지 않도록 주관식만 포커스
      (q.type === 'text' ? root.querySelector('.input') : root.querySelector('h1'))?.focus({ preventScroll: true });
    }
  }

  function grade(answer) {
    if (state.checked) return; // 같은 문제를 두 번 채점하지 않음
    state.answers[state.index] = answer;
    state.checked = true;
    persist();
    renderQuestion();
  }

  function next() {
    if (!state.checked) return;
    if (state.index >= total - 1) return finish();
    state.index += 1;
    state.checked = false;
    persist();
    renderQuestion();
    window.scrollTo({ top: 0 });
  }

  function finish() {
    // 빠진 답은 건너뜀(null)으로 채워 점수 계산이 항상 일관되게
    const answers = Array.from({ length: total }, (_, k) => (state.answers[k] === undefined ? SKIPPED : state.answers[k]));
    saveResult(id, { version, answers, finishedAt: new Date().toISOString() });
    clearPlayState(id);
    recordPlay(id);
    ctx.navigate(`/quiz/${id}/result`);
  }

  return null;
}

function showFeedback(el, q, answer) {
  const ok = isCorrect(q, answer);
  el.className = `feedback ${ok ? 'feedback-ok' : 'feedback-bad'}`;
  // appendChildren 은 null 을 건너뜁니다. (기본 append 는 null 을 "null" 글자로 찍음)
  appendChildren(clear(el), [
    h('strong', {}, ok ? '⭕ 정답입니다!' : answer === SKIPPED ? '⏭️ 건너뛰었어요' : '❌ 아쉬워요, 오답입니다'),
    ok ? null : h('span', {}, ` 정답: ${q.answer}`),
  ]);
}
