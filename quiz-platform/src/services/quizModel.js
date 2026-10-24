// 화면 입력값 → DB 에 저장할 형태로 정리합니다.
import { buildSearchTokens } from '../utils/search.js';
import { randomId } from '../utils/ids.js';

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

// DB 에서 읽은 데이터를 화면에서 쓰기 편한 형태로 (Timestamp → Date)
export function fromStored(id, data) {
  const toDate = (v) => (v && typeof v.toDate === 'function' ? v.toDate() : v ? new Date(v) : null);
  const questions = [...(data.questions || [])].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  return {
    id,
    title: data.title || '',
    description: data.description || '',
    category: data.category || 'etc',
    imageUrl: data.imageUrl || '',
    isPublic: Boolean(data.isPublic),
    status: data.status || 'active',
    ownerUid: data.ownerUid || '',
    questions,
    questionCount: data.questionCount ?? questions.length,
    playCount: data.playCount || 0,
    searchTokens: data.searchTokens || [],
    createdAt: toDate(data.createdAt),
    updatedAt: toDate(data.updatedAt),
  };
}
