// Storage 보안 규칙 테스트
import { readFileSync } from 'node:fs';
import { describe, it, beforeAll, afterAll } from 'vitest';
import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import { ref, uploadBytes, getBytes, deleteObject, listAll } from 'firebase/storage';
import { doc, setDoc } from 'firebase/firestore';

let env;
const QUIZ = 'AbCdEfGhIjKlMnOpQrSt';
const png = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 0]);

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-quizbang-rules',
    firestore: { rules: readFileSync('firestore.rules', 'utf8') },
    storage: { rules: readFileSync('storage.rules', 'utf8') },
  });
  await env.clearStorage();
});
afterAll(async () => env?.cleanup());

const st = (uid) => (uid ? env.authenticatedContext(uid) : env.unauthenticatedContext()).storage();
const path = (uid, name = 'AbCdEfGhIjKl.png') => `quiz-images/${uid}/${QUIZ}/${name}`;

describe('이미지 업로드', () => {
  it('본인 폴더에 허용된 이미지 업로드 가능', async () => {
    await assertSucceeds(uploadBytes(ref(st('alice'), path('alice')), png, { contentType: 'image/png' }));
  });
  it('비로그인·남의 폴더는 거부', async () => {
    await assertFails(uploadBytes(ref(st(null), path('alice', 'Zzzzzzzzzzzz.png')), png, { contentType: 'image/png' }));
    await assertFails(uploadBytes(ref(st('bob'), path('alice', 'Yyyyyyyyyyyy.png')), png, { contentType: 'image/png' }));
  });
  it('이미지가 아닌 형식·큰 파일·이상한 파일명은 거부', async () => {
    await assertFails(uploadBytes(ref(st('alice'), path('alice', 'Xxxxxxxxxxxx.png')), png, { contentType: 'text/html' }));
    await assertFails(uploadBytes(ref(st('alice'), path('alice', 'Wwwwwwwwwwww.png')), png, { contentType: 'image/svg+xml' }));
    const big = new Uint8Array(2 * 1024 * 1024 + 10);
    await assertFails(uploadBytes(ref(st('alice'), path('alice', 'Vvvvvvvvvvvv.png')), big, { contentType: 'image/png' }));
    await assertFails(uploadBytes(ref(st('alice'), path('alice', '../evil.png')), png, { contentType: 'image/png' }));
  });
  it('다른 경로는 차단', async () => {
    await assertFails(uploadBytes(ref(st('alice'), 'anything/else.png'), png, { contentType: 'image/png' }));
  });
});

describe('이미지 읽기·삭제', () => {
  it('퀴즈가 공개되기 전에는 소유자만 읽기', async () => {
    await assertSucceeds(getBytes(ref(st('alice'), path('alice'))));
    await assertFails(getBytes(ref(st('bob'), path('alice'))));
  });
  it('퀴즈가 공개되면 누구나 읽기', async () => {
    await env.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'quizzes', QUIZ), { isPublic: true, ownerUid: 'alice' });
    });
    await assertSucceeds(getBytes(ref(st(null), path('alice'))));
  });
  it('폴더 목록 조회(퀴즈 삭제 시 이미지 정리용)는 소유자만', async () => {
    const folder = `quiz-images/alice/${QUIZ}`;
    await assertSucceeds(listAll(ref(st('alice'), folder)));
    await assertFails(listAll(ref(st('bob'), folder)));
    await assertFails(listAll(ref(st(null), folder)));
  });
  it('삭제는 소유자만', async () => {
    await assertFails(deleteObject(ref(st('bob'), path('alice'))));
    await assertSucceeds(deleteObject(ref(st('alice'), path('alice'))));
  });
});
