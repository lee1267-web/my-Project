// Firestore 는 "부분 문자열 검색"을 지원하지 않습니다.
// 그래서 퀴즈 제목을 단어로 나누고, 각 단어의 앞부분(접두사)을 searchTokens 배열에 저장한 뒤
// 검색할 때 array-contains 로 조회합니다.
//   예) "한국사 기초" → ["한","한국","한국사","기","기초"]
//   → "한국", "기초" 처럼 단어의 앞부분으로 검색 가능 / "국사"(단어 중간)로는 검색 불가

export const TOKEN_MAX_LENGTH = 15;
export const TOKENS_MAX = 200;

export function normalizeText(text) {
  return String(text ?? '')
    .normalize('NFKC')
    .toLowerCase()
    .trim();
}

export function splitWords(text) {
  return normalizeText(text)
    .split(/[\s\p{P}\p{S}]+/u)
    .filter(Boolean);
}

export function buildSearchTokens(title) {
  const tokens = new Set();
  for (const word of splitWords(title)) {
    const chars = Array.from(word).slice(0, TOKEN_MAX_LENGTH);
    for (let i = 1; i <= chars.length; i++) {
      tokens.add(chars.slice(0, i).join(''));
      if (tokens.size >= TOKENS_MAX) return [...tokens];
    }
  }
  return [...tokens];
}

// 검색어 → { primary: DB 에서 array-contains 로 찾을 토큰, rest: 나머지 단어(화면에서 추가 필터) }
export function parseSearchTerm(term) {
  const words = splitWords(term).map((w) => Array.from(w).slice(0, TOKEN_MAX_LENGTH).join(''));
  if (words.length === 0) return null;
  return { primary: words[0], rest: words.slice(1) };
}

// 퀴즈가 검색어의 모든 단어를 포함하는지 (토큰 기준)
export function matchesSearch(quiz, parsed) {
  if (!parsed) return true;
  const tokens = quiz.searchTokens || buildSearchTokens(quiz.title);
  return [parsed.primary, ...parsed.rest].every((w) => tokens.includes(w));
}
