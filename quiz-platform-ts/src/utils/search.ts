// Firestore 는 "부분 문자열 검색"을 지원하지 않습니다.
// 그래서 퀴즈 제목·분류·태그를 단어로 나누고, 각 단어의 앞부분(접두사)을 searchTokens 배열에 저장한 뒤
// 검색할 때 array-contains 로 조회합니다.
//   예) "한국사 기초" → ["한","한국","한국사","기","기초"]
//   → "한국", "기초" 처럼 단어의 앞부분으로 검색 가능 / "국사"(단어 중간)로는 검색 불가

import { CATEGORIES, getCategory, getSubcategory } from './constants.ts';

export const TOKEN_MAX_LENGTH = 15;
export const TOKENS_MAX = 300;

export function normalizeText(text: unknown): string {
  return String(text ?? '')
    .normalize('NFKC')
    .toLowerCase()
    .trim();
}

export function splitWords(text: unknown): string[] {
  return normalizeText(text)
    .split(/[\s\p{P}\p{S}]+/u)
    .filter(Boolean);
}

// 세부 분류 버튼으로 거를 때 쓰는 "정확히 일치" 토큰 (검색창 입력과 겹치지 않도록 # 로 시작)
export const subToken = (subKey: string): string => `#sub:${subKey}`;

// 퀴즈의 검색 토큰을 만듭니다.
//   제목 단어 + 카테고리 이름·별칭 + 세부 분류 이름·별칭 + 태그 의 "앞부분(접두사)"
//   예) 음악 > 발라드 퀴즈는 "노래", "가요", "음악", "발라드", "발라" 로 검색됩니다.
// 예전 호출 방식(제목 문자열만 넘김)도 지원합니다.
export interface SearchSource {
  title?: string;
  category?: string;
  subcategory?: string;
  tags?: string[];
}

export function buildSearchTokens(input: SearchSource | string | null | undefined): string[] {
  const { title = '', category = '', subcategory = '', tags = [] }: SearchSource = typeof input === 'string' ? { title: input } : input || {};
  const tokens = new Set<string>();
  const addWords = (text: string) => {
    for (const word of splitWords(text)) {
      const chars = Array.from(word).slice(0, TOKEN_MAX_LENGTH);
      for (let i = 1; i <= chars.length; i++) tokens.add(chars.slice(0, i).join(''));
    }
  };
  // 분류 정보를 먼저 넣어 토큰 수 상한에 걸려도 분류 검색은 항상 되도록 합니다.
  const sub = getSubcategory(category, subcategory);
  if (sub) {
    tokens.add(subToken(sub.key));
    addWords(sub.label);
    sub.aliases.forEach(addWords);
  }
  if (category) {
    const cat = getCategory(category);
    addWords(cat.label);
    cat.aliases.forEach(addWords);
  }
  (tags || []).forEach(addWords);
  addWords(title);
  return [...tokens].slice(0, TOKENS_MAX);
}

// 검색어 → { primary: DB 에서 array-contains 로 찾을 토큰, rest: 나머지 단어(화면에서 추가 필터) }
export interface ParsedSearch {
  primary: string;
  rest: string[];
}

export function parseSearchTerm(term: unknown): ParsedSearch | null {
  const words = splitWords(term).map((w) => Array.from(w).slice(0, TOKEN_MAX_LENGTH).join(''));
  if (words.length === 0) return null;
  return { primary: words[0]!, rest: words.slice(1) };
}

// 퀴즈가 검색어의 모든 단어를 포함하는지 (토큰 기준)
export function matchesSearch(quiz: SearchSource & { searchTokens?: string[] }, parsed: ParsedSearch | null): boolean {
  if (!parsed) return true;
  const tokens = quiz.searchTokens?.length ? quiz.searchTokens : buildSearchTokens(quiz);
  return [parsed.primary, ...parsed.rest].every((w) => tokens.includes(w));
}

// 검색어가 분류 이름·별칭과 정확히 같으면 그 분류를 알려 줍니다. (예: "게임" → 게임, "발라드" → 음악 > 발라드)
// 홈에서 "○○ 카테고리만 보기" 버튼을 보여 줄 때 사용합니다.
export interface CategoryHint {
  category: string;
  subcategory: string;
  label: string;
}

export function findCategoryForTerm(term: unknown): CategoryHint | null {
  const word = splitWords(term).join('');
  if (!word) return null;
  const same = (text: string) => splitWords(text).join('') === word;
  for (const cat of CATEGORIES) {
    for (const sub of cat.subs) {
      if (same(sub.label) || sub.aliases.some(same)) return { category: cat.key, subcategory: sub.key, label: `${cat.emoji} ${cat.label} > ${sub.label}` };
    }
  }
  for (const cat of CATEGORIES) {
    if (same(cat.label) || cat.aliases.some(same)) return { category: cat.key, subcategory: '', label: `${cat.emoji} ${cat.label}` };
  }
  return null;
}
