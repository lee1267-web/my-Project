import { defineConfig } from 'vite';

// Vite 는 기본적으로 SPA 모드(appType: 'spa')라서
// /quiz/abc 같은 주소를 새로고침해도 index.html 을 돌려줍니다.
export default defineConfig({
  server: { port: 5173, host: true },
  preview: { port: 4173, host: true },
  build: { outDir: 'dist', sourcemap: false },
  test: {
    include: ['tests/unit/**/*.test.js'],
    environment: 'node',
  },
});
