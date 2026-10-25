// Firebase 초기화. 실제로 Firebase 모드일 때만 호출됩니다.
import { initializeApp, type FirebaseApp } from 'firebase/app';
import { getFirestore, connectFirestoreEmulator, type Firestore } from 'firebase/firestore';
import { getAuth, connectAuthEmulator, type Auth } from 'firebase/auth';
import { initializeAppCheck, ReCaptchaV3Provider } from 'firebase/app-check';
import { firebaseConfig, USE_EMULATORS, RECAPTCHA_SITE_KEY, STORAGE_ENABLED, IS_CONFIG_OK, IS_DEMO } from './config.ts';

type StorageModule = typeof import('firebase/storage');
export interface StorageHandle {
  storage: import('firebase/storage').FirebaseStorage;
  mod: StorageModule;
}

let app: FirebaseApp | undefined;
let db: Firestore;
let auth: Auth;
let storagePromise: Promise<StorageHandle> | undefined;

// firebase.json 의 emulators.host 와 같아야 합니다. (보안 규칙의 에뮬레이터 이미지 주소도 이 값 기준)
export const EMULATOR_HOST = '127.0.0.1';

export function getFirebase(): { app: FirebaseApp; db: Firestore; auth: Auth } {
  if (IS_DEMO) throw new Error('데모 모드에서는 Firebase 를 사용하지 않습니다.');
  if (!IS_CONFIG_OK) throw new Error('Firebase 설정이 비어 있습니다.');
  if (!app) {
    app = initializeApp(firebaseConfig);
    // App Check 는 Firestore·Auth 보다 먼저 켜야 첫 요청부터 토큰이 붙습니다. (선택 사항)
    if (RECAPTCHA_SITE_KEY && !USE_EMULATORS) {
      try {
        initializeAppCheck(app, { provider: new ReCaptchaV3Provider(RECAPTCHA_SITE_KEY), isTokenAutoRefreshEnabled: true });
      } catch (e) {
        console.warn('App Check 초기화 실패', e);
      }
    }
    db = getFirestore(app);
    auth = getAuth(app);
    auth.languageCode = 'ko';
    if (USE_EMULATORS) {
      connectFirestoreEmulator(db, EMULATOR_HOST, 8080);
      connectAuthEmulator(auth, `http://${EMULATOR_HOST}:9099`, { disableWarnings: true });
    }
  }
  return { app, db, auth };
}

// Storage 는 필요할 때만 불러옵니다(초기 로딩을 가볍게).
export function getFirebaseStorage(): Promise<StorageHandle> {
  if (!STORAGE_ENABLED || IS_DEMO) return Promise.reject(new Error('Storage 가 비활성화되어 있습니다.'));
  if (!storagePromise) {
    const { app: firebaseApp } = getFirebase();
    storagePromise = import('firebase/storage').then((mod) => {
      const storage = mod.getStorage(firebaseApp);
      if (USE_EMULATORS) mod.connectStorageEmulator(storage, EMULATOR_HOST, 9199);
      return { storage, mod };
    });
  }
  return storagePromise;
}
