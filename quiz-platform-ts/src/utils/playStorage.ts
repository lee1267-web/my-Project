import type { Answer } from '../types.ts';

// 푸는 중인 상태와 결과를 sessionStorage(이 탭)에 보관합니다.
// → 새로고침해도 이어서 풀 수 있고, 결과 페이지를 새로고침해도 결과가 유지됩니다.
// 공유 링크 자체는 이 값에 전혀 의존하지 않습니다(없으면 처음부터 시작).

const PLAY = 'quizbang.play.';
const RESULT = 'quizbang.result.';

// 퀴즈가 수정되면 이전 진행 상태/결과를 쓰지 않도록 "버전"을 비교합니다.
export function quizVersion(quiz: { updatedAt: Date | null; questions: unknown[] }): string {
  const t = quiz.updatedAt instanceof Date ? quiz.updatedAt.getTime() : 0;
  return `${t}:${quiz.questions.length}`;
}

function read(key: string): unknown {
  try {
    const raw = sessionStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
function write(key: string, value: unknown): void {
  try {
    sessionStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* 저장 불가(시크릿 모드 등)여도 풀이는 계속 가능 */
  }
}
function remove(key: string): void {
  try { sessionStorage.removeItem(key); } catch { /* 무시 */ }
}

// 푸는 중인 상태: answers[i] = 답(건너뜀 null), checked = 지금 문제 채점 여부, orders = 객관식 보기 순서
export interface PlayState {
  version: string;
  index: number;
  answers: Answer[];
  checked: boolean;
  orders?: (number[] | null)[];
}

export interface SavedResult {
  version: string;
  answers: Answer[];
  finishedAt: string;
}

// sessionStorage 는 누구나 고칠 수 있으므로 모양을 확인한 뒤에만 씁니다.
function validPlay(s: unknown): s is PlayState {
  const p = s as Partial<PlayState> | null;
  return !!p && typeof p.version === 'string' && Number.isInteger(p.index) && (p.index as number) >= 0 && Array.isArray(p.answers) && typeof p.checked === 'boolean';
}
function validResult(r: unknown): r is SavedResult {
  const x = r as Partial<SavedResult> | null;
  return !!x && typeof x.version === 'string' && Array.isArray(x.answers);
}

export const savePlayState = (id: string, s: PlayState): void => write(PLAY + id, s);
export const loadPlayState = (id: string): PlayState | null => {
  const s = read(PLAY + id);
  return validPlay(s) ? s : null;
};
export const clearPlayState = (id: string): void => remove(PLAY + id);

export const saveResult = (id: string, r: SavedResult): void => write(RESULT + id, r);
export const loadResult = (id: string): SavedResult | null => {
  const r = read(RESULT + id);
  return validResult(r) ? r : null;
};
export const clearResult = (id: string): void => remove(RESULT + id);
