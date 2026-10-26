import { describe, it, expect } from 'vitest';
import { seededRandom, hashSeed, makeOptionOrders, validOrders } from '../../src/utils/shuffle.js';

const choice = (answer, options) => ({ type: 'choice', question: '?', answer, options });
const text = () => ({ type: 'text', question: '?', answer: 'a', options: [] });
// 만든 사람이 정답을 전부 첫 번째 보기에 넣은 퀴즈
const firstAlways = Array.from({ length: 40 }, (_, i) => choice(`정답${i}`, [`정답${i}`, 'b', 'c', 'd']));

const answerPositions = (qs, orders) => qs.map((q, i) => (orders[i] ? orders[i].indexOf(q.options.indexOf(q.answer)) : null));

describe('보기 순서 섞기', () => {
  it('같은 시드면 같은 순서, 다른 시드면 다른 순서', () => {
    const a = makeOptionOrders(firstAlways, seededRandom(1));
    expect(makeOptionOrders(firstAlways, seededRandom(1))).toEqual(a);
    expect(makeOptionOrders(firstAlways, seededRandom(2))).not.toEqual(a);
    expect(hashSeed('ballad')).toBe(hashSeed('ballad'));
  });

  it('객관식은 보기 번호의 순열, 주관식은 null', () => {
    const qs = [text(), choice('x', ['x', 'y']), choice('3', ['1', '2', '3', '4', '5', '6'])];
    const orders = makeOptionOrders(qs, seededRandom(7));
    expect(orders[0]).toBeNull();
    expect([...orders[1]].sort()).toEqual([0, 1]);
    expect([...orders[2]].sort()).toEqual([0, 1, 2, 3, 4, 5]);
    expect(validOrders(orders, qs)).toBe(true);
  });

  it('정답이 늘 1번인 퀴즈도 정답 자리가 고르게 퍼지고 세 번 연속 같지 않다', () => {
    for (let seed = 0; seed < 200; seed += 1) {
      const pos = answerPositions(firstAlways, makeOptionOrders(firstAlways, seededRandom(seed)));
      const counts = [0, 1, 2, 3].map((p) => pos.filter((x) => x === p).length);
      expect(Math.max(...counts) - Math.min(...counts)).toBeLessThanOrEqual(4);
      for (let i = 2; i < pos.length; i += 1) expect(pos[i] === pos[i - 1] && pos[i] === pos[i - 2]).toBe(false);
    }
  });

  it('보기가 1개뿐인 객관식(규칙을 우회해 저장된 데이터)도 순서를 만들어 화면이 깨지지 않는다', () => {
    const qs = [choice('a', ['a']), choice('a', ['a', 'b']), choice('a', ['a']), choice('a', ['a'])];
    const orders = makeOptionOrders(qs, seededRandom(3));
    expect(orders[0]).toEqual([0]);
    expect(orders[2]).toEqual([0]);
    expect(orders[3]).toEqual([0]);
    expect(validOrders(orders, qs)).toBe(true);
  });

  it('OX 문제는 섞지 않고 늘 O, X 순서', () => {
    const qs = Array.from({ length: 10 }, (_, i) => choice(i % 3 ? 'O' : 'X', ['O', 'X']));
    for (let seed = 0; seed < 20; seed += 1) {
      expect(makeOptionOrders(qs, seededRandom(seed)).every((o) => o[0] === 0 && o[1] === 1)).toBe(true);
    }
  });

  it('퀴즈와 맞지 않는 저장 순서는 거부', () => {
    const qs = [choice('x', ['x', 'y', 'z']), text()];
    expect(validOrders([[2, 0, 1], null], qs)).toBe(true);
    expect(validOrders([[0, 1], null], qs)).toBe(false); // 보기 수가 바뀜
    expect(validOrders([[0, 0, 1], null], qs)).toBe(false); // 순열이 아님
    expect(validOrders([[0, 1, 2]], qs)).toBe(false); // 문제 수가 바뀜
    expect(validOrders([[0, 1, 2], [0]], qs)).toBe(false); // 주관식에 순서
    expect(validOrders(undefined, qs)).toBe(false);
  });
});
