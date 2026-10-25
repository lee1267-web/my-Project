import { describe, it, expect } from 'vitest';
import { matchRoute } from '../../src/utils/router.ts';
import { QUIZ_ID_PATTERN } from '../../src/utils/constants.ts';
import { randomId } from '../../src/utils/ids.ts';

const routes = [
  { path: '/', name: 'home' },
  { path: '/create', name: 'create' },
  { path: '/edit/:id', name: 'edit' },
  { path: '/quiz/:id', name: 'play' },
  { path: '/quiz/:id/result', name: 'result' },
  { path: '/my', name: 'my' },
];

describe('공유 URL 라우팅', () => {
  it('/quiz/:id 에서 ID 를 꺼낸다 (새로고침해도 주소만으로 동작)', () => {
    const m = matchRoute(routes, '/quiz/AbCdEfGhIjKlMnOpQrSt')!;
    expect(m.route.name).toBe('play');
    expect(m.params.id).toBe('AbCdEfGhIjKlMnOpQrSt');
  });
  it('끝의 / 도 허용', () => {
    expect(matchRoute(routes, '/quiz/abc/')!.route.name).toBe('play');
    expect(matchRoute(routes, '/my/')!.route.name).toBe('my');
  });
  it('결과 페이지와 수정 페이지', () => {
    expect(matchRoute(routes, '/quiz/abc/result')!.route.name).toBe('result');
    expect(matchRoute(routes, '/edit/xyz')!.params.id).toBe('xyz');
  });
  it('없는 경로는 null (404 처리)', () => {
    expect(matchRoute(routes, '/nothing')).toBeNull();
    expect(matchRoute(routes, '/quiz')).toBeNull();
    expect(matchRoute(routes, '/quiz/a/b/c')).toBeNull();
  });
  it('잘못된 % 인코딩이 있어도 오류 없이 처리', () => {
    expect(matchRoute(routes, '/quiz/%E0%A4%A')!.params.id).toBe('%E0%A4%A');
  });
});

describe('퀴즈 ID', () => {
  it('생성한 ID 는 20자 영숫자이고 서로 다르다', () => {
    const ids = new Set(Array.from({ length: 2000 }, () => randomId()));
    expect(ids.size).toBe(2000);
    for (const id of ids) expect(QUIZ_ID_PATTERN.test(id)).toBe(true);
  });
  it('형식이 잘못된 ID 는 거부', () => {
    for (const bad of ['', 'abc', '../../etc/passwd', 'AbCdEfGhIjKlMnOpQrS!', 'AbCdEfGhIjKlMnOpQrStU']) {
      expect(QUIZ_ID_PATTERN.test(bad)).toBe(false);
    }
  });
});
