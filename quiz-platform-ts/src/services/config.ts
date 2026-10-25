// 환경변수(.env)를 읽어 앱이 어떤 모드로 동작할지 결정합니다.
// Vite 는 VITE_ 로 시작하는 변수만 브라우저 코드에 넣어 줍니다.
const env = import.meta.env;

export const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY || '',
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || '',
  projectId: env.VITE_FIREBASE_PROJECT_ID || '',
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: env.VITE_FIREBASE_APP_ID || '',
};

const REQUIRED = {
  VITE_FIREBASE_API_KEY: firebaseConfig.apiKey,
  VITE_FIREBASE_AUTH_DOMAIN: firebaseConfig.authDomain,
  VITE_FIREBASE_PROJECT_ID: firebaseConfig.projectId,
  VITE_FIREBASE_APP_ID: firebaseConfig.appId,
};

export const DATA_MODE = env.VITE_DATA_MODE === 'demo' ? 'demo' : 'firebase';
export const IS_DEMO = DATA_MODE === 'demo';
export const USE_EMULATORS = env.VITE_USE_EMULATORS === 'true';
export const RECAPTCHA_SITE_KEY = env.VITE_RECAPTCHA_SITE_KEY || '';

// 비어 있는 필수 설정 이름 목록
export const missingConfigKeys: string[] = IS_DEMO ? [] : Object.entries(REQUIRED).filter(([, v]) => !v).map(([k]) => k);
export const IS_CONFIG_OK = IS_DEMO || missingConfigKeys.length === 0;

// 이미지 업로드 가능 여부
//  - 데모 모드: 이미지를 줄여서 브라우저에 저장 (가능)
//  - Firebase 모드: VITE_ENABLE_STORAGE=true 이고 버킷이 설정된 경우만
export const STORAGE_ENABLED = IS_DEMO || (env.VITE_ENABLE_STORAGE === 'true' && Boolean(firebaseConfig.storageBucket));
