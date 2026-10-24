// Firebase 초기화. 실제로 Firebase 모드일 때만 호출됩니다.
import { initializeApp } from 'firebase/app';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { firebaseConfig, USE_EMULATORS, RECAPTCHA_SITE_KEY, STORAGE_ENABLED, IS_CONFIG_OK, IS_DEMO } from './config.js';

let app, db, auth, storagePromise;

export function getFirebase() {
  if (IS_DEMO) throw new Error('데모 모드에서는 Firebase 를 사용하지 않습니다.');
  if (!IS_CONFIG_OK) throw new Error('Firebase 설정이 비어 있습니다.');
  if (!app) {
    app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    auth = getAuth(app);
    auth.languageCode = 'ko';
    if (USE_EMULATORS) {
      const host = '127.0.0.1'; // firebase.json 의 emulators.host 와 같아야 합니다
      connectFirestoreEmulator(db, host, 8080);
      connectAuthEmulator(auth, `http://${host}:9099`, { disableWarnings: true });
    }
    if (RECAPTCHA_SITE_KEY && !USE_EMULATORS) {
      // App Check: 등록된 웹사이트에서 온 요청인지 확인 (선택 사항)
      import('firebase/app-check')
        .then(({ initializeAppCheck, ReCaptchaV3Provider }) =>
          initializeAppCheck(app, { provider: new ReCaptchaV3Provider(RECAPTCHA_SITE_KEY), isTokenAutoRefreshEnabled: true }),
        )
        .catch((e) => console.warn('App Check 초기화 실패', e));
    }
  }
  return { app, db, auth };
}

// Storage 는 필요할 때만 불러옵니다(초기 로딩을 가볍게).
export function getFirebaseStorage() {
  if (!STORAGE_ENABLED || IS_DEMO) return Promise.reject(new Error('Storage 가 비활성화되어 있습니다.'));
  if (!storagePromise) {
    const { app } = getFirebase();
    storagePromise = import('firebase/storage').then((mod) => {
      const storage = mod.getStorage(app);
      if (USE_EMULATORS) mod.connectStorageEmulator(storage, location.hostname, 9199);
      return { storage, mod };
    });
  }
  return storagePromise;
}
