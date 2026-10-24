// 내 퀴즈 (/my): 이 브라우저의 익명 사용자가 만든 퀴즈 목록
import { h, clear, setTitle, formatDate } from '../utils/dom.js';
import { listMyQuizzes, deleteQuiz, getSampleList, addSampleQuizzes } from '../services/quizService.js';
import { IS_DEMO } from '../services/config.js';
import { thumbnail } from '../components/thumbnail.js';
import { confirmDialog } from '../components/modal.js';
import { showToast } from '../components/toast.js';
import { shareUrlFor } from '../components/shareBox.js';
import { copyText } from '../utils/clipboard.js';
import { getCategory } from '../utils/constants.js';
import { toAppError } from '../utils/errors.js';

export async function render(container, ctx) {
  setTitle('내 퀴즈');
  container.append(h('div', { class: 'container page-loading' }, h('p', { class: 'loading-text' }, '내 퀴즈를 불러오는 중...')));
  const { uid, items } = await listMyQuizzes();
  if (ctx.isStale()) return null;
  clear(container);

  const list = h('ul', { class: 'my-list' });
  const root = h('div', { class: 'container my' },
    h('div', { class: 'page-head row' },
      h('div', {},
        h('h1', { class: 'page-title' }, '내 퀴즈'),
        h('p', { class: 'muted' }, `${items.length}개의 퀴즈`),
      ),
      h('a', { href: '/create', class: 'btn btn-primary' }, '+ 새 퀴즈 만들기'),
    ),
    h('div', { class: 'notice notice-warn', role: 'note' },
      h('strong', {}, '꼭 읽어 주세요 · '),
      IS_DEMO
        ? '데모 모드에서는 퀴즈가 이 브라우저에만 저장됩니다. 브라우저 데이터를 지우면 사라집니다.'
        : '퀴즈공방은 회원가입 없이 "익명 로그인"으로 이 브라우저를 구분합니다. 브라우저 데이터(쿠키·사이트 데이터)를 지우거나, 다른 브라우저·기기를 쓰면 다른 사용자로 인식되어 이 목록의 퀴즈를 수정·삭제할 수 없게 됩니다. 아직 계정 연결/복구 기능이 없어 데이터 복구를 보장할 수 없습니다. (공개 퀴즈의 공유 링크는 계속 동작합니다)',
      h('p', { class: 'uid-line' }, `내 사용자 ID: ${uid}`),
    ),
    list,
  );
  container.append(root);

  function renderList() {
    clear(list);
    if (!items.length) {
      list.append(h('li', { class: 'empty-state' },
        h('div', { class: 'state-icon', 'aria-hidden': 'true' }, '🧺'),
        h('h2', {}, '아직 만든 퀴즈가 없어요'),
        h('p', {}, '첫 퀴즈를 만들어 보거나, 아래에서 샘플 퀴즈를 추가해 보세요.'),
        h('a', { href: '/create', class: 'btn btn-primary' }, '퀴즈 만들기'),
      ));
      return;
    }
    items.forEach((quiz) => list.append(item(quiz)));
  }

  function item(quiz) {
    const cat = getCategory(quiz.category);
    const delBtn = h('button', { type: 'button', class: 'btn btn-danger-ghost btn-sm' }, '삭제');
    delBtn.addEventListener('click', async () => {
      const ok = await confirmDialog({
        title: '퀴즈 삭제',
        message: `"${quiz.title}" 퀴즈를 삭제할까요? 삭제하면 되돌릴 수 없고, 공유한 링크도 더 이상 열리지 않습니다.`,
        confirmText: '삭제하기', danger: true,
      });
      if (!ok) return;
      delBtn.disabled = true;
      delBtn.textContent = '삭제 중...';
      try {
        await deleteQuiz(quiz);
        items.splice(items.indexOf(quiz), 1);
        renderList();
        root.querySelector('.page-head .muted').textContent = `${items.length}개의 퀴즈`;
        showToast('퀴즈를 삭제했어요.', 'success');
        root.querySelector('h1')?.focus();
      } catch (err) {
        showToast(`삭제하지 못했어요: ${toAppError(err).message}`, 'error', 5000);
        delBtn.disabled = false;
        delBtn.textContent = '삭제';
      }
    });
    const copyBtn = h('button', {
      type: 'button', class: 'btn btn-ghost btn-sm',
      async onclick() {
        const ok = await copyText(shareUrlFor(quiz.id));
        if (ok) showToast(quiz.isPublic ? '공유 링크를 복사했어요.' : '링크를 복사했어요. (비공개라 다른 사람은 열 수 없어요)', 'success');
        else window.prompt('아래 링크를 복사하세요.', shareUrlFor(quiz.id));
      },
    }, '링크 복사');

    return h('li', { class: 'my-item card' },
      thumbnail(quiz, 'my-thumb'),
      h('div', { class: 'my-info' },
        h('div', { class: 'badges' },
          h('span', { class: `badge ${quiz.isPublic ? 'badge-public' : 'badge-private'}` }, quiz.isPublic ? '🌐 공개' : '🔒 비공개'),
          h('span', { class: 'badge badge-category' }, `${cat.emoji} ${cat.label}`),
        ),
        h('h2', { class: 'my-title' }, h('a', { href: `/quiz/${quiz.id}` }, quiz.title)),
        h('p', { class: 'card-meta' },
          h('span', {}, `문제 ${quiz.questionCount}개`),
          h('span', {}, `플레이 ${quiz.playCount}회`),
          h('span', {}, `${formatDate(quiz.updatedAt)} 수정`),
        ),
      ),
      h('div', { class: 'my-actions' },
        h('a', { href: `/quiz/${quiz.id}`, class: 'btn btn-ghost btn-sm' }, '풀기'),
        h('a', { href: `/edit/${quiz.id}`, class: 'btn btn-ghost btn-sm' }, '수정'),
        copyBtn,
        delBtn,
      ),
    );
  }

  renderList();
  if (!IS_DEMO) root.append(await sampleSection(ctx));
  return null;
}

// 샘플 퀴즈를 내 퀴즈로 복사해 추가하는 영역 (Firebase 모드)
async function sampleSection(ctx) {
  const samples = await getSampleList();
  const checks = samples.map((s) => h('input', { type: 'checkbox', value: s.key, id: `sample-${s.key}` }));
  const btn = h('button', { type: 'button', class: 'btn btn-primary' }, '선택한 샘플 추가');
  const allBtn = h('button', {
    type: 'button', class: 'btn btn-ghost btn-sm',
    onclick: () => {
      const all = checks.every((c) => c.checked);
      checks.forEach((c) => { c.checked = !all; });
    },
  }, '전체 선택/해제');
  btn.addEventListener('click', async () => {
    const keys = checks.filter((c) => c.checked).map((c) => c.value);
    if (!keys.length) return showToast('추가할 샘플을 골라 주세요.', 'error');
    btn.disabled = true;
    try {
      await addSampleQuizzes(keys, (msg) => { btn.textContent = msg; });
      showToast(`샘플 퀴즈 ${keys.length}개를 공개 퀴즈로 추가했어요.`, 'success');
      ctx.reload();
    } catch (err) {
      showToast(`추가하지 못했어요: ${toAppError(err).message}`, 'error', 5000);
      btn.disabled = false;
      btn.textContent = '선택한 샘플 추가';
    }
  });
  return h('details', { class: 'card sample-box' },
    h('summary', {}, `샘플 퀴즈 추가하기 (${samples.length}세트 · 세트당 50문제)`),
    h('p', { class: 'muted' }, '선택한 샘플이 내 이름(익명 ID)으로 저장되고 공개됩니다. 저장 후 자유롭게 수정·삭제할 수 있어요.'),
    allBtn,
    h('ul', { class: 'sample-list' },
      samples.map((s, i) => h('li', {}, h('label', { for: checks[i].id, class: 'check-label' }, checks[i], ` ${getCategory(s.category).emoji} ${s.title} (${s.count}문제)`))),
    ),
    btn,
  );
}
