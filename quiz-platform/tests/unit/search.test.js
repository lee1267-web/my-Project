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
