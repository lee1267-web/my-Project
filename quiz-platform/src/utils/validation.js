import { LIMITS, CATEGORY_KEYS, IMAGE_TYPES } from './constants.js';

// 화면에서 사용하는 입력 검증입니다.
// ⚠️ 클라이언트 검증은 사용자 편의를 위한 것이며 보안을 보장하지 않습니다.
//    실제 방어는 firestore.rules / storage.rules 에서 다시 합니다.

const len = (s) => Array.from(String(s ?? '')).length;

// quiz: { title, description, category, isPublic, questions: [{id,type,question,answer,altAnswers,options}] }
// 반환: { valid, errors } — errors 의 key 는 필드 경로 (예: "questions.0.answer")
export function validateQuiz(quiz) {
  const errors = {};
  const title = String(quiz.title ?? '').trim();
  if (!title) errors.title = '퀴즈 제목을 입력해 주세요.';
  else if (len(title) > LIMITS.titleMax) errors.title = `제목은 ${LIMITS.titleMax}자 이하로 입력해 주세요.`;

  if (len(String(quiz.description ?? '').trim()) > LIMITS.descriptionMax) {
    errors.description = `설명은 ${LIMITS.descriptionMax}자 이하로 입력해 주세요.`;
  }

  if (!quiz.category) errors.category = '카테고리를 선택해 주세요.';
  else if (!CATEGORY_KEYS.includes(quiz.category)) errors.category = '올바른 카테고리를 선택해 주세요.';

  const questions = Array.isArray(quiz.questions) ? quiz.questions : [];
  if (questions.length < LIMITS.questionsMin) errors.questions = '문제를 최소 1개 이상 추가해 주세요.';
  else if (questions.length > LIMITS.questionsMax) errors.questions = `문제는 최대 ${LIMITS.questionsMax}개까지 만들 수 있습니다.`;

  questions.forEach((q, i) => {
    Object.assign(errors, validateQuestion(q, `questions.${i}`));
  });

  return { valid: Object.keys(errors).length === 0, errors };
}

export function validateQuestion(q, prefix) {
  const errors = {};
  const text = String(q.question ?? '').trim();
  if (!text) errors[`${prefix}.question`] = '문제 내용을 입력해 주세요.';
  else if (len(text) > LIMITS.questionMax) errors[`${prefix}.question`] = `문제는 ${LIMITS.questionMax}자 이하로 입력해 주세요.`;

  if (q.type === 'choice') {
    const options = (q.options || []).map((o) => String(o ?? '').trim());
    const filled = options.filter(Boolean);
    if (filled.length < LIMITS.optionsMin) {
      errors[`${prefix}.options`] = '내용이 있는 보기를 2개 이상 입력해 주세요.';
    } else if (options.length > LIMITS.optionsMax) {
      errors[`${prefix}.options`] = `보기는 최대 ${LIMITS.optionsMax}개까지 가능합니다.`;
    } else if (new Set(filled).size !== filled.length) {
      errors[`${prefix}.options`] = '같은 내용의 보기가 있습니다. 보기를 서로 다르게 입력해 주세요.';
    } else if (filled.some((o) => len(o) > LIMITS.optionMax)) {
      errors[`${prefix}.options`] = `보기는 ${LIMITS.optionMax}자 이하로 입력해 주세요.`;
    }
    const answer = String(q.answer ?? '').trim();
    if (!answer) errors[`${prefix}.answer`] = '정답 보기를 선택해 주세요.';
    else if (!filled.includes(answer)) errors[`${prefix}.answer`] = '정답은 보기 중 하나여야 합니다.';
  } else if (q.type === 'text') {
    const answer = String(q.answer ?? '').trim();
    if (!answer) errors[`${prefix}.answer`] = '정답을 입력해 주세요.';
    else if (len(answer) > LIMITS.answerMax) errors[`${prefix}.answer`] = `정답은 ${LIMITS.answerMax}자 이하로 입력해 주세요.`;
    const alts = q.altAnswers || [];
    if (alts.length > LIMITS.altAnswersMax) errors[`${prefix}.altAnswers`] = `추가 인정 답안은 최대 ${LIMITS.altAnswersMax}개입니다.`;
    else if (alts.some((a) => len(a) > LIMITS.answerMax)) errors[`${prefix}.altAnswers`] = `각 답안은 ${LIMITS.answerMax}자 이하로 입력해 주세요.`;
  } else {
    errors[`${prefix}.type`] = '문제 유형을 선택해 주세요.';
  }
  return errors;
}

// 이미지 파일 검증 (형식과 크기)
export function validateImageFile(file) {
  if (!file) return null;
  if (!IMAGE_TYPES.includes(file.type)) return 'JPG, PNG, WEBP, GIF 이미지만 올릴 수 있습니다.';
  if (file.size > LIMITS.imageMaxBytes) return `이미지는 ${LIMITS.imageMaxBytes / 1024 / 1024}MB 이하만 올릴 수 있습니다.`;
  if (file.size === 0) return '빈 파일은 올릴 수 없습니다.';
  return null;
}

// "답1, 답2" 형식 → ["답1","답2"]
export function parseAltAnswers(text) {
  return String(text ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}
