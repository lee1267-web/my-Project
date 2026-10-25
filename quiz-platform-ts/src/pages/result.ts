// 결과 화면 (/quiz/:id/result)
import { h, clear, setTitle } from '../utils/dom.ts';
import { getPlayableQuiz } from '../services/quizService.ts';
import { computeResult } from '../utils/grading.ts';
import { loadResult, clearResult, clearPlayState, quizVersion } from '../utils/playStorage.ts';
import { shareBox } from '../components/shareBox.ts';
import type { PageContext } from '../utils/router.ts';

function resultMessage(score: number): string {
  if (score === 100) return '완벽해요! 만점입니다 🎉';
  if (score >= 80) return '대단해요! 거의 다 맞혔어요 👏';
  if (score >= 50) return '좋아요! 절반 이상 맞혔어요 🙂';
  if (score > 0) return '조금 아쉬워요. 다시 도전해 볼까요? 💪';
  return '다음엔 더 잘할 수 있어요! 🍀';
}

export async function render(container: HTMLElement, ctx: PageContext): Promise<null> {
  const id = ctx.params.id ?? '';
  container.append(h('div', { class: 'container page-loading' }, h('p', { class: 'loading-text' }, '결과를 불러오는 중...')));
  const quiz = await getPlayableQuiz(id);
  if (ctx.isStale()) return null;
  clear(container);
  setTitle(`${quiz.title} 결과`);

  const saved = loadResult(id);
  const root = h('div', { class: 'container result' });
  container.append(root);

  const retry = () => {
    clearResult(id);
    clearPlayState(id);
    ctx.navigate(`/quiz/${id}?start=1`);
  };

  if (!saved || saved.version !== quizVersion(quiz) || saved.answers.length !== quiz.questions.length) {
    root.append(
      h('section', { class: 'state-page' },
        h('div', { class: 'state-icon', 'aria-hidden': 'true' }, '📋'),
        h('h1', { class: 'state-title' }, '표시할 결과가 없어요'),
        h('p', { class: 'state-message' }, saved
          ? '그 사이 퀴즈 내용이 수정되어 이전 결과를 보여줄 수 없어요. 다시 풀어 주세요.'
          : '결과는 퀴즈를 푼 브라우저 탭에서만 볼 수 있어요. 퀴즈를 풀면 여기에 점수와 정답이 표시됩니다.'),
        h('div', { class: 'state-actions' },
          h('button', { type: 'button', class: 'btn btn-primary', onclick: retry }, '퀴즈 풀기'),
          h('a', { href: '/', class: 'btn btn-ghost' }, '홈으로 가기'),
        ),
      ),
    );
    return null;
  }

  const r = computeResult(quiz.questions, saved.answers);
  root.append(
    h('section', { class: 'card score-card', 'aria-labelledby': 'score-title' },
      h('p', { class: 'eyebrow' }, quiz.title),
      h('h1', { id: 'score-title', class: 'score-title' }, resultMessage(r.score)),
      h('div', { class: 'score-ring', style: `--p:${r.score}`, role: 'img', 'aria-label': `100점 만점에 ${r.score}점` },
        h('span', { class: 'score-num' }, String(r.score)), h('span', { class: 'score-unit' }, '점'),
      ),
      h('dl', { class: 'stats' },
        stat('정답', `${r.correctCount}개`, 'ok'),
        stat('오답', `${r.wrongCount}개`, 'bad'),
        stat('정답률', `${r.accuracy}%`),
        stat('전체', `${r.total}문제`),
      ),
      r.skippedCount ? h('p', { class: 'muted' }, `건너뛴 ${r.skippedCount}문제는 오답으로 계산했어요.`) : null,
      h('div', { class: 'result-actions' },
        h('button', { type: 'button', class: 'btn btn-primary btn-lg', onclick: retry }, '다시 풀기'),
        h('a', { href: '/', class: 'btn btn-ghost btn-lg' }, '다른 퀴즈 풀기'),
        h('a', { href: '/', class: 'btn btn-text btn-lg' }, '홈으로'),
      ),
    ),
    shareBox(quiz, { title: '이 퀴즈 공유하기' }),
    h('section', { class: 'review', 'aria-labelledby': 'review-title' },
      h('h2', { id: 'review-title', class: 'section-title' }, '문제별 정답 확인'),
      h('ol', { class: 'review-list' },
        r.details.map((d, i) => h('li', { class: `review-item card ${d.correct ? 'is-correct' : 'is-wrong'}` },
          h('div', { class: 'review-head' },
            h('span', { class: 'review-mark', 'aria-hidden': 'true' }, d.correct ? '⭕' : '❌'),
            h('span', { class: 'sr-only' }, d.correct ? '정답' : '오답'),
            h('span', { class: 'review-num' }, `${i + 1}.`),
            h('p', { class: 'review-q' }, d.question.question),
          ),
          h('dl', { class: 'review-answers' },
            h('div', {}, h('dt', {}, '내 답'), h('dd', { class: d.skipped ? 'muted' : '' }, d.skipped ? '(건너뜀)' : d.userAnswer)),
            d.correct ? null : h('div', {}, h('dt', {}, '정답'), h('dd', { class: 'answer' }, d.question.answer)),
          ),
        )),
      ),
    ),
  );
  return null;
}

function stat(label: string, value: string, tone = ''): HTMLDivElement {
  return h('div', { class: `stat ${tone}` }, h('dt', {}, label), h('dd', {}, value));
}
