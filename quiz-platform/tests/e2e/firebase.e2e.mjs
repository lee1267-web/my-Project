// Firebase Emulator 모드 E2E
// 실제 Firebase SDK + 보안 규칙(firestore.rules / storage.rules)이 적용된 로컬 에뮬레이터에서
// "서로 다른 브라우저 = 서로 다른 익명 사용자" 간 공유를 검사합니다.
import { writeFileSync } from 'node:fs';
import {
  loadPlaywright, assert, step, summary, watchErrors, h1, fillQuiz, saveQuiz, playAll,
} from './helpers.mjs';

const BASE = process.env.BASE_URL;
const SHOTS = process.env.SHOT_DIR || '';
const { chromium } = loadPlaywright();

// 1x1 PNG
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');

// 에뮬레이터 관리자 권한(Bearer owner)으로 Storage 파일 목록 조회
async function storageFiles(anyUrl) {
  const bucket = anyUrl.match(/\/v0\/b\/([^/]+)\//)[1];
  const res = await fetch(`http://127.0.0.1:9199/v0/b/${bucket}/o?prefix=quiz-images%2F`, { headers: { Authorization: 'Bearer owner' } });
  return ((await res.json()).items || []).map((i) => i.name);
}

export async function run() {
  console.log(`\n[Firebase Emulator E2E] ${BASE}`);
  const browser = await chromium.launch();
  const ctxA = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const ctxB = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true });
  const a = await ctxA.newPage();
  const b = await ctxB.newPage();
  const errors = [];
  // 권한 거부(403)는 의도한 테스트라 브라우저가 남기는 네트워크 오류 로그는 제외
  const ignore = [/403|Forbidden|permission/i, /Failed to load resource/];
  watchErrors(a, errors, ignore);
  watchErrors(b, errors, ignore);
  let publicId;
  let privateId;
  let thumbUrl;

  await step('에뮬레이터 안내 배너 + 빈 목록 상태', async () => {
    await a.goto(BASE);
    assert.match(await a.locator('.mode-banner').textContent(), /에뮬레이터/);
    await a.getByText('아직 공개된 퀴즈가 없어요').waitFor();
  });

  await step('사용자 A: 이미지 포함 공개 퀴즈 생성 (익명 로그인 + Firestore + Storage)', async () => {
    await a.goto(`${BASE}/create`);
    const file = '/tmp/claude-e2e-thumb.png';
    writeFileSync(file, PNG);
    await a.locator('#f-thumb').setInputFiles(file);
    await a.locator('img.image-preview').waitFor();
    await fillQuiz(a, {
      title: '공유 테스트 한국 지리', description: '에뮬레이터 공유 확인용', category: 'geography',
      questions: [
        { type: 'text', question: '한국에서 가장 높은 산은?', answer: '한라산' },
        { type: 'choice', question: '한국의 수도는?', options: ['부산', '서울', '대구'], correct: 1 },
      ],
    });
    publicId = await saveQuiz(a);
    assert.equal(await h1(a), '공유 테스트 한국 지리');
    const src = await a.locator('.intro-thumb img').getAttribute('src');
    assert.match(src, /^http:\/\/127\.0\.0\.1:9199\/v0\/b\/.+quiz-images%2F/);
    thumbUrl = src;
    if (SHOTS) await a.screenshot({ path: `${SHOTS}/A-saved.png`, fullPage: true });
  });

  await step('사용자 A: 비공개 퀴즈 생성', async () => {
    await a.goto(`${BASE}/create`);
    await fillQuiz(a, { title: '나만 보는 비밀 퀴즈', category: 'etc', isPublic: false, questions: [{ type: 'text', question: '비밀?', answer: '비밀' }] });
    privateId = await saveQuiz(a);
    assert.match(await a.locator('.badges').textContent(), /비공개/);
    assert.match(await a.locator('.share-box').textContent(), /비공개 퀴즈라서 다른 사람은/);
  });

  await step('사용자 B(다른 브라우저·모바일): 공유 링크로 공개 퀴즈 열기 + 이미지 표시', async () => {
    await b.goto(`${BASE}/quiz/${publicId}`);
    assert.equal(await h1(b), '공유 테스트 한국 지리');
    await b.waitForFunction(() => document.querySelector('.intro-thumb img')?.naturalWidth > 0);
    assert.equal(await b.locator('.badge-owner').count(), 0, 'B 에게 "내 퀴즈" 표시 금지');
    assert.equal(await b.getByRole('link', { name: '수정하기' }).count(), 0);
  });

  await step('사용자 B: 끝까지 풀기 → 결과 → 플레이 수 +1 기록', async () => {
    await playAll(b, ['한라 산', '부산']);
    assert.equal((await b.locator('.score-num').textContent()).trim(), '50');
    if (SHOTS) await b.screenshot({ path: `${SHOTS}/B-result.png`, fullPage: true });
    await b.waitForTimeout(800); // 플레이 수 기록 대기
    await a.goto(`${BASE}/quiz/${publicId}`);
    await a.getByText('플레이 1회').waitFor({ timeout: 5000 });
  });

  await step('사용자 B: 비공개 퀴즈 링크 → "볼 수 없는 퀴즈" 안내 (보안 규칙)', async () => {
    await b.goto(`${BASE}/quiz/${privateId}`);
    assert.equal(await h1(b), '볼 수 없는 퀴즈예요');
  });

  await step('사용자 B: 남의 퀴즈 수정 페이지 접근 차단', async () => {
    await b.goto(`${BASE}/edit/${publicId}`);
    assert.equal(await h1(b), '볼 수 없는 퀴즈예요');
  });

  await step('사용자 B: 홈 목록에 공개 퀴즈만 보이고, 검색·카테고리 필터 동작', async () => {
    await b.goto(BASE);
    await b.locator('.quiz-card:not(.skeleton)').first().waitFor();
    const titles = await b.locator('.card-title').allTextContents();
    assert.ok(titles.includes('공유 테스트 한국 지리'));
    assert.ok(!titles.includes('나만 보는 비밀 퀴즈'));
    await b.goto(`${BASE}/?q=${encodeURIComponent('한국')}&cat=geography`);
    await b.locator('.quiz-card:not(.skeleton)').first().waitFor();
    assert.deepEqual(await b.locator('.card-title').allTextContents(), ['공유 테스트 한국 지리']);
    await b.goto(`${BASE}/?q=${encodeURIComponent('비밀')}`);
    await b.getByText('조건에 맞는 퀴즈가 없어요').waitFor();
  });

  await step('사용자 B 의 "내 퀴즈"에는 A 의 퀴즈가 없음', async () => {
    await b.goto(`${BASE}/my`);
    await b.getByText('아직 만든 퀴즈가 없어요').waitFor();
  });

  await step('사용자 A: 내 퀴즈 목록(공개/비공개 2개) → 비공개를 공개로 수정 → B 가 열 수 있음', async () => {
    await a.goto(`${BASE}/my`);
    await a.locator('.my-item').nth(1).waitFor();
    assert.equal(await a.locator('.my-item').count(), 2);
    assert.match(await a.locator('.uid-line').textContent(), /내 사용자 ID: \w+/);
    await a.locator('.my-item', { hasText: '나만 보는 비밀 퀴즈' }).getByRole('link', { name: '수정' }).click();
    await a.getByLabel('퀴즈 제목').fill('이제 공개된 퀴즈');
    await a.locator('label.switch').click();
    await a.locator('button[type="submit"][form="quiz-form"]').click();
    await a.waitForURL(new RegExp(`/quiz/${privateId}$`));
    await b.goto(`${BASE}/quiz/${privateId}`);
    assert.equal(await h1(b), '이제 공개된 퀴즈');
  });

  await step('사용자 A: 퀴즈 삭제 → B 에게 "삭제된 퀴즈" 안내 + 이미지 파일 정리', async () => {
    const before = await storageFiles(thumbUrl);
    assert.ok(before.some((n) => n.includes(publicId)), '삭제 전에는 이미지 파일이 있어야 함');
    await a.goto(`${BASE}/my`);
    const item = a.locator('.my-item', { hasText: '공유 테스트 한국 지리' });
    await item.getByRole('button', { name: '삭제' }).click();
    await a.locator('dialog').getByRole('button', { name: '삭제하기' }).click();
    await a.getByText('퀴즈를 삭제했어요').waitFor();
    await b.goto(`${BASE}/quiz/${publicId}`);
    assert.equal(await h1(b), '삭제된 퀴즈예요');
    // Storage 의 썸네일 이미지도 함께 지워져야 함
    const after = await storageFiles(thumbUrl);
    assert.ok(!after.some((n) => n.includes(publicId)), `남은 파일: ${after.join(', ')}`);
  });

  await step('사용자 A: 샘플 퀴즈 모두 추가 → B 의 홈에 표시', async () => {
    await a.goto(`${BASE}/my`);
    await a.locator('.sample-box summary').click();
    await a.getByRole('button', { name: '전체 선택/해제' }).click();
    const n = await a.locator('.sample-list input:checked').count();
    assert.ok(n >= 3);
    await a.getByRole('button', { name: '선택한 샘플 추가' }).click();
    await a.getByText(`샘플 퀴즈 ${n}개를 공개 퀴즈로 추가했어요`).waitFor({ timeout: 180000 });
    await b.goto(BASE);
    await b.locator('.quiz-card:not(.skeleton)').first().waitFor();
    const count = await b.locator('.quiz-card').count();
    assert.ok(count >= Math.min(n, 12), `카드 ${count}개`);
    if (SHOTS) await b.screenshot({ path: `${SHOTS}/B-home-samples.png`, fullPage: true });
  });

  await step('새로고침해도 같은 결과 (공유 링크는 로컬 상태와 무관)', async () => {
    const ctxC = await browser.newContext();
    const c = await ctxC.newPage();
    await c.goto(`${BASE}/quiz/${privateId}`);
    assert.equal(await h1(c), '이제 공개된 퀴즈');
    await c.reload();
    assert.equal(await h1(c), '이제 공개된 퀴즈');
    await ctxC.close();
  });

  await step('콘솔 오류 없음', async () => assert.deepEqual(errors, []));
  await browser.close();
  return summary();
}
