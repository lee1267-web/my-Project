import { describe, it, expect } from 'vitest';
import { collectPages } from '../../src/utils/paging.ts';
import { storagePathFromUrl } from '../../src/services/storageService.ts';
import { categoryLabel } from '../../src/utils/constants.ts';

// 1~40 번 퀴즈를 12개씩 주는 가짜 DB
const fake = (n = 40, size = 12) => async (cursor: unknown) => {
  const start = typeof cursor === 'number' ? cursor : 0;
  const items = Array.from({ length: Math.min(size, n - start) }, (_, i) => start + i + 1);
  return { items, cursor: start + items.length, hasMore: start + items.length < n };
};

describe('검색 결과 페이지 모으기', () => {
  it('첫 페이지가 통째로 걸러져도 다음 페이지에서 결과를 찾는다 ("없어요" 오표시 방지)', async () => {
    const res = await collectPages(fake(), (x) => x > 30);
    expect(res.items).toEqual([31, 32, 33, 34, 35, 36, 37, 38, 39, 40]);
    expect(res.hasMore).toBe(false);
  });
  it('원하는 개수가 차면 멈추고 이어서 볼 수 있다', async () => {
    const res = await collectPages(fake(), () => true, { want: 12 });
    expect(res.items).toHaveLength(12);
    expect(res.hasMore).toBe(true);
    const next = await collectPages(fake(), () => true, { want: 12, cursor: res.cursor });
    expect(next.items[0]).toBe(13);
  });
  it('최대 페이지 수에서 멈춘다 (전체 데이터를 무제한으로 받지 않음)', async () => {
    let calls = 0;
    const counting = async (c: unknown) => { calls++; return fake(1000)(c); };
    const res = await collectPages(counting, () => false, { maxPages: 5 });
    expect(calls).toBe(5);
    expect(res.items).toHaveLength(0);
    expect(res.hasMore).toBe(true);
  });
});

describe('Storage 주소 → 경로', () => {
  it('다운로드 주소에서 파일 경로를 꺼낸다', () => {
    expect(storagePathFromUrl('https://firebasestorage.googleapis.com/v0/b/p.app/o/quiz-images%2Fu1%2FAbCdEfGhIjKlMnOpQrSt%2FAbCdEfGhIjKl.png?alt=media&token=t'))
      .toBe('quiz-images/u1/AbCdEfGhIjKlMnOpQrSt/AbCdEfGhIjKl.png');
    expect(storagePathFromUrl('')).toBe('');
    expect(storagePathFromUrl('https://evil.example/x.png')).toBe('');
  });
});

describe('분류 배지 이름', () => {
  it('카테고리와 세부 분류', () => {
    expect(categoryLabel('music', 'ballad')).toBe('🎵 음악 · 발라드');
    expect(categoryLabel('music', '')).toBe('🎵 음악');
    expect(categoryLabel('music', 'ballad', { withEmoji: false, sep: ' > ' })).toBe('음악 > 발라드');
  });
});
