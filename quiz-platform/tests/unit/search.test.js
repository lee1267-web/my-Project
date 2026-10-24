import { describe, it, expect } from 'vitest';
import { buildSearchTokens, parseSearchTerm, matchesSearch, TOKENS_MAX } from '../../src/utils/search.js';

describe('검색 토큰', () => {
  it('단어별 접두사를 만든다', () => {
    const t = buildSearchTokens('한국사 기초!');
    expect(t).toEqual(expect.arrayContaining(['한', '한국', '한국사', '기', '기초']));
    expect(t).not.toContain('국사');
  });
  it('영문은 소문자로', () => {
    expect(buildSearchTokens('K-POP Idol')).toEqual(expect.arrayContaining(['k', 'pop', 'idol', 'id']));
  });
  it('토큰 수 상한', () => {
    expect(buildSearchTokens('가나다라마바사아자차카타파하'.repeat(20).split('').join(' ') + ' ' + 'abcdefghijklmno '.repeat(30)).length).toBeLessThanOrEqual(TOKENS_MAX);
  });
  it('검색어 파싱과 매칭', () => {
    const p = parseSearchTerm('  한국 기초 ');
    expect(p).toEqual({ primary: '한국', rest: ['기초'] });
    expect(matchesSearch({ title: '한국사 기초' }, p)).toBe(true);
    expect(matchesSearch({ title: '한국사 심화' }, p)).toBe(false);
    expect(parseSearchTerm('   ')).toBeNull();
  });
});

describe('분류·태그 검색', () => {
  const quiz = (category, subcategory = '', tags = [], title = '퀴즈') => ({ searchTokens: buildSearchTokens({ title, category, subcategory, tags }) });
  it('"노래"·"가요"·"음악"으로 음악 퀴즈를 찾는다', () => {
    for (const w of ['노래', '가요', '음악', 'music']) expect(matchesSearch(quiz('music'), parseSearchTerm(w)), w).toBe(true);
  });
  it('"발라드"로 발라드 세부 분류를 찾고, 다른 장르는 안 찾는다', () => {
    expect(matchesSearch(quiz('music', 'ballad'), parseSearchTerm('발라드'))).toBe(true);
    expect(matchesSearch(quiz('music', 'ballad'), parseSearchTerm('발라'))).toBe(true);
    expect(matchesSearch(quiz('music', 'dance'), parseSearchTerm('발라드'))).toBe(false);
  });
  it('"게임"으로 게임 퀴즈를 찾고, 음악 퀴즈는 안 찾는다', () => {
    expect(matchesSearch(quiz('game'), parseSearchTerm('게임'))).toBe(true);
    expect(matchesSearch(quiz('music'), parseSearchTerm('게임'))).toBe(false);
  });
  it('태그로 찾는다', () => {
    expect(matchesSearch(quiz('etc', '', ['2000년대', 'OST']), parseSearchTerm('ost'))).toBe(true);
  });
  it('여러 단어는 모두 포함해야 한다 (노래 발라드 → 발라드만)', () => {
    expect(matchesSearch(quiz('music', 'ballad'), parseSearchTerm('노래 발라드'))).toBe(true);
    expect(matchesSearch(quiz('music', 'trot'), parseSearchTerm('노래 발라드'))).toBe(false);
  });
  it('세부 분류 정확 토큰 (#sub:ballad) 포함', () => {
    expect(quiz('music', 'ballad').searchTokens).toContain('#sub:ballad');
    expect(quiz('game', 'ballad').searchTokens).not.toContain('#sub:ballad'); // 카테고리에 없는 세부 분류는 무시
  });
});
