import { describe, it, expect } from 'vitest';
import { validateQuiz, validateImageFile, parseAltAnswers } from '../../src/utils/validation.js';

const textQ = (over = {}) => ({ type: 'text', question: '조선을 세운 왕은?', answer: '이성계', altAnswers: [], options: [], ...over });
const choiceQ = (over = {}) => ({ type: 'choice', question: '1+1은?', answer: '2', options: ['1', '2', '3'], altAnswers: [], ...over });
const quiz = (over = {}) => ({ title: '테스트 퀴즈', description: '', category: 'general', isPublic: true, questions: [textQ()], ...over });

describe('퀴즈 입력 검증', () => {
  it('올바른 퀴즈는 통과한다', () => {
    expect(validateQuiz(quiz({ questions: [textQ(), choiceQ()] })).valid).toBe(true);
  });
  it('제목이 비었거나 공백뿐이면 오류', () => {
    expect(validateQuiz(quiz({ title: '   ' })).errors.title).toMatch(/제목/);
  });
  it('제목 100자 초과는 오류', () => {
    expect(validateQuiz(quiz({ title: '가'.repeat(101) })).errors.title).toMatch(/100자/);
    expect(validateQuiz(quiz({ title: '가'.repeat(100) })).valid).toBe(true);
  });
  it('카테고리 미선택/잘못된 값은 오류', () => {
    expect(validateQuiz(quiz({ category: '' })).errors.category).toBeTruthy();
    expect(validateQuiz(quiz({ category: 'hack' })).errors.category).toBeTruthy();
  });
  it('문제가 하나도 없으면 오류', () => {
    expect(validateQuiz(quiz({ questions: [] })).errors.questions).toMatch(/최소 1개/);
  });
  it('문제 내용과 정답은 필수', () => {
    const { errors } = validateQuiz(quiz({ questions: [textQ({ question: '', answer: ' ' })] }));
    expect(errors['questions.0.question']).toBeTruthy();
    expect(errors['questions.0.answer']).toBeTruthy();
  });
  it('객관식은 내용 있는 보기 2개 이상 필요', () => {
    const { errors } = validateQuiz(quiz({ questions: [choiceQ({ options: ['2', '', ' '] })] }));
    expect(errors['questions.0.options']).toMatch(/2개 이상/);
  });
  it('객관식 정답은 보기 중 하나여야 함', () => {
    const { errors } = validateQuiz(quiz({ questions: [choiceQ({ answer: '5' })] }));
    expect(errors['questions.0.answer']).toMatch(/보기 중 하나/);
  });
  it('객관식 정답 미선택은 오류', () => {
    expect(validateQuiz(quiz({ questions: [choiceQ({ answer: '' })] })).errors['questions.0.answer']).toMatch(/선택/);
  });
  it('중복 보기는 오류', () => {
    expect(validateQuiz(quiz({ questions: [choiceQ({ options: ['2', '2', '3'] })] })).errors['questions.0.options']).toMatch(/같은/);
  });
  it('오류 위치(필드 경로)를 문제 번호별로 알려준다', () => {
    const { errors } = validateQuiz(quiz({ questions: [textQ(), textQ({ answer: '' })] }));
    expect(Object.keys(errors)).toEqual(['questions.1.answer']);
  });
});

describe('이미지 파일 검증', () => {
  it('허용 형식과 크기', () => {
    expect(validateImageFile({ type: 'image/png', size: 1000 })).toBeNull();
    expect(validateImageFile({ type: 'image/svg+xml', size: 1000 })).toMatch(/JPG/);
    expect(validateImageFile({ type: 'application/pdf', size: 1000 })).toMatch(/JPG/);
    expect(validateImageFile({ type: 'image/jpeg', size: 3 * 1024 * 1024 })).toMatch(/2MB/);
    expect(validateImageFile({ type: 'image/jpeg', size: 0 })).toMatch(/빈 파일/);
  });
});

describe('추가 인정 답안 파싱', () => {
  it('쉼표로 구분하고 빈 값을 버린다', () => {
    expect(parseAltAnswers(' 태조 , ,태조 이성계,')).toEqual(['태조', '태조 이성계']);
  });
});
