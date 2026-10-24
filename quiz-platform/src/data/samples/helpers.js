// 샘플 퀴즈 작성 도우미
// t(문제, 정답, [다른 인정 답안])  → 주관식
// c(문제, 정답, [보기...])          → 객관식 (정답은 반드시 보기 중 하나)
export const t = (question, answer, altAnswers = []) => ({ type: 'text', question, answer, altAnswers, options: [] });
export const c = (question, answer, options) => ({ type: 'choice', question, answer, options, altAnswers: [] });
