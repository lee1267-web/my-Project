// 화면 입력값 → DB 에 저장할 형태로 정리합니다.
import { buildSearchTokens } from '../utils/search.ts';
import { randomId } from '../utils/ids.ts';
import { safeImageUrl } from '../utils/safeUrl.ts';
import { CATEGORY_KEYS, LIMITS, getSubcategory } from '../utils/constants.ts';
import { cleanTags } from '../utils/validation.ts';
import type { Question, QuestionInput, QuestionType, Quiz, QuizFields, QuizForm, UrlOptions } from '../types.ts';

export function cleanQuestion(q: QuestionInput, index: number): Question {
  const type: QuestionType = q.type === 'choice' ? 'choice' : 'text';
  const trimList = (list: string[] | undefined) => (list || []).map((x) => String(x || '').trim()).filter(Boolean);
  return {
    id: q.id || randomId(8),
    type,
    question: String(q.question || '').trim(),
    answer: String(q.answer || '').trim(),
    altAnswers: type === 'text' ? trimList(q.altAnswers) : [],
    options: type === 'choice' ? trimList(q.options) : [],
    imageUrl: q.imageUrl || '',
    order: index,
  };
}

// 소유자가 수정할 수 있는 필드만 담습니다. (ownerUid/createdAt/playCount/status 는 별도 관리)
export function toEditableFields(form: QuizForm): QuizFields {
  const title = String(form.title || '').trim();
  const subcategory = getSubcategory(form.category, form.subcategory) ? form.subcategory || '' : '';
  const tags = cleanTags(form.tags).slice(0, LIMITS.tagsMax).map((t) => t.slice(0, LIMITS.tagMax));
  return {
    title,
    description: String(form.description || '').trim(),
    category: form.category || '',
    subcategory,
    tags,
    imageUrl: form.imageUrl || '',
    isPublic: Boolean(form.isPublic),
    questions: (form.questions || []).map(cleanQuestion),
    questionCount: (form.questions || []).length,
    searchTokens: buildSearchTokens({ title, category: form.category, subcategory, tags }),
  };
}

// DB 에서 읽은 데이터를 화면에서 쓰기 편한 형태로 정리합니다. (Timestamp → Date)
// ⚠️ DB 데이터는 누군가 직접 API 로 써 넣었을 수 있으므로 "믿지 않고" 형식을 강제로 맞춥니다.
//    (보안 규칙은 첫 문제만 검사할 수 있어서, 나머지 문제의 형식은 여기서 정리)
// DB 에서 읽은 값은 어떤 모양이든 올 수 있다고 보고 unknown 으로 받습니다.
type Raw = Record<string, unknown>;
const str = (v: unknown, max = 2000): string => (typeof v === 'string' ? v : v == null ? '' : String(v)).slice(0, max);
const strList = (v: unknown, maxItems: number): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string').map((x) => str(x, 200)).slice(0, maxItems) : []);
const num = (v: unknown): number => (typeof v === 'number' && Number.isFinite(v) && v >= 0 ? Math.floor(v) : 0);

function cleanStoredQuestion(q: unknown, index: number, urlOpts: UrlOptions): Question {
  const raw: Raw = q && typeof q === 'object' ? (q as Raw) : {};
  const type: QuestionType = raw.type === 'choice' ? 'choice' : 'text';
  return {
    id: str(raw.id, 40) || `q${index}`,
    type,
    question: str(raw.question, 1000),
    answer: str(raw.answer, 200),
    altAnswers: type === 'text' ? strList(raw.altAnswers, 10) : [],
    options: type === 'choice' ? strList(raw.options, 10) : [],
    imageUrl: safeImageUrl(raw.imageUrl, urlOpts),
    order: typeof raw.order === 'number' && Number.isFinite(raw.order) ? raw.order : index,
  };
}

// urlOpts: { demo, emulator } — 어떤 이미지 주소를 허용할지 (utils/safeUrl.js)
export function fromStored(id: string, input: object, urlOpts: UrlOptions = {}): Quiz {
  const data = input as Raw;
  // Firestore Timestamp(toDate 가 있음) 또는 ISO 문자열 → Date
  const toDate = (v: unknown): Date | null => {
    const ts = v as { toDate?: () => Date } | null;
    const d = ts && typeof ts.toDate === 'function' ? ts.toDate() : v ? new Date(v as string) : null;
    return d && !Number.isNaN(d.getTime()) ? d : null;
  };
  const category = str(data.category, 40);
  const subcategory = str(data.subcategory, 40);
  const questions = (Array.isArray(data.questions) ? data.questions : [])
    .slice(0, 100)
    .map((q, i) => cleanStoredQuestion(q, i, urlOpts))
    // 채점할 수 없는(내용이나 정답이 빈) 문제는 빼서 화면 오류를 막습니다.
    .filter((q) => q.question && q.answer && (q.type === 'text' || q.options.includes(q.answer)))
    .sort((a, b) => a.order - b.order);
  return {
    id,
    title: str(data.title, 200),
    description: str(data.description, 1000),
    category: CATEGORY_KEYS.includes(category) ? category : 'etc',
    subcategory: getSubcategory(category, subcategory) ? subcategory : '',
    tags: strList(data.tags, LIMITS.tagsMax).map((x) => x.slice(0, LIMITS.tagMax)),
    imageUrl: safeImageUrl(data.imageUrl, urlOpts),
    isPublic: data.isPublic === true,
    status: str(data.status, 20) || 'active',
    ownerUid: str(data.ownerUid, 128),
    questions,
    questionCount: questions.length,
    playCount: num(data.playCount),
    searchTokens: strList(data.searchTokens, 300),
    createdAt: toDate(data.createdAt),
    updatedAt: toDate(data.updatedAt),
  };
}
