// 이미지 업로드
//  - Firebase 모드: Firebase Storage 의 quiz-images/{uid}/{quizId}/ 폴더에 저장
//  - 데모 모드: 이미지를 작게 줄여 data URL 로 바꾼 뒤 퀴즈 데이터와 함께 브라우저에 저장
import { IS_DEMO, STORAGE_ENABLED } from './config.js';
import { getFirebaseStorage } from './firebase.js';
import { validateImageFile } from '../utils/validation.js';
import { AppError, toAppError } from '../utils/errors.js';
import { randomId } from '../utils/ids.js';

const EXT = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif' };

export const isImageUploadEnabled = () => STORAGE_ENABLED;

function shrinkToDataUrl(file, maxSize = 640) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
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

export async function uploadQuizImage(file, { uid, quizId }) {
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

// 더 이상 쓰지 않는 이미지 삭제 (실패해도 퀴즈 저장에는 영향 없음)
export async function deleteImageUrls(urls) {
  if (IS_DEMO || !STORAGE_ENABLED) return;
  const targets = urls.filter((u) => u && u.includes('/o/quiz-images%2F'));
  if (!targets.length) return;
  try {
    const { storage, mod } = await getFirebaseStorage();
    await Promise.allSettled(targets.map((u) => mod.deleteObject(mod.ref(storage, u))));
  } catch (e) {
    console.warn('이미지 삭제 실패', e);
  }
}

export async function deleteQuizFolder(uid, quizId) {
  if (IS_DEMO || !STORAGE_ENABLED) return;
  try {
    const { storage, mod } = await getFirebaseStorage();
    const res = await mod.listAll(mod.ref(storage, `quiz-images/${uid}/${quizId}`));
    await Promise.allSettled(res.items.map((item) => mod.deleteObject(item)));
  } catch (e) {
    console.warn('이미지 폴더 삭제 실패', e);
  }
}
