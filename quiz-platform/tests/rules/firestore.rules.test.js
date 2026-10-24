// Firestore 보안 규칙 테스트
// 실행: (quiz-platform 폴더에서) npm run test:rules
import { readFileSync } from 'node:fs';
import { describe, it, beforeAll, afterAll, beforeEach } from 'vitest';
import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import {
  doc, getDoc, setDoc, updateDoc, deleteDoc, collection, query, where, getDocs, orderBy, limit,
  serverTimestamp, increment, writeBatch,
} from 'firebase/firestore';

const PROJECT = 'demo-quizbang-rules';
let env;

const ID = 'AbCdEfGhIjKlMnOpQrSt';
const ID2 = 'ZyXwVuTsRqPoNmLkJiHg';

function quizData(owner, over = {}) {
  return {
    title: '테스트', description: '', category: 'general', imageUrl: '', isPublic: true,
    questions: [{ id: 'q1', type: 'text', question: '문제', answer: '정답', altAnswers: [], options: [], imageUrl: '', order: 0 }],
    questionCount: 1, searchTokens: ['테', '테스', '테스트'],
    ownerUid: owner, status: 'active', playCount: 0,
    createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
    ...over,
  };
}

const alice = () => env.authenticatedContext('alice').firestore();
const bob = () => env.authenticatedContext('bob').firestore();
const guest = () => env.unauthenticatedContext().firestore();

async function seed(id, data) {
  await env.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), 'quizzes', id), { ...data, createdAt: new Date(), updatedAt: new Date() });
  });
}

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: PROJECT,
    firestore: { rules: readFileSync('firestore.rules', 'utf8') },
  });
});
afterAll(async () => env?.cleanup());
beforeEach(async () => env.clearFirestore());

describe('읽기', () => {
  it('비로그인 사용자도 공개 퀴즈를 읽을 수 있다', async () => {
    await seed(ID, quizData('alice'));
    await assertSucceeds(getDoc(doc(guest(), 'quizzes', ID)));
  });
  it('비공개 퀴즈는 소유자만 읽을 수 있다', async () => {
    await seed(ID, quizData('alice', { isPublic: false }));
    await assertFails(getDoc(doc(guest(), 'quizzes', ID)));
    await assertFails(getDoc(doc(bob(), 'quizzes', ID)));
    await assertSucceeds(getDoc(doc(alice(), 'quizzes', ID)));
  });
  it('없는 퀴즈 조회는 거부가 아니라 "없음"으로 응답', async () => {
    await assertSucceeds(getDoc(doc(guest(), 'quizzes', ID)));
  });
  it('공개 목록 쿼리는 허용, 조건 없는 전체 목록 쿼리는 거부', async () => {
    await seed(ID, quizData('alice'));
    await seed(ID2, quizData('alice', { isPublic: false }));
    await assertSucceeds(getDocs(query(collection(guest(), 'quizzes'), where('isPublic', '==', true), where('status', '==', 'active'), orderBy('createdAt', 'desc'), limit(12))));
    await assertFails(getDocs(query(collection(guest(), 'quizzes'), limit(12))));
    await assertFails(getDocs(query(collection(bob(), 'quizzes'), where('ownerUid', '==', 'alice'))));
    await assertSucceeds(getDocs(query(collection(alice(), 'quizzes'), where('ownerUid', '==', 'alice'))));
  });
});

describe('생성', () => {
  it('로그인한 사용자는 본인 소유로 생성 가능', async () => {
    await assertSucceeds(setDoc(doc(alice(), 'quizzes', ID), quizData('alice')));
  });
  it('비로그인 사용자는 생성 불가', async () => {
    await assertFails(setDoc(doc(guest(), 'quizzes', ID), quizData('alice')));
  });
  it('ownerUid 를 다른 사람으로 위조하면 거부', async () => {
    await assertFails(setDoc(doc(bob(), 'quizzes', ID), quizData('alice')));
  });
  it('playCount 조작, status 조작, 허용되지 않은 필드는 거부', async () => {
    await assertFails(setDoc(doc(alice(), 'quizzes', ID), quizData('alice', { playCount: 9999 })));
    await assertFails(setDoc(doc(alice(), 'quizzes', ID), quizData('alice', { status: 'hidden' })));
    await assertFails(setDoc(doc(alice(), 'quizzes', ID), quizData('alice', { isAdmin: true })));
  });
  it('필수 필드·형식·길이 검증', async () => {
    await assertFails(setDoc(doc(alice(), 'quizzes', ID), quizData('alice', { title: '' })));
    await assertFails(setDoc(doc(alice(), 'quizzes', ID), quizData('alice', { title: '   ' })));
    await assertFails(setDoc(doc(alice(), 'quizzes', ID), quizData('alice', { title: '가'.repeat(101) })));
    await assertFails(setDoc(doc(alice(), 'quizzes', ID), quizData('alice', { description: 'a'.repeat(501) })));
    await assertFails(setDoc(doc(alice(), 'quizzes', ID), quizData('alice', { category: 'unknown' })));
    await assertFails(setDoc(doc(alice(), 'quizzes', ID), quizData('alice', { questions: [], questionCount: 0 })));
    await assertFails(setDoc(doc(alice(), 'quizzes', ID), quizData('alice', { questionCount: 5 })));
    await assertFails(setDoc(doc(alice(), 'quizzes', ID), quizData('alice', { isPublic: 'yes' })));
    await assertFails(setDoc(doc(alice(), 'quizzes', ID), quizData('alice', { imageUrl: 'javascript:alert(1)' })));
    const many = Array.from({ length: 101 }, (_, i) => ({ id: `q${i}`, type: 'text', question: 'q', answer: 'a' }));
    await assertFails(setDoc(doc(alice(), 'quizzes', ID), quizData('alice', { questions: many, questionCount: 101 })));
    const q0bad = [{ id: 'q', type: 'text', question: '', answer: 'a' }];
    await assertFails(setDoc(doc(alice(), 'quizzes', ID), quizData('alice', { questions: q0bad })));
  });
  it('시간을 클라이언트 값으로 조작하면 거부', async () => {
    await assertFails(setDoc(doc(alice(), 'quizzes', ID), quizData('alice', { createdAt: new Date('2000-01-01') })));
  });
});

describe('수정', () => {
  beforeEach(async () => seed(ID, quizData('alice')));
  it('소유자는 내용을 수정할 수 있다', async () => {
    await assertSucceeds(updateDoc(doc(alice(), 'quizzes', ID), { title: '바뀐 제목', isPublic: false, updatedAt: serverTimestamp() }));
  });
  it('다른 사용자는 수정 불가', async () => {
    await assertFails(updateDoc(doc(bob(), 'quizzes', ID), { title: '해킹', updatedAt: serverTimestamp() }));
  });
  it('소유자도 ownerUid·playCount·status 는 못 바꾼다', async () => {
    await assertFails(updateDoc(doc(alice(), 'quizzes', ID), { ownerUid: 'bob', updatedAt: serverTimestamp() }));
    await assertFails(updateDoc(doc(alice(), 'quizzes', ID), { playCount: 1000, updatedAt: serverTimestamp() }));
    await assertFails(updateDoc(doc(alice(), 'quizzes', ID), { status: 'hidden', updatedAt: serverTimestamp() }));
  });
  it('수정 시에도 검증 규칙 적용', async () => {
    await assertFails(updateDoc(doc(alice(), 'quizzes', ID), { title: '', updatedAt: serverTimestamp() }));
  });
  it('플레이 수는 로그인 사용자 누구나 +1 만 가능', async () => {
    await assertSucceeds(updateDoc(doc(bob(), 'quizzes', ID), { playCount: increment(1) }));
    await assertFails(updateDoc(doc(bob(), 'quizzes', ID), { playCount: increment(5) }));
    await assertFails(updateDoc(doc(bob(), 'quizzes', ID), { playCount: increment(-1) }));
    await assertFails(updateDoc(doc(guest(), 'quizzes', ID), { playCount: increment(1) }));
    await assertFails(updateDoc(doc(bob(), 'quizzes', ID), { playCount: increment(1), title: '해킹' }));
  });
  it('비공개 퀴즈는 다른 사람이 플레이 수도 못 바꾼다', async () => {
    await seed(ID2, quizData('alice', { isPublic: false }));
    await assertFails(updateDoc(doc(bob(), 'quizzes', ID2), { playCount: increment(1) }));
  });
});

describe('삭제', () => {
  beforeEach(async () => seed(ID, quizData('alice')));
  it('다른 사용자·비로그인은 삭제 불가', async () => {
    await assertFails(deleteDoc(doc(bob(), 'quizzes', ID)));
    await assertFails(deleteDoc(doc(guest(), 'quizzes', ID)));
  });
  it('소유자는 삭제 + 삭제 표시(묘비)를 함께 남길 수 있다', async () => {
    const db = alice();
    const batch = writeBatch(db);
    batch.delete(doc(db, 'quizzes', ID));
    batch.set(doc(db, 'deletedQuizzes', ID), { deletedAt: serverTimestamp() });
    await assertSucceeds(batch.commit());
    await assertSucceeds(getDoc(doc(guest(), 'deletedQuizzes', ID)));
  });
  it('남의 퀴즈에 삭제 표시를 만들 수 없다', async () => {
    await assertFails(setDoc(doc(bob(), 'deletedQuizzes', ID), { deletedAt: serverTimestamp() }));
    // 퀴즈를 지우지 않고 묘비만 만드는 것도 불가
    await assertFails(setDoc(doc(alice(), 'deletedQuizzes', ID), { deletedAt: serverTimestamp() }));
  });
});

describe('그 외 경로', () => {
  it('정의되지 않은 컬렉션은 읽기/쓰기 모두 차단', async () => {
    await assertFails(setDoc(doc(alice(), 'users', 'alice'), { a: 1 }));
    await assertFails(getDoc(doc(guest(), 'secrets', 'x')));
  });
});
