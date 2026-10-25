// 샘플 퀴즈 전체를 실제 브라우저에서 끝까지 풀어 보는 테스트 (데모 모드)
//  - 모든 문제를 정답으로 풀면 100점인지
//  - 주관식 "다른 인정 답안"으로도 정답 처리되는지 (첫 세트)
//  - 모든 문제를 틀리면 0점인지 (첫 세트)
import { loadPlaywright, assert, step, summary, watchErrors, playAll } from './helpers.mjs';
import { SAMPLE_QUIZZES } from '../../src/data/samples/index.ts';
import { isCorrect } from '../../src/utils/grading.ts';

const BASE = process.env.BASE_URL;
const { chromium } = loadPlaywright();

export async function run() {
  console.log(`\n[샘플 퀴즈 전체 풀이 E2E] ${SAMPLE_QUIZZES.length}세트`);
  const browser = await chromium.launch();
  const page = await (await browser.newContext()).newPage();
  const errors = [];
  watchErrors(page, errors);

  for (const s of SAMPLE_QUIZZES) {
    await step(`${s.title} — ${s.questions.length}문제 모두 정답 → 100점`, async () => {
      await page.goto(`${BASE}/quiz/${s.demoId}`);
      await playAll(page, s.questions.map((q) => q.answer));
      assert.equal((await page.locator('.score-num').textContent()).trim(), '100');
      assert.equal(await page.locator('.review-item.is-correct').count(), s.questions.length);
    });
  }

  // 그럴듯한 오답: 객관식은 정답이 아닌 보기, 주관식은 같은 세트의 다른 문제 정답 중 이 문제에서 인정되지 않는 것
  const wrongFor = (s, q, i) => {
    if (q.type === 'choice') return q.options.find((o) => o !== q.answer);
    const pool = s.questions.filter((_, k) => k !== i && _.type === 'text').map((x) => x.answer);
    return pool.find((a) => !isCorrect(q, a)) || '모르겠어요';
  };

  for (const s of SAMPLE_QUIZZES) {
    await step(`${s.title} — 그럴듯한 오답으로 전부 틀리기 → 0점, 오답 50개`, async () => {
      await page.goto(`${BASE}/quiz/${s.demoId}`);
      await playAll(page, s.questions.map((q, i) => wrongFor(s, q, i)));
      assert.equal((await page.locator('.score-num').textContent()).trim(), '0');
      assert.deepEqual(await page.locator('.stat dd').allTextContents(), ['0개', '50개', '0%', '50문제']);
      assert.equal(await page.locator('.review-item.is-wrong').count(), 50);
    });
    await step(`${s.title} — 홀수 번 정답·짝수 번 오답 → 50점, 문제별 ⭕❌ 정확`, async () => {
      await page.goto(`${BASE}/quiz/${s.demoId}`);
      await playAll(page, s.questions.map((q, i) => (i % 2 === 0 ? q.answer : wrongFor(s, q, i))));
      assert.equal((await page.locator('.score-num').textContent()).trim(), '50');
      const marks = await page.locator('.review-item').evaluateAll((els) => els.map((e) => e.classList.contains('is-correct')));
      assert.deepEqual(marks, s.questions.map((_, i) => i % 2 === 0));
      // 틀린 문제에는 정답이 표시되어야 함
      const wrongItem = page.locator('.review-item').nth(1);
      assert.ok((await wrongItem.textContent()).includes(s.questions[1].answer));
    });
  }

  const first = SAMPLE_QUIZZES[0];
  await step(`${first.title} — 다른 인정 답안으로 풀어도 정답`, async () => {
    await page.goto(`${BASE}/quiz/${first.demoId}`);
    const answers = first.questions.map((q) => (q.type === 'text' && q.altAnswers.length ? q.altAnswers[0].toUpperCase() : q.answer));
    await playAll(page, answers);
    assert.equal((await page.locator('.score-num').textContent()).trim(), '100');
  });

  await step(`${first.title} — 모두 틀리면 0점, 오답 50개`, async () => {
    await page.goto(`${BASE}/quiz/${first.demoId}`);
    const answers = first.questions.map((q) => (q.type === 'choice' ? q.options.find((o) => o !== q.answer) : '오답입니다'));
    await playAll(page, answers);
    assert.equal((await page.locator('.score-num').textContent()).trim(), '0');
    assert.deepEqual(await page.locator('.stat dd').allTextContents(), ['0개', '50개', '0%', '50문제']);
  });

  await step('홈 인기순: 실제 플레이 수 기준으로 정렬', async () => {
    await page.goto(`${BASE}/?sort=popular`);
    await page.locator('.quiz-card:not(.skeleton)').first().waitFor();
    const meta = await page.locator('.quiz-card').first().textContent();
    assert.match(meta, /플레이 5회/, meta);
  });

  await step('콘솔 오류 없음', async () => assert.deepEqual(errors, []));
  await browser.close();
  return summary();
}
