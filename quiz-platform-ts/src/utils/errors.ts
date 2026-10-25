// Firebase 오류 코드를 사용자가 이해할 수 있는 한국어 메시지로 바꿉니다.

export type ErrorKind = 'not-found' | 'deleted' | 'forbidden' | 'network' | 'config' | 'auth' | 'unknown';

export class AppError extends Error {
  kind: ErrorKind;

  constructor(kind: ErrorKind, message: string, cause?: unknown) {
    super(message, { cause });
    this.kind = kind;
  }
}

// Firebase 등에서 오는 오류는 code·message·name 이 있을 수도, 없을 수도 있습니다.
type LooseError = { code?: unknown; message?: unknown; name?: unknown } | null | undefined;

export function toAppError(error: unknown): AppError {
  if (error instanceof AppError) return error;
  const err = error as LooseError;
  const code = String(err?.code || '');
  if (code === 'permission-denied' || code === 'storage/unauthorized') {
    return new AppError('forbidden', '이 작업을 할 권한이 없습니다. 비공개 퀴즈이거나 본인의 퀴즈가 아닐 수 있습니다.', err);
  }
  if (code === 'unavailable' || code === 'auth/network-request-failed' || code === 'storage/retry-limit-exceeded' || code === 'deadline-exceeded' || err?.name === 'NetworkError' || (typeof navigator !== 'undefined' && navigator.onLine === false)) {
    return new AppError('network', '네트워크에 연결할 수 없습니다. 인터넷 연결을 확인한 뒤 다시 시도해 주세요.', err);
  }
  if (code === 'auth/operation-not-allowed' || code === 'auth/admin-restricted-operation') {
    return new AppError('config', 'Firebase 익명 로그인이 꺼져 있습니다. Firebase 콘솔 > Authentication > 로그인 방법에서 "익명"을 사용 설정해 주세요.', err);
  }
  if (code === 'auth/invalid-api-key' || code === 'auth/api-key-not-valid' || code.startsWith('auth/api-key') || code === 'auth/configuration-not-found') {
    return new AppError('config', 'Firebase 설정값(API 키 등)이 올바르지 않습니다. .env 파일의 값을 다시 확인해 주세요.', err);
  }
  if (code === 'auth/unauthorized-domain' || code === 'auth/requests-from-referer-are-blocked' || code.includes('referer')) {
    return new AppError('config', '이 도메인은 Firebase 에서 허용되지 않았습니다. Authentication > 설정 > 승인된 도메인과 API 키 제한을 확인해 주세요.', err);
  }
  if (code === 'failed-precondition' && String(err?.message).includes('index')) {
    return new AppError('config', '이 검색/정렬에 필요한 Firestore 색인이 아직 없습니다. README 의 "보안 규칙 및 색인 배포"를 따라 색인을 배포해 주세요. (배포 후 몇 분 걸릴 수 있습니다)', err);
  }
  if (code === 'resource-exhausted' || code === 'storage/quota-exceeded') {
    return new AppError('unknown', '무료 사용량 한도에 도달했거나 저장 공간이 부족합니다. 잠시 후 다시 시도해 주세요.', err);
  }
  if (code === 'storage/canceled') return new AppError('unknown', '업로드가 취소되었습니다.', err);
  if (code === 'demo/quota') return new AppError('unknown', '이 브라우저의 저장 공간이 가득 찼습니다. 이미지를 줄이거나 오래된 데모 퀴즈를 삭제해 주세요.', err);
  if (code === 'invalid-argument') return new AppError('unknown', '저장할 수 없는 데이터 형식입니다. 입력 내용을 확인해 주세요.', err);
  console.error(err);
  return new AppError('unknown', '알 수 없는 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.', err);
}
