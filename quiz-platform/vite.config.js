import { defineConfig } from 'vite';

// Vite 는 기본적으로 SPA 모드(appType: 'spa')라서
// /quiz/abc 같은 주소를 새로고침해도 index.html 을 돌려줍니다.
// 보안: 개발 서버는 기본적으로 "내 컴퓨터(localhost)"에서만 열립니다.
//       같은 와이파이의 휴대폰으로 확인하려면 잠깐만 `npm run dev:lan` 을 쓰세요.
export default defineConfig({
  server: { port: 5173, host: 'localhost' },
  preview: { port: 4173, host: 'localhost' },
  build: { outDir: 'dist', sourcemap: false },
  test: {
    include: ['tests/unit/**/*.test.js'],
    environment: 'node',
  },
});
