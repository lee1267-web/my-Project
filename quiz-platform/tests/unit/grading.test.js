import { describe, it, expect } from 'vitest';
import { isCorrect, computeResult, normalizeAnswer, SKIPPED } from '../../src/utils/grading.js';

const text = { type: 'text', question: 'q', answer: '서울특별시', altAnswers: ['서울'] };
const choice = { type: 'choice', question: 'q', answer: 'B', options: ['A', 'B', 'C'] };

describe('주관식 채점', () => {
  it('띄어쓰기·대소문자·전각 차이를 무시한다', () => {
    expect(isCorrect(text, '서울 특별시')).toBe(true);
    expect(isCorrect(text, '  서울특별시 ')).toBe(true);
    expect(isCorrect({ ...text, answer: 'BTS' }, 'bts')).toBe(true);
    expect(isCorrect({ ...text, answer: 'ABC' }, 'ＡＢＣ')).toBe(true);
    expect(normalizeAnswer(' A b ')).toBe('ab');
  });
  it('추가 인정 답안도 정답', () => {
    expect(isCorrect(text, '서울')).toBe(true);
  });
  it('틀린 답·빈 답·건너뜀은 오답', () => {
    expect(isCorrect(text, '부산')).toBe(false);
    expect(isCorrect(text, '   ')).toBe(false);
    expect(isCorrect(text, SKIPPED)).toBe(false);
  });
});

describe('객관식 채점', () => {
  it('정답 보기만 정답', () => {
    expect(isCorrect(choice, 'B')).toBe(true);
    expect(isCorrect(choice, 'A')).toBe(false);
    expect(isCorrect(choice, 'b')).toBe(false); // 객관식은 보기 문장 그대로 비교
    expect(isCorrect(choice, SKIPPED)).toBe(false);
  });
});

describe('점수 계산', () => {
  it('정답 수·오답 수·건너뜀·정답률·점수', () => {
    const r = computeResult([text, choice, text], ['서울', 'A', SKIPPED]);
    expect(r).toMatchObject({ total: 3, correctCount: 1, wrongCount: 2, skippedCount: 1, score: 33, accuracy: 33.3 });
    expect(r.details.map((d) => d.correct)).toEqual([true, false, false]);
  });
  it('답 배열이 짧아도(새로고침 등) 빠진 문제는 건너뜀으로 계산', () => {
    const r = computeResult([text, choice], ['서울']);
    expect(r).toMatchObject({ correctCount: 1, wrongCount: 1, skippedCount: 1, score: 50 });
  });
  it('만점', () => {
    expect(computeResult([choice], ['B']).score).toBe(100);
  });
});
