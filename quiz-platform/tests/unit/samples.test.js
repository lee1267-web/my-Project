import { describe, it, expect } from 'vitest';
import { SAMPLE_QUIZZES } from '../../src/data/samples/index.js';
import { validateQuiz } from '../../src/utils/validation.js';
import { isCorrect, normalizeAnswer } from '../../src/utils/grading.js';
import { CATEGORY_KEYS, QUIZ_ID_PATTERN } from '../../src/utils/constants.js';
import { toEditableFields } from '../../src/services/quizModel.js';
import { isOxQuestion } from '../../src/utils/shuffle.js';

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
      it('객관식 보기는 4개 이상(OX 문제는 O·X 두 개), 정답은 보기에 정확히 1번', () => {
        s.questions.filter((q) => q.type === 'choice').forEach((q) => {
          if (!isOxQuestion(q)) expect(q.options.length).toBeGreaterThanOrEqual(4);
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

  it('OX 문제는 O·X 가 고르게 섞여 있고 같은 답이 네 번 연속 나오지 않는다', () => {
    for (const s of SAMPLE_QUIZZES) {
      const ox = s.questions.filter((q) => q.type === 'choice' && isOxQuestion(q)).map((q) => q.answer);
      if (ox.length < 10) continue;
      const o = ox.filter((a) => a === 'O').length;
      expect(o / ox.length, `${s.key} O 비율`).toBeGreaterThanOrEqual(0.4);
      expect(o / ox.length, `${s.key} O 비율`).toBeLessThanOrEqual(0.6);
      for (let i = 3; i < ox.length; i += 1) {
        expect(new Set(ox.slice(i - 3, i + 1)).size, `${s.key} ${i}번째 OX`).toBeGreaterThan(1);
      }
    }
  });

  it('세트마다 객관식 정답 자리가 한쪽으로 쏠리지 않고 세 문제 연속 같지 않다', () => {
    for (const s of SAMPLE_QUIZZES) {
      const pos = s.questions.filter((q) => q.type === 'choice' && !isOxQuestion(q)).map((q) => q.options.indexOf(q.answer));
      if (pos.length < 8) continue;
      const most = Math.max(...[0, 1, 2, 3, 4, 5].map((p) => pos.filter((x) => x === p).length));
      expect(most / pos.length, `${s.key} 정답 자리 쏠림`).toBeLessThanOrEqual(0.4);
      for (let i = 2; i < pos.length; i += 1) {
        expect(pos[i] === pos[i - 1] && pos[i] === pos[i - 2], `${s.key} ${i}번째 객관식`).toBe(false);
      }
    }
  });

  it('주관식 정답이 앞 문제의 문장에 그대로 나와 힌트가 되지 않는다', () => {
    // 단어가 우연히 겹칠 뿐 정답을 알려 주지 않는 경우만 예외로 둠
    const allowed = new Set(['movies:부산', 'kfood:돼지', 'body:피부']);
    const flat = (x) => x.replace(/\s/g, '').toLowerCase();
    const leaks = [];
    for (const s of SAMPLE_QUIZZES) {
      s.questions.forEach((q, i) => {
        if (q.type !== 'text' || q.answer.length < 2 || /^[\d.,/]+$/.test(q.answer)) return;
        if (allowed.has(`${s.key}:${q.answer}`)) return;
        const before = s.questions.slice(0, i).find((p) => flat(p.question).includes(flat(q.answer)));
        if (before) leaks.push(`${s.key} "${q.answer}" ← ${before.question}`);
      });
    }
    expect(leaks).toEqual([]);
  });

  it('서로 다른 세트에 같은 문제가 들어 있지 않다', () => {
    // 띄어쓰기·따옴표·괄호·물음표만 다른 경우도 같은 문제로 봄
    const key = (text) => text.replace(/[\s「」『』"'?.,()·]/g, '');
    const seen = new Map();
    const dups = [];
    for (const s of SAMPLE_QUIZZES) {
      for (const q of s.questions) {
        const k = key(q.question);
        if (seen.has(k) && seen.get(k) !== s.key) dups.push(`${seen.get(k)} / ${s.key}: ${q.question}`);
        else seen.set(k, s.key);
      }
    }
    expect(dups).toEqual([]);
  });
});
