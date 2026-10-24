import { describe, it, expect } from 'vitest';
import { SAMPLE_QUIZZES } from '../../src/data/samples/index.js';
import { validateQuiz } from '../../src/utils/validation.js';
import { isCorrect, normalizeAnswer } from '../../src/utils/grading.js';
import { CATEGORY_KEYS, QUIZ_ID_PATTERN } from '../../src/utils/constants.js';
import { toEditableFields } from '../../src/services/quizModel.js';

describe('샘플 퀴즈 데이터 검사', () => {
  it('키와 데모 ID 가 겹치지 않는다', () => {
    expect(new Set(SAMPLE_QUIZZES.map((s) => s.key)).size).toBe(SAMPLE_QUIZZES.length);
    expect(new Set(SAMPLE_QUIZZES.map((s) => s.demoId)).size).toBe(SAMPLE_QUIZZES.length);
    SAMPLE_QUIZZES.forEach((s) => expect(QUIZ_ID_PATTERN.test(s.demoId)).toBe(true));
  });

  for (const s of SAMPLE_QUIZZES) {
    describe(s.title, () => {
      it('정확히 50문제 (1세트)', () => expect(s.questions).toHaveLength(50));
      it('카테고리가 올바르다', () => expect(CATEGORY_KEYS).toContain(s.category));
      it('입력 검증을 통과한다', () => {
        const { valid, errors } = validateQuiz(s);
        expect(errors).toEqual({});
        expect(valid).toBe(true);
      });
      it('모든 문제의 정답이 채점기에서 정답으로 처리된다', () => {
        s.questions.forEach((q) => {
          expect(isCorrect(q, q.answer)).toBe(true);
          (q.altAnswers || []).forEach((a) => expect(isCorrect(q, a)).toBe(true));
        });
      });
      it('객관식 보기는 4개 이상, 정답은 보기에 정확히 1번', () => {
        s.questions.filter((q) => q.type === 'choice').forEach((q) => {
          expect(q.options.length).toBeGreaterThanOrEqual(4);
          expect(q.options.filter((o) => o === q.answer)).toHaveLength(1);
        });
      });
      it('같은 세트의 다른 답·보기를 입력해도 오답으로 채점된다 (오답이 정답 처리되지 않음)', () => {
        const pool = new Set(s.questions.flatMap((q) => [q.answer, ...(q.altAnswers || []), ...(q.options || [])]));
        s.questions.forEach((q) => {
          const own = new Set([q.answer, ...(q.altAnswers || [])].map(normalizeAnswer));
          for (const cand of pool) {
            if (own.has(normalizeAnswer(cand))) continue;
            expect(isCorrect(q, cand), `${q.question} ← "${cand}"`).toBe(false);
          }
        });
      });
      it('같은 문제가 중복되지 않는다', () => {
        const texts = s.questions.map((q) => q.question);
        expect(new Set(texts).size).toBe(texts.length);
      });
      it('Firestore 문서 크기 한도(1MB)보다 충분히 작다', () => {
        expect(JSON.stringify(toEditableFields(s)).length).toBeLessThan(200 * 1024);
      });
    });
  }
});
