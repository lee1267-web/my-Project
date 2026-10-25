// 익명 인증: 회원가입 없이 "이 브라우저의 사용자"를 식별합니다.
// ⚠️ 브라우저 데이터를 지우거나 다른 기기를 쓰면 새 사용자가 되어 기존 퀴즈를 수정할 수 없습니다.
import { IS_DEMO } from './config.ts';
// Firebase SDK 는 필요할 때만 불러옵니다(데모 모드에서는 불러오지 않음).
const loadFirebase = () => import('./firebase.ts');
import { randomId } from '../utils/ids.ts';
import { toAppError } from '../utils/errors.ts';

const DEMO_UID_KEY = 'quizbang.demo.uid';
let readyPromise: Promise<import('firebase/auth').Auth> | null = null;
let signInPromise: Promise<string> | null = null;

function demoUid(): string {
  let uid: string | null = null;
  try { uid = localStorage.getItem(DEMO_UID_KEY); } catch { /* 저장 불가 환경 */ }
  if (!uid) {
    uid = `demo-${randomId(16)}`;
    try { localStorage.setItem(DEMO_UID_KEY, uid); } catch { /* 무시 */ }
  }
  return uid;
}

// 기존 로그인 상태 확인이 끝날 때까지 기다린 뒤 현재 uid(없으면 null)를 돌려줍니다.
export function waitForAuthReady(): Promise<string | null> {
  if (IS_DEMO) return Promise.resolve(demoUid());
  if (!readyPromise) {
    readyPromise = (async () => {
      const { getFirebase } = await loadFirebase();
      const { auth } = getFirebase();
      await auth.authStateReady();
      return auth;
    })().catch((err) => {
      readyPromise = null;
      throw toAppError(err);
    });
  }
  return readyPromise.then((auth) => auth.currentUser?.uid || null);
}

// 로그인이 필요할 때 호출: 아직 로그인하지 않았으면 익명 로그인을 합니다.
export async function ensureSignedIn(): Promise<string> {
  if (IS_DEMO) return demoUid();
  const uid = await waitForAuthReady();
  if (uid) return uid;
  if (!signInPromise) {
    signInPromise = (async () => {
      const { signInAnonymously } = await import('firebase/auth');
      const { getFirebase } = await loadFirebase();
      const { auth } = getFirebase();
      const cred = await signInAnonymously(auth);
      return cred.user.uid;
    })().catch((err) => {
      signInPromise = null;
      throw toAppError(err);
    });
  }
  return signInPromise;
}

export async function getCurrentUid(): Promise<string | null> {
  return waitForAuthReady();
}
