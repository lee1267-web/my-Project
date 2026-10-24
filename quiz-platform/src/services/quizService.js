// 화면(pages)에서는 이 파일의 함수만 사용합니다.
// 내부에서 데모 모드면 demoRepo, Firebase 모드면 firestoreRepo 를 사용합니다.
import { IS_DEMO } from './config.js';
import { ensureSignedIn, getCurrentUid } from './auth.js';
import { createDemoRepo } from './demoRepo.js';
import { toEditableFields } from './quizModel.js';
import { uploadQuizImage, deleteImageUrls, deleteQuizFolder } from './storageService.js';
import { AppError } from '../utils/errors.js';
import { QUIZ_ID_PATTERN } from '../utils/constants.js';
import { parseSearchTerm, matchesSearch } from '../utils/search.js';
import { validateQuiz } from '../utils/validation.js';

const loadSamples = () => import('../data/samples/index.js').then((m) => m.SAMPLE_QUIZZES);

// 데모 모드는 처음 실행할 때 샘플 퀴즈를 넣어 두기 위해 샘플 파일을 불러옵니다.
let repoPromise = null;
function getRepo() {
  if (!repoPromise) {
    repoPromise = IS_DEMO
      ? loadSamples().then((samples) =>
          createDemoRepo({ seed: samples.map((s) => ({ id: s.demoId, fields: toEditableFields(s) })) }))
      : import('./firestoreRepo.js');
  }
  return repoPromise;
}

export function isValidQuizId(id) {
  return typeof id === 'string' && QUIZ_ID_PATTERN.test(id);
}

export async function getQuiz(id) {
  // 형식이 잘못된 ID 는 DB 에 묻지 않고 바로 "없음" 처리
  if (!isValidQuizId(id)) throw new AppError('not-found', '잘못된 퀴즈 주소입니다. 링크가 정확한지 확인해 주세요.');
  const uid = await getCurrentUid();
  return (await getRepo()).getQuiz(id, uid);
}

// 풀기·결과 화면용: 풀 수 있는 문제가 하나도 없으면(손상된 데이터) 안내
export async function getPlayableQuiz(id) {
  const quiz = await getQuiz(id);
  if (!quiz.questions.length) throw new AppError('unknown', '이 퀴즈에는 풀 수 있는 문제가 없어요. 제작자에게 문의해 주세요.');
  return quiz;
}

// search: 사용자가 입력한 검색어. 첫 단어는 DB 에서, 나머지 단어는 받아온 결과에서 거릅니다.
export async function listPublicQuizzes({ category = '', search = '', sort = 'latest', cursor = null } = {}) {
  const parsed = parseSearchTerm(search);
  const res = await (await getRepo()).listPublicQuizzes({ category, token: parsed?.primary, sort, cursor });
  return { ...res, items: res.items.filter((q) => matchesSearch(q, parsed)) };
}

export async function listMyQuizzes() {
  const uid = await ensureSignedIn();
  return { uid, items: await (await getRepo()).listMyQuizzes(uid) };
}

// form: 편집 화면의 상태. 새 이미지 파일은 form.thumbFile / question.imageFile 에 들어 있습니다.
// existing: 수정 중이면 원래 퀴즈
export async function saveQuiz(form, existing = null, onProgress = () => {}) {
  const { valid } = validateQuiz(form);
  if (!valid) throw new AppError('unknown', '입력 내용을 다시 확인해 주세요.');
  const repo = await getRepo();
  const uid = await ensureSignedIn();
  if (existing && existing.ownerUid !== uid) throw new AppError('forbidden', '본인이 만든 퀴즈만 수정할 수 있습니다.');
  const quizId = existing ? existing.id : repo.newQuizId();

  // 1) 새로 선택한 이미지 업로드
  const files = [form.thumbFile, ...form.questions.map((q) => q.imageFile)].filter(Boolean);
  let done = 0;
  const upload = async (file) => {
    onProgress(`이미지 업로드 중... (${done + 1}/${files.length})`);
    const url = await uploadQuizImage(file, { uid, quizId });
    done++;
    return url;
  };
  const data = { ...form, questions: form.questions.map((q) => ({ ...q })) };
  if (form.thumbFile) data.imageUrl = await upload(form.thumbFile);
  for (const q of data.questions) {
    if (q.imageFile) q.imageUrl = await upload(q.imageFile);
  }

  // 2) DB 저장
  onProgress('저장 중...');
  const fields = toEditableFields(data);
  if (existing) await repo.updateQuiz(quizId, fields, uid);
  else await repo.createQuiz(quizId, fields, uid);

  // 3) 수정으로 빠진 옛 이미지 정리
  if (existing) {
    const used = new Set([fields.imageUrl, ...fields.questions.map((q) => q.imageUrl)]);
    const old = [existing.imageUrl, ...existing.questions.map((q) => q.imageUrl)];
    await deleteImageUrls(old.filter((u) => u && !used.has(u)));
  }
  return quizId;
}

export async function deleteQuiz(quiz) {
  const uid = await ensureSignedIn();
  if (quiz.ownerUid !== uid) throw new AppError('forbidden', '본인이 만든 퀴즈만 삭제할 수 있습니다.');
  await (await getRepo()).deleteQuiz(quiz.id, uid);
  await deleteQuizFolder(uid, quiz.id);
}

// 퀴즈를 끝까지 풀었을 때 1 증가. 실패해도 플레이에는 영향을 주지 않습니다.
export async function recordPlay(quizId) {
  try {
    await ensureSignedIn();
    await (await getRepo()).incrementPlayCount(quizId);
  } catch (e) {
    console.warn('플레이 수 기록 실패', e);
  }
}

// 샘플 퀴즈를 "내 퀴즈"로 복사해 추가합니다. (Firebase 모드에서도 실제로 저장됨)
export async function getSampleList() {
  return (await loadSamples()).map((s) => ({ key: s.key, title: s.title, category: s.category, count: s.questions.length }));
}

export async function addSampleQuizzes(keys, onProgress = () => {}) {
  const samples = (await loadSamples()).filter((s) => keys.includes(s.key));
  const ids = [];
  for (const [i, sample] of samples.entries()) {
    onProgress(`샘플 퀴즈 추가 중... (${i + 1}/${samples.length})`);
    ids.push(await saveQuiz({ ...sample, isPublic: true }));
  }
  return ids;
}

export { IS_DEMO };
