// Firebase 설정이 없을 때 빈 화면 대신 안내가 나오는지 확인
import { loadPlaywright, assert, step, summary, watchErrors, h1 } from './helpers.mjs';

const BASE = process.env.BASE_URL;
const { chromium } = loadPlaywright();

export async function run() {
  console.log(`\n[Firebase 설정 누락 E2E] ${BASE}`);
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const errors = [];
  watchErrors(page, errors);
  for (const path of ['/', '/create', '/quiz/AbCdEfGhIjKlMnOpQrSt']) {
    await step(`${path} → "Firebase 설정이 필요해요" 안내`, async () => {
      await page.goto(BASE + path);
      assert.equal(await h1(page), 'Firebase 설정이 필요해요');
      const text = await page.locator('main').textContent();
      for (const key of ['VITE_FIREBASE_API_KEY', 'VITE_FIREBASE_PROJECT_ID']) assert.ok(text.includes(key), key);
      assert.match(text, /npm run dev:demo/);
    });
  }
  if (process.env.SHOT_DIR) await page.screenshot({ path: `${process.env.SHOT_DIR}/config-error.png`, fullPage: true });
  await step('콘솔 오류 없음', async () => assert.deepEqual(errors, []));
  await browser.close();
  return summary();
}
