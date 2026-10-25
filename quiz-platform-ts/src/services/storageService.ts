// 이미지 업로드
//  - Firebase 모드: Firebase Storage 의 quiz-images/{uid}/{quizId}/ 폴더에 저장
//  - 데모 모드: 이미지를 작게 줄여 data URL 로 바꾼 뒤 퀴즈 데이터와 함께 브라우저에 저장
import { IS_DEMO, STORAGE_ENABLED } from './config.ts';
const getFirebaseStorage = () => import('./firebase.ts').then((m) => m.getFirebaseStorage());
import { validateImageFile } from '../utils/validation.ts';
import { AppError, toAppError } from '../utils/errors.ts';
import { randomId } from '../utils/ids.ts';

const EXT: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif' };

export const isImageUploadEnabled = () => STORAGE_ENABLED;

function shrinkToDataUrl(file: File, maxSize = 640): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext('2d')?.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL('image/jpeg', 0.75));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new AppError('unknown', '이미지 파일을 읽을 수 없습니다. 다른 이미지를 선택해 주세요.'));
    };
    img.src = url;
  });
}

export async function uploadQuizImage(file: File, { uid, quizId }: { uid: string; quizId: string }): Promise<string> {
  const problem = validateImageFile(file);
  if (problem) throw new AppError('unknown', problem);
  if (!STORAGE_ENABLED) throw new AppError('config', '이미지 업로드가 비활성화되어 있습니다.');
  if (IS_DEMO) return shrinkToDataUrl(file);
  try {
    const { storage, mod } = await getFirebaseStorage();
    const path = `quiz-images/${uid}/${quizId}/${randomId(12)}.${EXT[file.type]}`;
    const fileRef = mod.ref(storage, path);
    await mod.uploadBytes(fileRef, file, { contentType: file.type });
    return await mod.getDownloadURL(fileRef);
  } catch (err) {
    throw toAppError(err);
  }
}

export async function deleteQuizFolder(uid: string, quizId: string): Promise<void> {
  if (IS_DEMO || !STORAGE_ENABLED) return;
  try {
    const { storage, mod } = await getFirebaseStorage();
    const res = await mod.listAll(mod.ref(storage, `quiz-images/${uid}/${quizId}`));
    await Promise.allSettled(res.items.map((item) => mod.deleteObject(item)));
  } catch (e) {
    console.warn('이미지 폴더 삭제 실패', e);
  }
}

// 다운로드 주소 → Storage 경로 (예: .../o/quiz-images%2Fuid%2Fqid%2Fa.png?alt=... → quiz-images/uid/qid/a.png)
export function storagePathFromUrl(url: string | null | undefined): string {
  const m = /\/o\/([^?]+)/.exec(String(url || ''));
  if (!m) return '';
  try {
    return decodeURIComponent(m[1] ?? '');
  } catch {
    return '';
  }
}

// 퀴즈 폴더에서 usedUrls 에 없는 파일을 지웁니다. (실패해도 저장에는 영향 없음)
export async function cleanupQuizFolder(uid: string, quizId: string, usedUrls: string[]): Promise<void> {
  if (IS_DEMO || !STORAGE_ENABLED) return;
  const used = new Set(usedUrls.map(storagePathFromUrl).filter(Boolean));
  try {
    const { storage, mod } = await getFirebaseStorage();
    const res = await mod.listAll(mod.ref(storage, `quiz-images/${uid}/${quizId}`));
    await Promise.allSettled(res.items.filter((item) => !used.has(item.fullPath)).map((item) => mod.deleteObject(item)));
  } catch (e) {
    console.warn('이미지 정리 실패', e);
  }
}
