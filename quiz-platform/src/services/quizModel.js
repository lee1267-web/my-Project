// 화면 입력값 → DB 에 저장할 형태로 정리합니다.
import { buildSearchTokens } from '../utils/search.js';
import { randomId } from '../utils/ids.js';
import { safeImageUrl } from '../utils/safeUrl.js';
import { CATEGORY_KEYS } from '../utils/constants.js';

export function cleanQuestion(q, index) {
  const type = q.type === 'choice' ? 'choice' : 'text';
  const base = {
    id: q.id || randomId(8),
    type,
    question: String(q.question || '').trim(),
    answer: String(q.answer || '').trim(),
    imageUrl: q.imageUrl || '',
    order: index,
  };
  if (type === 'choice') {
    base.options = (q.options || []).map((o) => String(o || '').trim()).filter(Boolean);
    base.altAnswers = [];
  } else {
    base.options = [];
    base.altAnswers = (q.altAnswers || []).map((a) => String(a || '').trim()).filter(Boolean);
  }
  return base;
}

// 소유자가 수정할 수 있는 필드만 담습니다. (ownerUid/createdAt/playCount/status 는 별도 관리)
export function toEditableFields(form) {
  const title = String(form.title || '').trim();
  return {
    title,
    description: String(form.description || '').trim(),
    category: form.category,
    imageUrl: form.imageUrl || '',
    isPublic: Boolean(form.isPublic),
    questions: (form.questions || []).map(cleanQuestion),
    questionCount: (form.questions || []).length,
    searchTokens: buildSearchTokens(title),
  };
}

// DB 에서 읽은 데이터를 화면에서 쓰기 편한 형태로 정리합니다. (Timestamp → Date)
// ⚠️ DB 데이터는 누군가 직접 API 로 써 넣었을 수 있으므로 "믿지 않고" 형식을 강제로 맞춥니다.
//    (보안 규칙은 첫 문제만 검사할 수 있어서, 나머지 문제의 형식은 여기서 정리)
const str = (v, max = 2000) => (typeof v === 'string' ? v : v == null ? '' : String(v)).slice(0, max);
const strList = (v, maxItems) => (Array.isArray(v) ? v.filter((x) => typeof x === 'string').map((x) => str(x, 200)).slice(0, maxItems) : []);
const num = (v) => (Number.isFinite(v) && v >= 0 ? Math.floor(v) : 0);

function cleanStoredQuestion(q, index, urlOpts) {
  const raw = q && typeof q === 'object' ? q : {};
  const type = raw.type === 'choice' ? 'choice' : 'text';
  return {
    id: str(raw.id, 40) || `q${index}`,
    type,
    question: str(raw.question, 1000),
    answer: str(raw.answer, 200),
    altAnswers: type === 'text' ? strList(raw.altAnswers, 10) : [],
    options: type === 'choice' ? strList(raw.options, 10) : [],
    imageUrl: safeImageUrl(raw.imageUrl, urlOpts),
    order: Number.isFinite(raw.order) ? raw.order : index,
  };
}

// urlOpts: { demo, emulator } — 어떤 이미지 주소를 허용할지 (utils/safeUrl.js)
export function fromStored(id, data, urlOpts = {}) {
  const toDate = (v) => {
    const d = v && typeof v.toDate === 'function' ? v.toDate() : v ? new Date(v) : null;
    return d && !Number.isNaN(d.getTime()) ? d : null;
  };
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
    category: CATEGORY_KEYS.includes(data.category) ? data.category : 'etc',
    imageUrl: safeImageUrl(data.imageUrl, urlOpts),
    isPublic: data.isPublic === true,
    status: str(data.status, 20) || 'active',
    ownerUid: str(data.ownerUid, 128),
    questions,
    questionCount: questions.length,
    playCount: num(data.playCount),
    searchTokens: strList(data.searchTokens, 200),
    createdAt: toDate(data.createdAt),
    updatedAt: toDate(data.updatedAt),
  };
}
