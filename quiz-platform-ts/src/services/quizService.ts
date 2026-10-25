// 화면(pages)에서는 이 파일의 함수만 사용합니다.
// 내부에서 데모 모드면 demoRepo, Firebase 모드면 firestoreRepo 를 사용합니다.
import { IS_DEMO } from './config.ts';
import { ensureSignedIn, getCurrentUid } from './auth.ts';
import { createDemoRepo } from './demoRepo.ts';
import { toEditableFields } from './quizModel.ts';
import { uploadQuizImage, cleanupQuizFolder, deleteQuizFolder } from './storageService.ts';
import { collectPages } from '../utils/paging.ts';
import { AppError } from '../utils/errors.ts';
import { QUIZ_ID_PATTERN, getSubcategory } from '../utils/constants.ts';
import { parseSearchTerm, matchesSearch, subToken } from '../utils/search.ts';
import { validateQuiz } from '../utils/validation.ts';
import { hashSeed } from '../utils/shuffle.ts';
import type { EditorForm, ListParams, Page, Quiz, QuizRepo } from '../types.ts';

const loadSamples = () => import('../data/samples/index.ts').then((m) => m.SAMPLE_QUIZZES);

// 데모 모드는 처음 실행할 때 샘플 퀴즈를 넣어 두기 위해 샘플 파일을 불러옵니다.
let repoPromise: Promise<QuizRepo> | null = null;
function getRepo(): Promise<QuizRepo> {
  if (!repoPromise) {
    repoPromise = IS_DEMO
      ? loadSamples().then((samples) => {
        // 샘플 원본 내용으로 버전을 만들어, 내용이 조금이라도 바뀌면 데모 브라우저의 샘플도 자동으로 갱신됩니다.
        // (toEditableFields 는 문제 ID 를 무작위로 붙이므로 그 결과가 아닌 원본으로 계산)
        const seedVersion = `h${hashSeed(JSON.stringify(samples))}`;
        const seed = samples.map((s) => ({ id: s.demoId, fields: toEditableFields(s) }));
        return createDemoRepo({ seed, seedVersion });
      })
      : import('./firestoreRepo.ts');
  }
  return repoPromise;
}

export function isValidQuizId(id: unknown): id is string {
  return typeof id === 'string' && QUIZ_ID_PATTERN.test(id);
}

export async function getQuiz(id: string): Promise<Quiz> {
  // 형식이 잘못된 ID 는 DB 에 묻지 않고 바로 "없음" 처리
  if (!isValidQuizId(id)) throw new AppError('not-found', '잘못된 퀴즈 주소입니다. 링크가 정확한지 확인해 주세요.');
  const uid = await getCurrentUid();
  return (await getRepo()).getQuiz(id, uid);
}

// 풀기·결과 화면용: 풀 수 있는 문제가 하나도 없으면(손상된 데이터) 안내
export async function getPlayableQuiz(id: string): Promise<Quiz> {
  const quiz = await getQuiz(id);
  if (!quiz.questions.length) throw new AppError('unknown', '이 퀴즈에는 풀 수 있는 문제가 없어요. 제작자에게 문의해 주세요.');
  return quiz;
}

// search: 사용자가 입력한 검색어. 첫 단어는 DB 에서, 나머지 단어는 받아온 결과에서 거릅니다.
// subcategory: 세부 분류 버튼으로 고른 값 (예: 'ballad'). 고르면 그 분류로 정확히 거르고,
//              검색어의 모든 단어는 받아온 결과에서 다시 거릅니다.
export async function listPublicQuizzes({ category = '', subcategory = '', search = '', sort = 'latest', cursor = null }: ListParams = {}): Promise<Page> {
  const parsed = parseSearchTerm(search);
  const useSub = Boolean(category && getSubcategory(category, subcategory));
  const token = useSub ? subToken(subcategory) : parsed?.primary;
  const repo = await getRepo();
  return collectPages(
    (c) => repo.listPublicQuizzes({ category, token, sort, cursor: c }),
    (q) => matchesSearch(q, parsed),
    { cursor },
  );
}

export async function listMyQuizzes(): Promise<{ uid: string; items: Quiz[] }> {
  const uid = await ensureSignedIn();
  return { uid, items: await (await getRepo()).listMyQuizzes(uid) };
}

// 새 퀴즈의 ID. 편집 화면이 한 번 받아 두고 저장을 다시 시도할 때도 같은 ID를 씁니다.
// (같은 ID 폴더에 이미지가 올라가야 다시 올리지 않고, 남은 파일도 정리할 수 있음)
export async function newQuizId(): Promise<string> {
  return (await getRepo()).newQuizId();
}

// 이미 올린 파일 기억: 저장이 실패한 뒤 다시 저장할 때 같은 파일을 또 올리지 않도록
const uploaded = new WeakMap<File, { quizId: string; url: string }>();

// 동시에 n 개씩 실행
async function runPool<T>(tasks: (() => Promise<T>)[], n: number): Promise<T[]> {
  const results: T[] = new Array(tasks.length);
  let i = 0;
  const worker = async () => {
    while (i < tasks.length) {
      const k = i++;
      results[k] = await tasks[k]!();
    }
  };
  await Promise.all(Array.from({ length: Math.min(n, tasks.length) }, worker));
  return results;
}

// form: 편집 화면의 상태. 새 이미지 파일은 form.thumbFile / question.imageFile 에 들어 있습니다.
// existing: 수정 중이면 원래 퀴즈 / options.quizId: 새 퀴즈일 때 미리 받아 둔 ID
export async function saveQuiz(
  form: EditorForm,
  existing: Quiz | null = null,
  onProgress: (message: string) => void = () => {},
  options: { quizId?: string } = {},
): Promise<string> {
  const { valid } = validateQuiz(form);
  if (!valid) throw new AppError('unknown', '입력 내용을 다시 확인해 주세요.');
  const repo = await getRepo();
  const uid = await ensureSignedIn();
  if (existing && existing.ownerUid !== uid) throw new AppError('forbidden', '본인이 만든 퀴즈만 수정할 수 있습니다.');
  const quizId = existing ? existing.id : options.quizId || repo.newQuizId();

  // 1) 새로 선택한 이미지 업로드 (4개씩 동시에, 이미 올린 파일은 건너뜀)
  const data = { ...form, questions: form.questions.map((q) => ({ ...q })) };
  const targets: { file: File; set: (url: string) => void }[] = [];
  if (form.thumbFile) targets.push({ file: form.thumbFile, set: (url) => { data.imageUrl = url; } });
  data.questions.forEach((q) => {
    if (q.imageFile) targets.push({ file: q.imageFile, set: (url) => { q.imageUrl = url; } });
  });
  let done = 0;
  await runPool(targets.map((t) => async () => {
    const cached = uploaded.get(t.file);
    let url = cached && cached.quizId === quizId ? cached.url : null;
    if (!url) {
      url = await uploadQuizImage(t.file, { uid, quizId });
      uploaded.set(t.file, { quizId, url });
    }
    t.set(url);
    done++;
    onProgress(`이미지 업로드 중... (${done}/${targets.length})`);
  }), 4);

  // 2) DB 저장
  onProgress('저장 중...');
  const fields = toEditableFields(data);
  if (existing) await repo.updateQuiz(quizId, fields, uid);
  else await repo.createQuiz(quizId, fields, uid);

  // 3) 이 퀴즈 폴더에서 지금 쓰지 않는 이미지 정리
  //    (수정으로 빠진 이미지, 실패했던 저장 시도에서 올라간 파일, 다른 탭에서 올린 뒤 덮어쓴 파일)
  await cleanupQuizFolder(uid, quizId, [fields.imageUrl, ...fields.questions.map((q) => q.imageUrl)]);
  return quizId;
}

export async function deleteQuiz(quiz: Quiz): Promise<void> {
  const uid = await ensureSignedIn();
  if (quiz.ownerUid !== uid) throw new AppError('forbidden', '본인이 만든 퀴즈만 삭제할 수 있습니다.');
  await (await getRepo()).deleteQuiz(quiz.id, uid);
  await deleteQuizFolder(uid, quiz.id);
}

// 퀴즈를 끝까지 풀었을 때 1 증가. 실패해도 플레이에는 영향을 주지 않습니다.
export async function recordPlay(quizId: string): Promise<void> {
  try {
    await ensureSignedIn();
    await (await getRepo()).incrementPlayCount(quizId);
  } catch (e) {
    console.warn('플레이 수 기록 실패', e);
  }
}

// 샘플 퀴즈를 "내 퀴즈"로 복사해 추가합니다. (Firebase 모드에서도 실제로 저장됨)
export async function getSampleList(): Promise<{ key: string; title: string; category: string; count: number }[]> {
  return (await loadSamples()).map((s) => ({ key: s.key, title: s.title, category: s.category, count: s.questions.length }));
}

export async function addSampleQuizzes(keys: string[], onProgress: (message: string) => void = () => {}): Promise<string[]> {
  const samples = (await loadSamples()).filter((s) => keys.includes(s.key));
  const ids: string[] = [];
  for (const [i, sample] of samples.entries()) {
    onProgress(`샘플 퀴즈 추가 중... (${i + 1}/${samples.length})`);
    ids.push(await saveQuiz({ ...sample, isPublic: true }));
  }
  return ids;
}

export { IS_DEMO };
