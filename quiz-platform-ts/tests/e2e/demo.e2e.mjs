// 데모 모드 E2E: 핵심 사용자 흐름을 실제 브라우저(Chromium)에서 검사
import {
  loadPlaywright, assert, step, summary, watchErrors, h1, fillQuiz, saveQuiz,
  answerCurrent, nextQuestion, playAll, noHorizontalScroll, assertNoJunkText,
} from './helpers.mjs';

const BASE = process.env.BASE_URL;
const SHOTS = process.env.SHOT_DIR || '';
const { chromium } = loadPlaywright();

export async function run() {
  console.log(`\n[데모 모드 E2E] ${BASE}`);
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, permissions: ['clipboard-read', 'clipboard-write'] });
  const page = await ctx.newPage();
  const errors = [];
  watchErrors(page, errors);
  const shot = async (name) => SHOTS && page.screenshot({ path: `${SHOTS}/${name}.png`, fullPage: true });
  let quizId;

  await step('홈: 샘플 퀴즈 카드와 데모 안내 표시', async () => {
    await page.goto(BASE);
    await page.locator('.quiz-card:not(.skeleton)').first().waitFor();
    assert.ok((await page.locator('.quiz-card').count()) >= 3);
    assert.match(await page.locator('.mode-banner').textContent(), /데모 모드/);
    await shot('01-home');
  });

  await step('홈: 검색어 / 카테고리 필터 / 정렬 / 빈 결과', async () => {
    await page.getByLabel('퀴즈 검색').fill('한국사');
    await page.getByRole('button', { name: '검색', exact: true }).click();
    await page.waitForFunction(() => document.querySelector('.quiz-grid')?.getAttribute('aria-busy') === 'false');
    const titles = await page.locator('.card-title').allTextContents();
    assert.ok(titles.some((t) => t.includes('한국사 50제')), titles.join());
    assert.match(page.url(), /q=%ED%95%9C%EA%B5%AD%EC%82%AC/);
    await page.getByLabel('퀴즈 검색').fill('존재하지않는검색어');
    await page.getByRole('button', { name: '검색', exact: true }).click();
    await page.getByText(/퀴즈가 아직 없어요/).waitFor();
    await page.getByRole('button', { name: '검색 조건 초기화' }).click();
    await page.locator('.quiz-card:not(.skeleton)').first().waitFor();
    await page.locator('.chips .chip', { hasText: '아이돌' }).click();
    await page.waitForFunction(() => document.querySelector('.quiz-grid')?.getAttribute('aria-busy') === 'false');
    const badges = await page.locator('.quiz-card .badge-category').allTextContents();
    assert.ok(badges.length >= 1 && badges.every((b) => b.includes('아이돌')), badges.join());
    await page.getByLabel('정렬').selectOption('popular');
    assert.match(page.url(), /sort=popular/);
    await page.getByRole('button', { name: '전체', exact: true }).click();
  });

  // 검색 결과가 모두 그려질 때까지 기다린 뒤 카드의 분류 배지 목록을 돌려줌
  const searchFor = async (word) => {
    await page.goto(`${BASE}/?q=${encodeURIComponent(word)}`);
    await page.waitForFunction(() => document.querySelector('.quiz-grid')?.getAttribute('aria-busy') === 'false');
    return {
      badges: await page.locator('.quiz-card .badge-category').allTextContents(),
      titles: await page.locator('.quiz-card .card-title').allTextContents(),
    };
  };

  await step('분류 검색: "발라드" → 발라드 퀴즈만', async () => {
    const { badges, titles } = await searchFor('발라드');
    assert.ok(titles.some((t) => t.includes('발라드 명곡')), titles.join());
    assert.ok(badges.length >= 1 && badges.every((b) => b.includes('발라드')), badges.join());
  });

  await step('분류 검색: "게임" → 게임 분류 + 제목에 "게임"이 든 퀴즈, "게임만 보기"로 정확히 좁히기', async () => {
    const { badges, titles } = await searchFor('게임');
    assert.ok(badges.some((b) => b.includes('🎮 게임')), badges.join());
    badges.forEach((b, i) => assert.ok(b.includes('게임') || titles[i].includes('게임'), `${titles[i]} / ${b}`));
    await page.getByRole('button', { name: /게임만 보기/ }).click();
    await page.waitForFunction(() => document.querySelector('.quiz-grid')?.getAttribute('aria-busy') === 'false');
    assert.match(page.url(), /cat=game/);
    const only = await page.locator('.quiz-card .badge-category').allTextContents();
    assert.ok(only.length >= 1 && only.every((b) => b.includes('🎮 게임')), only.join());
  });

  await step('분류 검색: "노래" → 음악·아이돌 퀴즈 (발라드·민요·클래식·아이돌 포함)', async () => {
    const { badges, titles } = await searchFor('노래');
    assert.ok(badges.every((b) => b.includes('음악') || b.includes('아이돌')), badges.join());
    for (const want of ['발라드', '가사 보고', '클래식', '아이돌']) assert.ok(titles.some((t) => t.includes(want)), `${want} 없음: ${titles.join()}`);
  });

  await step('세부 분류 버튼: 음악 → 발라드 / 음악 → 트로트(없으면 안내 + 만들기 버튼)', async () => {
    await page.goto(BASE);
    await page.locator('.quiz-card:not(.skeleton)').first().waitFor();
    assert.ok(await page.locator('.chips-sub').isHidden(), '카테고리 선택 전에는 세부 분류 숨김');
    await page.locator('.chips .chip', { hasText: '음악' }).first().click();
    await page.locator('.chips-sub').waitFor();
    await page.locator('.chips-sub .chip', { hasText: '발라드' }).click();
    await page.waitForFunction(() => document.querySelector('.quiz-grid')?.getAttribute('aria-busy') === 'false');
    assert.match(page.url(), /cat=music&sub=ballad/);
    const badges = await page.locator('.quiz-card .badge-category').allTextContents();
    assert.ok(badges.length === 1 && badges[0].includes('음악 · 발라드'), badges.join());
    await page.locator('.chips-sub .chip', { hasText: '트로트' }).click();
    await page.getByText('음악 · 트로트 퀴즈가 아직 없어요').waitFor();
    const link = page.locator('.empty-state a', { hasText: '퀴즈 만들기' });
    assert.equal(await link.getAttribute('href'), '/create?cat=music&sub=trot');
  });

  await step('"직접 만들기" 버튼: 홈 오른쪽 아래 → 보던 분류가 채워진 만들기 화면, 만들기 화면에서는 숨김', async () => {
    await page.goto(`${BASE}/?cat=music&sub=ballad`);
    const fab = page.locator('.fab');
    await fab.waitFor();
    const box = await fab.boundingBox();
    const vp = page.viewportSize();
    assert.ok(box.x + box.width > vp.width - 40 && box.y + box.height > vp.height - 40, `위치 ${JSON.stringify(box)}`);
    await fab.click();
    await page.waitForURL(/\/create\?cat=music&sub=ballad$/);
    assert.equal(await page.getByLabel('카테고리').inputValue(), 'music');
    assert.equal(await page.locator('#f-sub').inputValue(), 'ballad');
    assert.ok(await fab.isHidden(), '만들기 화면에서는 숨김');
    await page.goto(`${BASE}/my`);
    assert.ok(await fab.isVisible(), '내 퀴즈 화면에서는 보임');
  });

  await step('만들 때 고른 세부 분류·태그로 검색됨', async () => {
    await page.goto(`${BASE}/create`);
    await fillQuiz(page, { title: '추억의 노래방 퀴즈', category: 'music', questions: [{ type: 'text', question: 'q', answer: 'a' }] });
    await page.locator('#f-sub').selectOption('trot');
    await page.getByLabel('태그 (선택)').fill('#노래방, 7080, 노래방');
    const id = await saveQuiz(page);
    assert.match(await page.locator('.intro-card').textContent(), /음악 · 트로트[\s\S]*#노래방[\s\S]*#7080/);
    for (const word of ['트로트', '7080', '노래방', '노래']) {
      const { titles } = await searchFor(word);
      assert.ok(titles.includes('추억의 노래방 퀴즈'), `"${word}" 검색 결과에 없음`);
    }
    await page.goto(`${BASE}/quiz/${id}`);
    await page.locator('.intro-card a.tag', { hasText: '#7080' }).click();
    await page.waitForURL(/\?q=7080/);
  });

  await step('만들기: 빈 값으로 저장하면 한국어 오류가 필드 근처에 표시', async () => {
    await page.goto(`${BASE}/create`);
    await page.locator('button[type="submit"][form="quiz-form"]').click();
    const errs = await page.locator('.field-error:not([hidden])').allTextContents();
    assert.ok(errs.some((e) => e.includes('퀴즈 제목을 입력')), errs.join('|'));
    assert.ok(errs.some((e) => e.includes('카테고리를 선택')));
    assert.ok(errs.some((e) => e.includes('문제 내용을 입력')));
    assert.ok(errs.some((e) => e.includes('정답을 입력')));
    assert.match(page.url(), /\/create$/);
    await shot('02-create-errors');
  });

  await step('만들기: 객관식 정답 미선택·보기 부족 오류', async () => {
    await page.reload();
    await fillQuiz(page, { title: '검증 테스트', category: 'general', questions: [{ type: 'choice', question: '보기 테스트', options: ['하나', ''] }] });
    // 보기는 최소 2칸이라 더 지울 수 없어야 함
    assert.ok(await page.getByRole('button', { name: '보기 2 삭제' }).isDisabled());
    await page.locator('button[type="submit"][form="quiz-form"]').click();
    const errs = await page.locator('.field-error:not([hidden])').allTextContents();
    assert.ok(errs.some((e) => e.includes('2개 이상')), errs.join('|'));
    assert.ok(errs.some((e) => e.includes('정답 보기를 선택')), errs.join('|'));
  });

  await step('만들기: 여러 문제 추가·순서 변경·삭제·미리보기 후 저장 → 고유 URL', async () => {
    page.once('dialog', (d) => d.accept()); // 떠나기 확인
    await page.goto(`${BASE}/create`);
    await fillQuiz(page, {
      title: 'E2E 테스트 퀴즈', description: '자동 테스트로 만든 퀴즈', category: 'general',
      questions: [
        { type: 'text', question: '대한민국의 수도는?', answer: '서울특별시', alt: '서울' },
        { type: 'choice', question: '1 + 1 = ?', options: ['1', '2', '3', '4'], correct: 1 },
        { type: 'text', question: '지울 문제', answer: 'x' },
        { type: 'text', question: '가장 큰 행성은?', answer: '목성' },
      ],
    });
    // 3번(지울 문제) 삭제 → 확인창
    await page.getByRole('button', { name: '3번 문제 삭제' }).click();
    await page.locator('dialog .btn-danger').click();
    await page.waitForFunction(() => document.querySelectorAll('.question-card').length === 3);
    // 3번(목성)을 위로 → 2번
    await page.getByRole('button', { name: '3번 문제를 위로 이동' }).click();
    const qs = await page.locator('.question-card textarea').evaluateAll((els) => els.map((e) => e.value));
    assert.deepEqual(qs, ['대한민국의 수도는?', '가장 큰 행성은?', '1 + 1 = ?']);
    // 미리보기
    await page.getByRole('button', { name: '미리보기' }).click();
    const preview = page.locator('dialog');
    assert.match(await preview.textContent(), /E2E 테스트 퀴즈[\s\S]*정답: 서울특별시[\s\S]*2 ✔ 정답/);
    await preview.getByRole('button', { name: '닫기' }).click();
    // 임시 저장
    await page.getByRole('button', { name: '임시 저장' }).click();
    assert.ok(await page.evaluate(() => Boolean(localStorage.getItem('quizbang.draft.new'))));
    await shot('03-create-filled');
    quizId = await saveQuiz(page);
    assert.match(quizId, /^[A-Za-z0-9]{20}$/);
    assert.equal(await page.evaluate(() => localStorage.getItem('quizbang.draft.new')), null, '저장 후 임시 저장본 삭제');
    await page.getByText('저장 완료').waitFor();
    assert.equal(await page.locator('.share-input').inputValue(), `${BASE}/quiz/${quizId}`);
    await shot('04-saved');
  });

  await step('공유: 링크 복사 성공 피드백 + 클립보드 내용', async () => {
    await page.getByRole('button', { name: '링크 복사' }).click();
    await page.getByText('링크를 복사했어요! 메신저에').waitFor();
    assert.equal(await page.evaluate(() => navigator.clipboard.readText()), `${BASE}/quiz/${quizId}`);
  });

  await step('공유 URL 직접 접속·새로고침해도 같은 퀴즈가 열림', async () => {
    await page.goto(`${BASE}/quiz/${quizId}`);
    assert.equal(await h1(page), 'E2E 테스트 퀴즈');
    await page.reload();
    assert.equal(await h1(page), 'E2E 테스트 퀴즈');
  });

  await step('플레이: 주관식(띄어쓰기 무시) 정답 → 객관식 오답 → 새로고침 후 이어 풀기 → 건너뛰기', async () => {
    await page.getByRole('button', { name: '퀴즈 시작하기' }).click();
    assert.equal((await page.locator('.progress-label').textContent()).trim(), '1 / 3');
    // 빈 답으로 확인 → 안내
    await page.getByRole('button', { name: '정답 확인' }).click();
    await page.getByText('답을 입력해 주세요').waitFor();
    assert.match(await answerCurrent(page, ' 서울 특별시 '), /정답입니다/);
    await nextQuestion(page);
    assert.match(await answerCurrent(page, '목성은아님'), /오답[\s\S]*정답: 목성/);
    await nextQuestion(page);
    await page.reload(); // 3번 문제에서 새로고침
    await page.getByRole('button', { name: /이어서 풀기 \(3\/3\)/ }).click();
    assert.equal((await page.locator('.progress-label').textContent()).trim(), '3 / 3');
    assert.match(await answerCurrent(page, null), /건너뛰었어요/);
    await shot('05-play-feedback');
    await page.getByRole('button', { name: '결과 보기' }).click();
    await page.waitForURL(/\/result$/);
  });

  await step('결과: 점수·정답 수·오답 수·정답률·문제별 답 + 새로고침 유지', async () => {
    const check = async () => {
      assert.equal((await page.locator('.score-num').textContent()).trim(), '33');
      const stats = await page.locator('.stat dd').allTextContents();
      assert.deepEqual(stats, ['1개', '2개', '33.3%', '3문제']);
      const items = page.locator('.review-item');
      assert.equal(await items.count(), 3);
      assert.match(await items.nth(1).textContent(), /내 답목성은아님[\s\S]*정답목성/);
      assert.match(await items.nth(2).textContent(), /\(건너뜀\)/);
    };
    await check();
    await shot('06-result');
    await page.reload();
    await check();
  });

  await step('결과: 다시 풀기 → 1번부터 / 다른 퀴즈 풀기 → 홈', async () => {
    await page.getByRole('button', { name: '다시 풀기' }).click();
    await page.locator('.progress-label').waitFor();
    assert.equal((await page.locator('.progress-label').textContent()).trim(), '1 / 3');
    await page.goto(`${BASE}/quiz/${quizId}/result`);
    await page.getByText('표시할 결과가 없어요').waitFor(); // 다시 풀기로 이전 결과 초기화
    await page.goto(`${BASE}/quiz/${quizId}`);
    await playAll(page, ['서울', '목성', '2']);
    assert.equal((await page.locator('.score-num').textContent()).trim(), '100');
    await page.getByRole('link', { name: '다른 퀴즈 풀기' }).click();
    await page.waitForURL(`${BASE}/`);
  });

  await step('내 퀴즈: 목록·공개 상태·수정', async () => {
    await page.goto(`${BASE}/my`);
    const item = page.locator('.my-item', { hasText: 'E2E 테스트 퀴즈' });
    await item.waitFor();
    assert.match(await item.textContent(), /공개[\s\S]*플레이 2회/);
    await item.getByRole('link', { name: '수정' }).click();
    await page.waitForURL(/\/edit\//);
    await page.getByLabel('퀴즈 제목').fill('E2E 테스트 퀴즈 (수정됨)');
    await page.locator('label.switch').click(); // 비공개로
    await page.locator('button[type="submit"][form="quiz-form"]').click();
    await page.waitForURL(new RegExp(`/quiz/${quizId}$`));
    assert.equal(await h1(page), 'E2E 테스트 퀴즈 (수정됨)');
    assert.match(await page.locator('.badges').textContent(), /비공개/);
    await page.goto(BASE);
    await page.locator('.quiz-card:not(.skeleton)').first().waitFor();
    assert.equal(await page.locator('.card-title', { hasText: 'E2E 테스트' }).count(), 0, '비공개 퀴즈는 홈 목록에 없어야 함');
  });

  await step('내 퀴즈: 삭제 확인창 → 삭제 → 공유 링크는 "삭제된 퀴즈" 안내', async () => {
    await page.goto(`${BASE}/my`);
    const item = page.locator('.my-item', { hasText: 'E2E 테스트 퀴즈' });
    await item.getByRole('button', { name: '삭제' }).click();
    await page.locator('dialog').getByRole('button', { name: '취소' }).click();
    assert.equal(await item.count(), 1, '취소하면 남아 있어야 함');
    await item.getByRole('button', { name: '삭제' }).click();
    await page.locator('dialog').getByRole('button', { name: '삭제하기' }).click();
    await page.getByText('퀴즈를 삭제했어요').waitFor();
    assert.equal(await item.count(), 0);
    await page.goto(`${BASE}/quiz/${quizId}`);
    assert.equal(await h1(page), '삭제된 퀴즈예요');
  });

  await step('오류 페이지: 잘못된 ID / 없는 ID / 없는 페이지', async () => {
    await page.goto(`${BASE}/quiz/not-a-valid-id`);
    assert.equal(await h1(page), '퀴즈를 찾을 수 없어요');
    assert.match(await page.locator('.state-message').textContent(), /잘못된 퀴즈 주소/);
    await page.goto(`${BASE}/quiz/AAAAAAAAAAAAAAAAAAAA`);
    assert.equal(await h1(page), '퀴즈를 찾을 수 없어요');
    await page.goto(`${BASE}/quiz/AAAAAAAAAAAAAAAAAAAA/result`);
    assert.equal(await h1(page), '퀴즈를 찾을 수 없어요');
    await page.goto(`${BASE}/edit/AAAAAAAAAAAAAAAAAAAA`);
    assert.equal(await h1(page), '퀴즈를 찾을 수 없어요');
    await page.goto(`${BASE}/some/unknown/page`);
    assert.equal(await h1(page), '페이지를 찾을 수 없어요');
    await page.getByRole('link', { name: '홈으로 가기' }).click();
    await page.waitForURL(`${BASE}/`);
  });

  await step('임시 저장본 불러오기 / 작성 취소', async () => {
    await page.goto(`${BASE}/create`);
    await page.getByLabel('퀴즈 제목').fill('임시 저장 테스트');
    await page.getByRole('button', { name: '임시 저장' }).click();
    page.once('dialog', (d) => d.accept());
    await page.goto(`${BASE}/create`);
    await page.getByRole('button', { name: '불러오기' }).click();
    assert.equal(await page.getByLabel('퀴즈 제목').inputValue(), '임시 저장 테스트');
    await page.getByRole('button', { name: '작성 취소' }).click();
    await page.locator('dialog').getByRole('button', { name: '작성 취소' }).click();
    await page.waitForURL(`${BASE}/`);
    assert.equal(await page.evaluate(() => localStorage.getItem('quizbang.draft.new')), null);
  });

  await step('데모 한계 확인: 다른 브라우저(새 컨텍스트)에서는 데모 퀴즈가 열리지 않음', async () => {
    await page.goto(`${BASE}/create`);
    await fillQuiz(page, { title: '데모 공유 확인', category: 'etc', questions: [{ type: 'text', question: 'q', answer: 'a' }] });
    const id = await saveQuiz(page);
    const other = await browser.newContext();
    const p2 = await other.newPage();
    await p2.goto(`${BASE}/quiz/${id}`);
    assert.equal(await h1(p2), '퀴즈를 찾을 수 없어요');
    assert.match(await p2.locator('.state-message').textContent(), /데모 모드/);
    await other.close();
  });

  await step('모바일(390px): 가로 스크롤 없음, 홈·제작·플레이 화면', async () => {
    const m = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    const mp = await m.newPage();
    watchErrors(mp, errors);
    for (const path of ['/', '/create', '/my', '/quiz/Samplehistory0000000']) {
      await mp.goto(BASE + path);
      await mp.locator('main h1').first().waitFor();
      assert.ok(await noHorizontalScroll(mp), `${path} 가로 스크롤 발생`);
      if (SHOTS) await mp.screenshot({ path: `${SHOTS}/m-${path.replace(/\W/g, '_')}.png`, fullPage: false });
    }
    await mp.getByRole('button', { name: '퀴즈 시작하기' }).click();
    await mp.locator('.progress-label').waitFor();
    assert.ok(await noHorizontalScroll(mp));
    if (SHOTS) await mp.screenshot({ path: `${SHOTS}/m-play.png` });
    await m.close();
  });

  await step('키보드: Tab 으로 메뉴 이동 후 Enter 로 페이지 이동', async () => {
    await page.goto(BASE);
    await page.locator('.quiz-card:not(.skeleton)').first().waitFor();
    await page.focus('.logo');
    await page.keyboard.press('Tab'); // 둘러보기
    await page.keyboard.press('Tab'); // 내 퀴즈
    assert.equal(await page.evaluate(() => document.activeElement.textContent), '내 퀴즈');
    await page.keyboard.press('Enter');
    await page.waitForURL(/\/my$/);
  });

  await step('객관식 보기 순서: 정답을 모두 1번 보기에 넣어도 풀 때는 섞여 나오고, 새로고침해도 순서 유지', async () => {
    const n = 9;
    await page.goto(`${BASE}/create`);
    await fillQuiz(page, {
      title: '보기 섞기 확인', category: 'etc',
      questions: Array.from({ length: n }, (_, i) => ({
        type: 'choice', question: `섞기 ${i + 1}번 문제`, options: [`정답${i + 1}`, '보기 나', '보기 다', '보기 라'], correct: 0,
      })),
    });
    const id = await saveQuiz(page);
    await page.goto(`${BASE}/quiz/${id}`);
    await page.getByRole('button', { name: '퀴즈 시작하기' }).click();
    const positions = [];
    for (let i = 0; i < n; i += 1) {
      const texts = await page.locator('form.question-play .choice-text').allTextContents();
      if (i === 4) {
        await page.reload();
        await page.getByRole('button', { name: /이어서 풀기/ }).click();
        assert.deepEqual(await page.locator('form.question-play .choice-text').allTextContents(), texts, '새로고침 후에도 같은 보기 순서');
      }
      positions.push(texts.indexOf(`정답${i + 1}`));
      await answerCurrent(page, `정답${i + 1}`);
      await nextQuestion(page);
    }
    await page.waitForURL(/\/result$/);
    assert.equal((await page.locator('.score-num').textContent()).trim(), '100');
    assert.ok(positions.every((p) => p >= 0));
    assert.ok(new Set(positions).size >= 3, `정답 자리: ${positions.map((p) => p + 1).join(',')}`);
    for (let i = 2; i < n; i += 1) assert.ok(!(positions[i] === positions[i - 1] && positions[i] === positions[i - 2]), '같은 자리 3연속 금지');
  });

  await step('샘플 퀴즈: 몇 문제 푼 뒤 새로고침해도 이어 풀기 (샘플이 매번 다시 깔리지 않음)', async () => {
    await page.goto(`${BASE}/quiz/Samplehistory0000000`);
    await page.getByRole('button', { name: '퀴즈 시작하기' }).click();
    for (let i = 0; i < 2; i += 1) {
      await answerCurrent(page, null);
      await nextQuestion(page);
    }
    await page.reload();
    await page.getByRole('button', { name: /이어서 풀기 \(3\/50\)/ }).waitFor();
  });

  await step('규칙을 우회해 보기가 1개뿐인 객관식이 저장돼 있어도 풀기 화면이 깨지지 않음', async () => {
    const id = 'BrokenOneOption00000';
    await page.evaluate((qid) => {
      const key = 'quizbang.demo.quizzes';
      const data = JSON.parse(localStorage.getItem(key));
      data[qid] = {
        title: '이상한 데이터', description: '', category: 'etc', subcategory: '', tags: [], imageUrl: '', isPublic: true,
        questionCount: 2, searchTokens: [], ownerUid: 'someone', status: 'active', playCount: 0,
        createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
        questions: [
          { id: 'a', type: 'choice', question: '보기 하나', answer: '하나', options: ['하나'], altAnswers: [], imageUrl: '', order: 0 },
          { id: 'b', type: 'choice', question: '보기 둘', answer: '둘', options: ['하나', '둘'], altAnswers: [], imageUrl: '', order: 1 },
        ],
      };
      localStorage.setItem(key, JSON.stringify(data));
    }, id);
    await page.goto(`${BASE}/quiz/${id}`);
    await playAll(page, ['하나', '둘']);
    assert.equal((await page.locator('.score-num').textContent()).trim(), '100');
  });

  await step('형식이 망가진 임시 저장본을 불러와도 만들기 화면이 멈추지 않음', async () => {
    const broken = JSON.stringify({ savedAt: 'x', form: { title: 5, questions: [null, { type: 'weird', options: 'x' }] } });
    await page.evaluate((v) => localStorage.setItem('quizbang.draft.new', v), broken);
    await page.goto(`${BASE}/create`);
    await page.getByRole('button', { name: /불러오기/ }).click();
    await page.getByText('임시 저장본을 불러왔어요').waitFor();
    assert.equal(await page.locator('.question-card').count(), 1);
    assert.equal(await page.getByLabel('퀴즈 제목').inputValue(), '');
    await page.evaluate(() => localStorage.removeItem('quizbang.draft.new'));
  });

  await step('모든 주요 화면에 "null"·"undefined" 같은 글자가 새어 나오지 않음', async () => {
    const paths = ['/', '/?q=노래', '/?cat=music&sub=trot', '/create', '/my', '/quiz/Samplehistory0000000', '/quiz/Samplehistory0000000?saved=1',
      '/quiz/Samplehistory0000000/result', '/quiz/not-valid', '/nope'];
    for (const path of paths) {
      await page.goto(BASE + path);
      await page.locator('main h1').first().waitFor();
      await page.waitForTimeout(150);
      await assertNoJunkText(page, path);
    }
  });

  await step('콘솔 오류 없음', async () => {
    assert.deepEqual(errors, []);
  });

  await browser.close();
  return summary();
}
