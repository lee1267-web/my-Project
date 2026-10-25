// 샘플 퀴즈 작성 도우미
// t(문제, 정답, [다른 인정 답안])  → 주관식
// c(문제, 정답, [보기...])          → 객관식 (정답은 반드시 보기 중 하나)
import type { QuestionType } from '../../types.ts';

export interface SampleQuestion {
  type: QuestionType;
  question: string;
  answer: string;
  altAnswers: string[];
  options: string[];
}

// 샘플 세트 하나 (파일마다 export default 로 내보냄)
export interface SampleSet {
  key: string;
  title: string;
  description: string;
  category: string;
  subcategory: string;
  tags: string[];
  imageUrl: string;
  questions: SampleQuestion[];
}

export const t = (question: string, answer: string, altAnswers: string[] = []): SampleQuestion => ({ type: 'text', question, answer, altAnswers, options: [] });
export const c = (question: string, answer: string, options: string[]): SampleQuestion => ({ type: 'choice', question, answer, options, altAnswers: [] });
