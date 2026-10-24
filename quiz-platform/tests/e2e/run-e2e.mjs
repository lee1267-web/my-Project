// E2E 테스트 실행기
//   node tests/e2e/run-e2e.mjs            → 데모 모드 + 샘플 풀이 + 설정 오류 화면
//   node tests/e2e/run-e2e.mjs emulator   → Firebase Emulator 모드 (npm run test:e2e:emulator 로 실행)
// 각 모드마다 Vite 개발 서버를 직접 켰다가 끕니다.
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';

const target = process.argv[2] || 'demo';
const SHOT_DIR = 'tests/e2e/screenshots';
mkdirSync(SHOT_DIR, { recursive: true });

async function withServer(mode, port, extraEnv, fn) {
  const server = spawn('npx', ['vite', '--mode', mode, '--port', String(port), '--strictPort', '--host', '127.0.0.1'], {
    env: { ...process.env, ...extraEnv },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let log = '';
  server.stdout.on('data', (d) => { log += d; });
  server.stderr.on('data', (d) => { log += d; });
  const base = `http://127.0.0.1:${port}`;
  for (let i = 0; i < 60; i++) {
    try {
      if ((await fetch(base)).ok) break;
    } catch { /* 아직 준비 안 됨 */ }
    await new Promise((r) => setTimeout(r, 500));
    if (i === 59) throw new Error(`개발 서버가 시작되지 않았습니다.\n${log}`);
  }
  process.env.BASE_URL = base;
  process.env.SHOT_DIR = `${SHOT_DIR}/${mode}`;
  mkdirSync(process.env.SHOT_DIR, { recursive: true });
  try {
    return await fn();
  } finally {
    server.kill();
  }
}

let failed = 0;
if (target === 'hosting') {
  // 실제 배포와 같은 Firebase Hosting 에뮬레이터(보안 헤더·CSP·새로고침 rewrites 적용)에서 데모 빌드 검사
  process.env.BASE_URL = 'http://127.0.0.1:5000';
  process.env.SHOT_DIR = `${SHOT_DIR}/hosting`;
  mkdirSync(process.env.SHOT_DIR, { recursive: true });
  const res = await fetch(`${process.env.BASE_URL}/quiz/AbCdEfGhIjKlMnOpQrSt`);
  const csp = res.headers.get('content-security-policy') || '';
  console.log(`\n[Hosting 에뮬레이터] /quiz/... 응답 ${res.status}, CSP ${csp ? '적용됨' : '없음'}`);
  if (res.status !== 200 || !csp.includes("frame-ancestors 'none'")) failed++;
  failed += await (await import('./demo.e2e.mjs')).run();
} else if (target === 'emulator') {
  failed += await withServer('emulator', 5181, {}, async () => (await import('./firebase.e2e.mjs')).run());
} else {
  failed += await withServer('demo', 5180, {}, async () => {
    let f = await (await import('./demo.e2e.mjs')).run();
    f += await (await import('./samples.e2e.mjs')).run();
    return f;
  });
  // Firebase 설정이 비어 있을 때의 안내 화면 (환경변수를 일부러 비움)
  const empty = {
    VITE_DATA_MODE: 'firebase', VITE_FIREBASE_API_KEY: '', VITE_FIREBASE_AUTH_DOMAIN: '', VITE_FIREBASE_PROJECT_ID: '', VITE_FIREBASE_APP_ID: '',
  };
  failed += await withServer('noconfig', 5182, empty, async () => (await import('./config.e2e.mjs')).run());
}
console.log(failed ? `\n❌ E2E 실패 ${failed}건` : '\n✅ E2E 모두 통과');
process.exit(failed ? 1 : 0);
