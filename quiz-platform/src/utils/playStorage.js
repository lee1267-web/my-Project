// 푸는 중인 상태와 결과를 sessionStorage(이 탭)에 보관합니다.
// → 새로고침해도 이어서 풀 수 있고, 결과 페이지를 새로고침해도 결과가 유지됩니다.
// 공유 링크 자체는 이 값에 전혀 의존하지 않습니다(없으면 처음부터 시작).

const PLAY = 'quizbang.play.';
const RESULT = 'quizbang.result.';

// 퀴즈가 수정되면 이전 진행 상태/결과를 쓰지 않도록 "버전"을 비교합니다.
export function quizVersion(quiz) {
  const t = quiz.updatedAt instanceof Date ? quiz.updatedAt.getTime() : 0;
  return `${t}:${quiz.questions.length}`;
}

function read(key) {
  try {
    const raw = sessionStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
function write(key, value) {
  try {
    sessionStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* 저장 불가(시크릿 모드 등)여도 풀이는 계속 가능 */
  }
}
function remove(key) {
  try { sessionStorage.removeItem(key); } catch { /* 무시 */ }
}

function validPlay(s) {
  return s && typeof s.version === 'string' && Number.isInteger(s.index) && s.index >= 0 && Array.isArray(s.answers) && typeof s.checked === 'boolean';
}

export const savePlayState = (id, s) => write(PLAY + id, s);
export const loadPlayState = (id) => {
  const s = read(PLAY + id);
  return validPlay(s) ? s : null;
};
export const clearPlayState = (id) => remove(PLAY + id);

export const saveResult = (id, r) => write(RESULT + id, r);
export const loadResult = (id) => {
  const r = read(RESULT + id);
  return r && typeof r.version === 'string' && Array.isArray(r.answers) ? r : null;
};
export const clearResult = (id) => remove(RESULT + id);
