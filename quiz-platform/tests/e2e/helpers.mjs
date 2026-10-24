// E2E 테스트 공용 도우미 (Playwright 사용)
import { createRequire } from 'node:module';
import assert from 'node:assert/strict';

const require = createRequire(import.meta.url);

export function loadPlaywright() {
  try {
    return require('playwright');
  } catch {
    console.error('Playwright 가 설치되어 있지 않습니다. (quiz-platform 폴더에서)\n  npm install -D playwright\n  npx playwright install chromium\n을 실행한 뒤 다시 시도하세요.');
    process.exit(1);
  }
}

export { assert };

let passed = 0;
let failed = 0;
export async function step(name, fn) {
  const t = Date.now();
  try {
    await fn();
    passed++;
    console.log(`  ✓ ${name} (${Date.now() - t}ms)`);
  } catch (err) {
    failed++;
    console.log(`  ✗ ${name}\n    ${String(err?.stack || err).split('\n').slice(0, 4).join('\n    ')}`);
  }
}
export function summary() {
  console.log(`\n  결과: ${passed}개 통과, ${failed}개 실패`);
  const f = failed;
  passed = 0;
  failed = 0;
  return f;
}

// 콘솔 오류/페이지 오류를 모아 둡니다.
export function watchErrors(page, bucket, ignore = []) {
  page.on('pageerror', (e) => bucket.push(`pageerror: ${e.message}`));
  page.on('console', (m) => {
    if (m.type() !== 'error') return;
    const text = m.text();
    if (ignore.some((re) => re.test(text))) return;
    bucket.push(`console.error: ${text}`);
  });
}

export async function h1(page) {
  await page.locator('main h1').first().waitFor();
  return (await page.locator('main h1').first().textContent()).trim();
}

// 제작 화면에서 퀴즈 입력
// questions: [{ type:'text'|'choice', question, answer, alt, options:[...], correct: index }]
export async function fillQuiz(page, { title, description = '', category, isPublic = true, questions }) {
  await page.getByLabel('퀴즈 제목').fill(title);
  if (description) await page.getByLabel('설명 (선택)').fill(description);
  if (category) await page.getByLabel('카테고리').selectOption(category);
  const sw = page.locator('#f-public');
  if ((await sw.isChecked()) !== isPublic) await page.locator('label.switch').click();
  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    if (i > 0) await page.getByRole('button', { name: q.type === 'choice' ? '+ 객관식 문제' : '+ 주관식 문제' }).click();
    const card = page.locator('.question-card').nth(i);
    if (i === 0 && q.type === 'choice') await card.locator('select').selectOption('choice');
    await card.locator('textarea').fill(q.question);
    if (q.type === 'text') {
      await card.locator('input[id$="-answer"]').fill(q.answer);
      if (q.alt) await card.locator('input[id$="-alt"]').fill(q.alt);
    } else {
      const rows = card.locator('.option-row');
      for (let k = 0; k < q.options.length; k++) {
        if (k >= (await rows.count())) await card.getByRole('button', { name: /보기 추가/ }).click();
        await rows.nth(k).locator('input[type="text"]').fill(q.options[k]);
      }
      // 남는 빈 보기 삭제
      while ((await rows.count()) > q.options.length) {
        await rows.nth(await rows.count() - 1).getByRole('button').click();
      }
      if (q.correct !== undefined) await rows.nth(q.correct).locator('input[type="radio"]').check();
    }
  }
}

export async function saveQuiz(page) {
  await page.locator('button[type="submit"][form="quiz-form"]').click();
  await page.waitForURL(/\/quiz\/[A-Za-z0-9]{20}$/);
  return page.url().split('/quiz/')[1];
}

// 플레이 화면에서 한 문제 풀기. answer === null 이면 건너뛰기
export async function answerCurrent(page, answer) {
  const form = page.locator('form.question-play');
  await form.waitFor();
  if (answer === null) {
    await form.getByRole('button', { name: '건너뛰기' }).click();
  } else if (await form.locator('.choices').count()) {
    // 보기 문장이 정확히 같은 것만 클릭 (예: "0도"를 고를 때 "-10도"를 누르지 않도록)
    const exact = new RegExp(`^${answer.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`);
    await form.locator('label.choice').filter({ has: page.locator('.choice-text', { hasText: exact }) }).click();
    await form.getByRole('button', { name: '정답 확인' }).click();
  } else {
    await form.locator('input.input').fill(answer);
    await form.locator('input.input').press('Enter');
  }
  const fb = form.locator('.feedback');
  await fb.locator('strong').waitFor();
  return (await fb.textContent()).trim();
}

export async function nextQuestion(page) {
  await page.locator('form.question-play .play-actions button').click();
}

// 퀴즈 전체를 주어진 답으로 풀고 결과 페이지까지 이동
export async function playAll(page, answers) {
  await page.getByRole('button', { name: /퀴즈 시작하기|처음부터/ }).first().click();
  for (const a of answers) {
    await answerCurrent(page, a);
    await nextQuestion(page);
  }
  await page.waitForURL(/\/result$/);
  await page.locator('.score-num').waitFor();
}

export async function noHorizontalScroll(page) {
  return page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
}
