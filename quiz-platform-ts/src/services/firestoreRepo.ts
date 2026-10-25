// 실제 Cloud Firestore 에 읽고 쓰는 코드입니다.
import {
  collection, doc, getDoc, getDocs, query, where, orderBy, limit, startAfter,
  serverTimestamp, writeBatch, updateDoc, increment, setDoc, type QueryConstraint,
} from 'firebase/firestore';
import type { Page, PageQuery, Quiz, QuizFields } from '../types.ts';
import { getFirebase } from './firebase.ts';
import { USE_EMULATORS } from './config.ts';
import { fromStored } from './quizModel.ts';
import { AppError, toAppError } from '../utils/errors.ts';
import { LIMITS } from '../utils/constants.ts';

const QUIZZES = 'quizzes';
const DELETED = 'deletedQuizzes'; // 삭제 표시(묘비): 삭제된 퀴즈와 없는 퀴즈를 구분하기 위함

const db = () => getFirebase().db;
// 화면에 표시할 이미지 주소 허용 범위 (utils/safeUrl.js)
const URL_OPTS = { emulator: USE_EMULATORS };

export function newQuizId(): string {
  return doc(collection(db(), QUIZZES)).id;
}

export async function getQuiz(id: string): Promise<Quiz> {
  let snap;
  try {
    snap = await getDoc(doc(db(), QUIZZES, id));
  } catch (err) {
    throw toAppError(err);
  }
  if (snap.exists()) return fromStored(snap.id, snap.data(), URL_OPTS);
  let deleted = false;
  try {
    deleted = (await getDoc(doc(db(), DELETED, id))).exists();
  } catch { /* 묘비 조회 실패는 무시 */ }
  throw deleted
    ? new AppError('deleted', '제작자가 삭제한 퀴즈입니다.')
    : new AppError('not-found', '퀴즈를 찾을 수 없습니다. 주소가 정확한지 확인해 주세요.');
}

// 공개 퀴즈 목록 (페이지네이션). cursor 는 이전 결과의 마지막 문서입니다.
export async function listPublicQuizzes({ category, token, sort = 'latest', cursor = null, pageSize = LIMITS.pageSize }: PageQuery): Promise<Page> {
  const parts: QueryConstraint[] = [where('isPublic', '==', true), where('status', '==', 'active')];
  if (category) parts.push(where('category', '==', category));
  if (token) parts.push(where('searchTokens', 'array-contains', token));
  parts.push(orderBy(sort === 'popular' ? 'playCount' : 'createdAt', 'desc'));
  if (cursor) parts.push(startAfter(cursor));
  parts.push(limit(pageSize));
  try {
    const snap = await getDocs(query(collection(db(), QUIZZES), ...parts));
    return {
      items: snap.docs.map((d) => fromStored(d.id, d.data(), URL_OPTS)),
      cursor: snap.docs.length ? snap.docs[snap.docs.length - 1] : null,
      hasMore: snap.docs.length === pageSize,
    };
  } catch (err) {
    throw toAppError(err);
  }
}

export async function listMyQuizzes(uid: string): Promise<Quiz[]> {
  try {
    const snap = await getDocs(
      query(collection(db(), QUIZZES), where('ownerUid', '==', uid), orderBy('updatedAt', 'desc'), limit(100)),
    );
    return snap.docs.map((d) => fromStored(d.id, d.data(), URL_OPTS));
  } catch (err) {
    throw toAppError(err);
  }
}

export async function createQuiz(id: string, fields: QuizFields, uid: string): Promise<string> {
  try {
    await setDoc(doc(db(), QUIZZES, id), {
      ...fields,
      ownerUid: uid, // 보안 규칙이 request.auth.uid 와 같은지 다시 확인합니다.
      status: 'active',
      playCount: 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return id;
  } catch (err) {
    throw toAppError(err);
  }
}

export async function updateQuiz(id: string, fields: QuizFields): Promise<void> {
  try {
    await updateDoc(doc(db(), QUIZZES, id), { ...fields, updatedAt: serverTimestamp() });
  } catch (err) {
    throw toAppError(err);
  }
}

export async function deleteQuiz(id: string): Promise<void> {
  try {
    const batch = writeBatch(db());
    batch.delete(doc(db(), QUIZZES, id));
    batch.set(doc(db(), DELETED, id), { deletedAt: serverTimestamp() });
    await batch.commit();
  } catch (err) {
    throw toAppError(err);
  }
}

export async function incrementPlayCount(id: string): Promise<void> {
  await updateDoc(doc(db(), QUIZZES, id), { playCount: increment(1) });
}
